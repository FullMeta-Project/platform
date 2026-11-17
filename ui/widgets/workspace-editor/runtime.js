/** Workspace commands shared by React controls and WebMCP. No application model is synthesized. */
import {createWorkspaceLayoutController} from '../../runtime/workspace-layout.js';
import {canonicalWorkspacePath,createWorkspaceFilePicker} from '../../workspace/file-picker.js';
import {createLauncherController} from './launcher-controller.js';
import {createWorkspaceWebMcpTools} from './webmcp.js';
import {createStandardMenuController} from '../../workspace/edit-controller.js';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const parentOf=value=>value.includes('/')?value.slice(0,value.lastIndexOf('/')):'.';
const childOf=(folder,value)=>parentOf(value)===folder;
const supportedText=value=>/\.(json|tsv|txt|md)$/i.test(value);
const maximumPreviewCharacters=65536;

export function createWorkspaceEditorController(container,context,{update}){
  const workspaceUrl=new URL(context?.services?.workspaceUrl||new URL('../../../../',import.meta.url));
  const fetcher=context?.services?.fetcher||globalThis.fetch;
  const explorerRoot=canonicalWorkspacePath(context.document.explorer?.root??'.');
  const lifetime=new AbortController(),folders=new Map(),expanded=new Map([[explorerRoot,true]]),epochs=new Map();let openAbort=new AbortController();
  let selected=null,preview=null,disposed=false,revision=0,launcher=null,picker=null,standardMenus=null,previewEpoch=0,folderRevealEpoch=0;
  let discovery={root:null,queue:[],files:new Map(),directories:new Map(),scheduledDirectories:new Set(),loading:false,complete:false,error:'',batches:0},discoveryEpoch=0,discoveryAbort=null;
  const summaryCache=new Map(),summaryPending=new Set(),summaryInFlight=new Map(),summaryWaiters=new Map();let summaryQueue=[],summaryActive=0,summaryPaint=null;
  const summaryKey=file=>file.path+'\0'+file.bytes;
  const pendingSummaryKey=(epoch,file)=>epoch+'\0'+summaryKey(file);
  const title=context.document.title||'Workspace';
  const explorerIcons=structuredClone(context.options?.explorerIcons||{});
  const markdownPreview=context.options?.markdownPreview===true;
  const defaultLayout=context.schema?.['x-fullmeta-ui-modelEditor']?.layout?.defaultLayout||'stacked';
  const layout=createWorkspaceLayoutController({root:container,defaultLayout,bindMenu:false});
  const validSchemaReference=(path,reference)=>{
    if(typeof reference!=='string'||!reference||reference.trim()!==reference||!reference.endsWith('.json')||reference.startsWith('/')||/[\\:?#\u0000-\u001f]/.test(reference)||/%2f|%5c/i.test(reference))return false;
    try{const target=new URL(reference,new URL(path,workspaceUrl));if(target.origin!==workspaceUrl.origin||!target.pathname.startsWith(workspaceUrl.pathname)||target.search||target.hash)return false;canonicalWorkspacePath(decodeURIComponent(target.pathname.slice(workspaceUrl.pathname.length)),{root:false});return true;}catch{return false;}
  };
  const openAvailability=(file,summary=summaryCache.get(summaryKey(file)))=>{
    if(!file.path.toLowerCase().endsWith('.json'))return {openAvailable:false,openReason:'Choose a JSON document'};
    if(!summary)return {openAvailable:false,openReason:'Loading document details'};
    if(summary.unavailable)return {openAvailable:false,openReason:'Document details unavailable'};
    if(!summary.validJson)return {openAvailable:false,openReason:'Invalid JSON'};
    if(typeof summary.schemaReference!=='string'||!summary.schemaReference.trim())return {openAvailable:false,openReason:'No interpreting schema'};
    return validSchemaReference(file.path,summary.schemaReference)?{openAvailable:true,openReason:''}:{openAvailable:false,openReason:'Invalid interpreting schema reference'};
  };
  const fileView=file=>({...file,...(summaryCache.has(summaryKey(file))?{summary:{...summaryCache.get(summaryKey(file))}}:{}),...openAvailability(file),summaryLoading:summaryPending.has(pendingSummaryKey(discoveryEpoch,file))});
  const explorer=()=>({root:explorerRoot,selected:selected?selected.kind==='file'?fileView(selected):{...selected}:null,expanded:Object.fromEntries(expanded),folders:Object.fromEntries([...folders].map(([key,value])=>[key,structuredClone(value)])),preview:preview?{...preview}:null});
  const documents=()=>{
    if(discovery.root===null)return {root:null,groups:[],childFolders:[],totalFiles:0,pendingPages:0,loading:false,complete:false,error:'',batches:0};
    const modelFiles=[...discovery.files.values()].map(fileView).filter(file=>file.openAvailable);
    const grouped=new Map();
    for(const file of modelFiles){const folder=parentOf(file.path),relativePath=folder===discovery.root?'.':folder.slice(discovery.root==='.'?0:discovery.root.length+1);if(!grouped.has(folder))grouped.set(folder,{folder,relativePath,files:[]});grouped.get(folder).files.push(file);}
    const summaryCount=[...discovery.files.values()].filter(file=>!summaryCache.has(summaryKey(file))).length;
    return {root:discovery.root,groups:[...grouped.values()],childFolders:[...discovery.directories.values()].filter(folder=>grouped.has(folder.path)),totalFiles:modelFiles.length,pendingPages:discovery.queue.length,loading:discovery.loading,complete:discovery.complete,error:discovery.error,batches:discovery.batches,summaries:{loading:summaryCount>0,pending:summaryCount}};
  };
  const selectedProject=()=>{
    if(selected?.kind!=='directory'||!/^projects\/[^/]+$/.test(selected.path))return null;
    return launcher?.projectForFolder(selected.path)||null;
  };
  const view=()=>{const project=selectedProject();return {title,documentPath:context.initial?.path||'index.json',workspaceUrl:workspaceUrl.href,markdownPreview,explorerIcons,explorer:explorer(),documents:documents(),selectedProject:project?{id:project.id,title:project.title}:null,layout:layout.inspect().layout};};
  const paint=()=>{if(!disposed){revision++;update(view());layout.resize();}};
  const inspectExtra=()=>{const project=selectedProject();return {documentPath:context.initial?.path||'index.json',revision,capabilities:{markdownPreview},explorer:explorer(),documents:documents(),selectedProject:project?{id:project.id,title:project.title,canDelete:true}:null,picker:picker?.inspect()||{open:false},standardMenus:standardMenus?.inspect()||null,layout:layout.inspect().layout,layoutState:layout.inspect(),readOnly:true};};
  const inspect=()=>({...launcher?.inspect(),...inspectExtra()});
  const requireLive=()=>{if(disposed)throw new Error('The workspace editor has been disposed.');};
  const withinExplorer=value=>explorerRoot==='.'||value===explorerRoot||value.startsWith(explorerRoot+'/');
  const entryFor=value=>{
    if(!withinExplorer(value))return null;
    if(value===explorerRoot)return {kind:'directory',path:explorerRoot,name:explorerRoot==='.'?'FullMeta':explorerRoot.split('/').at(-1)};
    const folder=folders.get(parentOf(value));
    const directory=folder?.directories.find(entry=>entry.path===value);if(directory)return {...directory,kind:'directory'};
    const file=folder?.files.find(entry=>entry.path===value);return file?{...file,kind:'file'}:null;
  };
  const visible=value=>value===explorerRoot||Boolean(withinExplorer(value)&&expanded.get(parentOf(value))&&entryFor(value)&&visible(parentOf(value)));
  const requireEntry=value=>{
    const path=canonicalWorkspacePath(value),entry=entryFor(path);
    if(!entry||!visible(path))throw new Error('Choose an entry from the visible workspace tree.');
    return entry;
  };
  const json=async(endpoint,options={})=>{
    const response=await fetcher(endpoint,{...options,cache:'no-store',signal:options.signal||lifetime.signal});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||`Workspace request failed (${response.status}).`);
    return result;
  };
  const scheduleSummaryPaint=()=>{if(!disposed&&summaryPaint===null)summaryPaint=setTimeout(()=>{summaryPaint=null;paint();},16);};
  const cacheSummary=(key,value)=>{summaryCache.set(key,value);while(summaryCache.size>1000)summaryCache.delete(summaryCache.keys().next().value);};
  const finishSummaryWaiters=(key,value)=>{for(const resolve of summaryWaiters.get(key)||[])resolve(value);summaryWaiters.delete(key);};
  const pumpSummaries=()=>{
    while(!disposed&&summaryActive<4&&summaryQueue.length){
      const task=summaryQueue.shift(),key=pendingSummaryKey(task.epoch,task.file);
      if(task.epoch!==discoveryEpoch||task.signal.aborted){summaryPending.delete(key);finishSummaryWaiters(key,{unavailable:true,error:'The workspace selection changed.'});continue;}
      summaryActive++;summaryInFlight.set(key,task);
      void (async()=>{
        try{
          const info=await json(`/api/workspace/document-info?path=${encodeURIComponent(task.file.path)}`,{signal:task.signal});
          if(disposed||task.epoch!==discoveryEpoch||task.signal.aborted)return;
          if(info.format!=='fullmeta-workspace-document-info/1'||info.path!==task.file.path||typeof info.validJson!=='boolean'||!Number.isSafeInteger(info.bytes)||info.bytes<0||typeof info.contentHash!=='string'||['title','application','modelFormat','schemaReference'].some(name=>info[name]!==null&&typeof info[name]!=='string'))throw new Error('Document details are unavailable.');
          const text=name=>typeof info[name]==='string'&&info[name].trim()?info[name].trim().slice(0,512):null;
          cacheSummary(summaryKey(task.file),{title:text('title'),application:text('application'),modelFormat:text('modelFormat'),schemaReference:info.schemaReference,bytes:info.bytes,contentHash:info.contentHash,validJson:info.validJson,...(typeof info.error==='string'?{error:info.error.slice(0,512)}:{})});
        }catch(error){if(!disposed&&task.epoch===discoveryEpoch&&!task.signal.aborted)cacheSummary(summaryKey(task.file),{unavailable:true,error:error.message});}
        finally{summaryActive--;summaryInFlight.delete(key);summaryPending.delete(key);finishSummaryWaiters(key,!disposed&&task.epoch===discoveryEpoch&&!task.signal.aborted?summaryCache.get(summaryKey(task.file)):{unavailable:true,error:'The workspace selection changed.'});scheduleSummaryPaint();pumpSummaries();}
      })();
    }
  };
  const ensureSummary=file=>{
    const cached=summaryCache.get(summaryKey(file));if(cached)return Promise.resolve(cached);
    const key=pendingSummaryKey(discoveryEpoch,file),result=new Promise(resolve=>{if(!summaryWaiters.has(key))summaryWaiters.set(key,[]);summaryWaiters.get(key).push(resolve);});
    if(!summaryPending.has(key)){summaryPending.add(key);summaryQueue.unshift({epoch:discoveryEpoch,file:{...file},signal:AbortSignal.any([lifetime.signal,openAbort.signal])});}
    pumpSummaries();scheduleSummaryPaint();return result;
  };
  const queueSummaries=()=>{
    if(discovery.root===null||!discoveryAbort)return;
    let queued=0;const signal=AbortSignal.any([lifetime.signal,discoveryAbort.signal]);
    for(const file of discovery.files.values()){
      const key=pendingSummaryKey(discoveryEpoch,file);
      if(summaryCache.has(summaryKey(file))||summaryPending.has(key))continue;
      summaryPending.add(key);summaryQueue.push({epoch:discoveryEpoch,file:{...file},signal});if(++queued>=100)break;
    }
    pumpSummaries();scheduleSummaryPaint();
  };
  const cancelQueuedSummaries=()=>{for(const task of summaryQueue){const key=pendingSummaryKey(task.epoch,task.file);summaryPending.delete(key);finishSummaryWaiters(key,{unavailable:true,error:'The workspace selection changed.'});}summaryQueue=[];};
  const invalidateSummaryTree=path=>{for(const key of summaryCache.keys()){const file=key.split('\0')[0];if(path==='.'||file===path||file.startsWith(path+'/'))summaryCache.delete(key);}};
  const load=async(path,more=false)=>{
    requireLive();const entry=requireEntry(path);
    if(entry.kind!=='directory')throw new Error('Choose a workspace folder.');
    const previous=folders.get(path),offset=more?previous?.nextOffset:0;
    if(more&&(offset===null||offset===undefined))throw new Error('This folder has no more entries.');
    if(previous?.loading)throw new Error('Wait for this workspace folder to load.');
    const epoch=(epochs.get(path)||0)+1;epochs.set(path,epoch);
    folders.set(path,{path,directories:more?previous.directories:[],files:more?previous.files:[],nextOffset:null,total:previous?.total||0,loading:true,error:''});paint();
    try{
      const result=await json(`/api/workspace/files?folder=${encodeURIComponent(path)}&extensions=*&offset=${offset}&limit=500`);
      if(disposed||epochs.get(path)!==epoch)return;
      if(result.format!=='fullmeta-workspace-files/1'||result.folder!==path||!Array.isArray(result.directories)||!Array.isArray(result.files)||!Number.isSafeInteger(result.total)||result.total<0||!(result.nextOffset===null||Number.isSafeInteger(result.nextOffset)&&result.nextOffset>offset))throw new Error('The workspace directory response is invalid.');
      for(const entry of [...result.directories,...result.files])if(typeof entry.name!=='string'||canonicalWorkspacePath(entry.path,{root:false})!==entry.path||!childOf(path,entry.path)||entry.name!==entry.path.split('/').at(-1))throw new Error('The workspace directory returned an invalid path.');
      if(result.files.some(entry=>!Number.isSafeInteger(entry.bytes)||entry.bytes<0))throw new Error('The workspace directory returned an invalid file size.');
      folders.set(path,{path,directories:more?[...previous.directories,...result.directories]:result.directories,files:more?[...previous.files,...result.files]:result.files,nextOffset:result.nextOffset,total:result.total,loading:false,error:''});
      if(selected&&!visible(selected.path)){selected=null;preview=null;previewEpoch++;}
      paint();return folders.get(path);
    }catch(error){if(!disposed&&epochs.get(path)===epoch){folders.set(path,{...folders.get(path),loading:false,error:error.message});paint();}throw error;}
  };
  const discoverMore=async()=>{
    requireLive();if(selected?.kind!=='directory'||selected.path!==discovery.root)throw new Error('Select a folder before discovering JSON documents.');
    if(discovery.loading)throw new Error('Wait for the current document discovery batch.');
    if(discovery.complete)return documents();
    const epoch=discoveryEpoch,signal=AbortSignal.any([lifetime.signal,discoveryAbort.signal]);
    discovery.loading=true;discovery.error='';paint();let requests=0,found=0,pendingJob=null;
    try{
      while(discovery.queue.length&&requests<32&&found<100){
        const job=discovery.queue.shift(),limit=Math.max(1,100-found);pendingJob=job;
        const result=await json(`/api/workspace/files?folder=${encodeURIComponent(job.path)}&extensions=.json&offset=${job.offset}&limit=${limit}`,{signal});requests++;
        if(disposed||epoch!==discoveryEpoch)return documents();
        if(result.format!=='fullmeta-workspace-files/1'||result.folder!==job.path||!Array.isArray(result.directories)||!Array.isArray(result.files)||!(result.nextOffset===null||Number.isSafeInteger(result.nextOffset)&&result.nextOffset>job.offset))throw new Error('The JSON document directory response is invalid.');
        for(const entry of [...result.directories,...result.files])if(typeof entry.name!=='string'||canonicalWorkspacePath(entry.path,{root:false})!==entry.path||!childOf(job.path,entry.path)||entry.name!==entry.path.split('/').at(-1))throw new Error('Document discovery returned an invalid path.');
        for(const entry of result.files){if(!/\.json$/i.test(entry.path)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0)throw new Error('Document discovery returned an invalid JSON file.');if(!discovery.files.has(entry.path)){discovery.files.set(entry.path,{...entry});found++;}}
        if(result.nextOffset!==null)discovery.queue.unshift({path:job.path,offset:result.nextOffset,depth:job.depth||0});
        if(!job.depth){for(const entry of result.directories){discovery.directories.set(entry.path,{...entry});if(!discovery.scheduledDirectories.has(entry.path)){discovery.scheduledDirectories.add(entry.path);discovery.queue.push({path:entry.path,offset:0,depth:1});}}}
        pendingJob=null;
      }
      if(epoch===discoveryEpoch){discovery.loading=false;discovery.complete=discovery.queue.length===0;discovery.batches++;paint();queueSummaries();}
    }catch(error){if(!disposed&&epoch===discoveryEpoch){if(pendingJob)discovery.queue.unshift(pendingJob);discovery.loading=false;discovery.error=error.message;paint();}if(signal.aborted)return documents();throw error;}
    return documents();
  };
  const beginDiscovery=async path=>{
    discoveryAbort?.abort();cancelQueuedSummaries();discoveryAbort=new AbortController();discoveryEpoch++;
    discovery={root:path,queue:[{path,offset:0,depth:0}],files:new Map(),directories:new Map(),scheduledDirectories:new Set(),loading:false,complete:false,error:'',batches:0};
    return discoverMore();
  };
  const select=async path=>{
    folderRevealEpoch++;
    const entry=requireEntry(path);openAbort.abort();openAbort=new AbortController();selected=entry;preview=null;const epoch=++previewEpoch;paint();
    if(entry.kind==='directory'){if(discovery.root!==entry.path)await beginDiscovery(entry.path);return inspect();}
    discoveryAbort?.abort();cancelQueuedSummaries();discoveryEpoch++;discovery.root=null;discovery.loading=false;
    if(entry.path.toLowerCase().endsWith('.json'))void ensureSummary(entry);
    if(entry.kind==='file'&&supportedText(entry.path)){
      preview={path:entry.path,loading:true,error:''};paint();
      try{
        const file=await json(`/api/workspace/file?path=${encodeURIComponent(entry.path)}`);
        if(disposed||epoch!==previewEpoch)return;
        if(file.format!=='fullmeta-workspace-file/1'||file.path!==entry.path||typeof file.text!=='string'||!Number.isSafeInteger(file.bytes)||file.bytes<0||typeof file.contentHash!=='string')throw new Error('The workspace file response is invalid.');
        preview={path:entry.path,text:file.text.slice(0,maximumPreviewCharacters),truncated:file.text.length>maximumPreviewCharacters,bytes:file.bytes,contentHash:file.contentHash,loading:false,error:''};
      }catch(error){if(!disposed&&epoch===previewEpoch)preview={path:entry.path,loading:false,error:error.message};}
      if(!disposed&&epoch===previewEpoch)paint();
    }
    return inspect();
  };
  const navigateDocument=path=>{
    folderRevealEpoch++;
    const value=canonicalWorkspacePath(path,{root:false});
    if(!value.toLowerCase().endsWith('.json'))throw new Error('Choose a JSON document to open.');
    const target=new URL('platform/loader.html',workspaceUrl);target.searchParams.set('model',value);
    if(context.services?.navigate)context.services.navigate(value);else container.ownerDocument.defaultView.location.assign(target.href);
    return {navigating:true,path:value,url:target.href};
  };
  const openDocument=async(file,proof)=>{
    const epoch=discoveryEpoch,summary=await ensureSummary(file);requireLive();
    if(epoch!==discoveryEpoch||!proof())throw new Error('The workspace selection changed before opening this document.');
    const availability=openAvailability(file,summary);if(!availability.openAvailable)throw new Error(availability.openReason+'.');
    return navigateDocument(file.path);
  };
  const selectDiscoveredFolder=async value=>{
    const path=canonicalWorkspacePath(value),proved=selected?.kind==='directory'&&selected.path===discovery.root&&discovery.directories.has(path);
    if(!proved)throw new Error('Choose a folder card from the current document overview.');
    const epoch=++folderRevealEpoch;
    const check=()=>{requireLive();if(epoch!==folderRevealEpoch)throw new Error('The workspace selection changed while opening this folder.');if(picker.inspect().open)throw new Error('Finish the workspace file selection first.');launcher.assertReady();};
    let parent=explorerRoot;expanded.set(explorerRoot,true);paint();
    for(const part of path===explorerRoot?[]:explorerRoot==='.'?path.split('/'):path.slice(explorerRoot.length+1).split('/')){
      check();if(!folders.has(parent))await load(parent);check();
      const child=parent==='.'?part:parent+'/'+part;
      while(!entryFor(child)&&folders.get(parent)?.nextOffset!==null){await load(parent,true);check();}
      if(entryFor(child)?.kind!=='directory')throw new Error('This folder is no longer available in the workspace. Refresh the document overview.');
      expanded.set(parent,true);parent=child;paint();
    }
    check();expanded.set(path,true);if(!folders.has(path))await load(path);check();
    return select(path);
  };
  const dispatch=async(name,args={})=>{
    requireLive();if(!record(args))throw new Error('Workspace command arguments must be an object.');
    if(['edit.inspect','edit.copy','edit.cut','edit.paste','edit.selectAll','help.open','help.close'].includes(name))return standardMenus.dispatch(name,args);
    launcher?.assertReady();
    const fields={
      'workspace.tree.toggle':['path','expanded'],'workspace.file.select':['path'],'workspace.file.open':['path'],
      'workspace.files.refresh':['path'],'workspace.files.more':['path'],'workspace.layout.set':['layout'],
      'workspace.file.choose':['path'],'workspace.picker.navigate':['path'],'workspace.picker.more':[],
      'workspace.picker.select':['path'],'workspace.picker.accept':[],'workspace.picker.cancel':[],'workspace.application.new':[],
      'workspace.discover.more':[],
      'workspace.project.delete':['path','title','documentCount'],'workspace.folder.delete':['path'],'workspace.file.delete':['path'],
      'workspace.folder.select':['path'],
    };
    if(!Object.hasOwn(fields,name)||Object.keys(args).some(key=>!fields[name].includes(key)))throw new Error('Choose a documented workspace command and its arguments.');
    if(name.startsWith('workspace.picker.')){
      if(!picker.inspect().open)throw new Error('Open the workspace file picker first.');
      const action=name.slice('workspace.picker.'.length);
      if(['navigate','select'].includes(action))return picker[action](args.path);
      return picker[action]();
    }
    if(picker.inspect().open)throw new Error('Finish the workspace file selection first.');
    if(name==='workspace.file.choose')return picker.open({purpose:'open',folder:args.path??'.',extensions:['.json'],title:'Open workspace JSON',onAccept:file=>openDocument(file,()=>{const state=picker.inspect();return state.open&&state.selectedPath===file.path;})});
    if(name==='workspace.application.new')return launcher.actions.dialog({dialog:'application-create',action:'open'});
    if(name==='workspace.folder.select')return selectDiscoveredFolder(args.path);
    if(name==='workspace.folder.delete'){const folder=requireEntry(args.path);if(folder.kind!=='directory'||!/^projects\/(?:[^/]+\/)*[^/]+$/.test(folder.path))throw new Error('Choose a folder inside projects.');return launcher.actions.deleteWorkspaceFolder({folder:folder.path});}
    if(name==='workspace.project.delete'){const selectedProjectValue=args.path===undefined?selectedProject():null;const folder=args.path===undefined?selected?.path:canonicalWorkspacePath(args.path,{root:false});if(args.path===undefined&&!selectedProjectValue)throw new Error('Select a registered project folder.');if(typeof folder!=='string'||!/^projects\/(?:[^/]+\/)*[^/]+$/.test(folder))throw new Error('Choose a project folder inside projects.');if(args.path!==undefined&&!documents().groups.some(group=>group.folder===folder)&&!(visible(folder)&&entryFor(folder)?.kind==='directory'))throw new Error('Choose a project folder from the current listing.');if(args.title!==undefined&&typeof args.title!=='string')throw new Error('Project title must be text.');if(args.documentCount!==undefined&&(!Number.isSafeInteger(args.documentCount)||args.documentCount<0))throw new Error('Project document count must be a non-negative integer.');return launcher.actions.deleteProjectFolder({folder,title:args.title??selectedProjectValue?.title??folder.split('/').at(-1),documentCount:args.documentCount??selectedProjectValue?.documentCount});}
    if(name==='workspace.file.delete'){
      const entry=requireEntry(args.path);if(entry.kind!=='file'||!/^projects\/(?:[^/]+\/)+[^/]+$/.test(entry.path))throw new Error('Choose a file inside a project folder.');
      const result=await json('/api/workspace/file/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:entry.path})});
      if(result.deleted!==true||result.path!==entry.path)throw new Error('The server returned an invalid file deletion response.');
      const parent=parentOf(entry.path);invalidateSummaryTree(entry.path);await load(parent);if(selected?.path===entry.path)await select(parent);else if(selected?.kind==='directory')await beginDiscovery(selected.path);return result;
    }
    if(name==='workspace.discover.more'){await discoverMore();return inspect();}
    if(name==='workspace.layout.set'){layout.set(args.layout);paint();return inspect();}
    if(name==='workspace.file.open'){
      const requested=canonicalWorkspacePath(args.path??selected?.path,{root:false});
      const discovered=selected?.kind==='directory'&&selected.path===discovery.root?discovery.files.get(requested):null;
      const entry=discovered?{...discovered,kind:'file'}:requireEntry(requested);
      if(entry.kind!=='file'||!entry.path.toLowerCase().endsWith('.json'))throw new Error('Choose a JSON document to open.');
      return openDocument(entry,()=>{const current=selected?.kind==='directory'&&selected.path===discovery.root?discovery.files.get(requested):null;return Boolean(current||entryFor(requested)&&visible(requested));});
    }
    if(name==='workspace.file.select')return select(args.path);
    const path=canonicalWorkspacePath(args.path??(name==='workspace.files.refresh'?explorerRoot:undefined)),entry=requireEntry(path);
    if(entry.kind!=='directory')throw new Error('Choose a workspace folder.');
    if(name==='workspace.tree.toggle'){
      if(args.expanded!==undefined&&typeof args.expanded!=='boolean')throw new Error('expanded must be a boolean.');
      const value=args.expanded??!expanded.get(path);expanded.set(path,value);paint();
      if(value&&!folders.has(path))await load(path);
    }else {await load(path,name==='workspace.files.more');if(name==='workspace.files.refresh'){invalidateSummaryTree(path);if(selected?.kind==='directory')await beginDiscovery(selected.path);}}
    return inspect();
  };
  picker=createWorkspaceFilePicker({dialog:container.querySelector('#workspace-file-dialog'),container:container.querySelector('#workspace-file-dialog-host'),requestJson:json,defaultFolder:()=>'.'});
  standardMenus=createStandardMenuController({root:container,fetcher,workspaceUrl,getInterpretingSchema:()=>({schemaUrl:context.schemaUrl,revision:context.schemaRevision}),clipboard:context.services?.clipboard,onApplicationInstalled:context.services?.reloadPage,onStatus:(message,level)=>{const status=container.querySelector('#launcher-status');status.textContent=message;status.classList.toggle('error',level==='error');}});
  const tools=createWorkspaceWebMcpTools({inspect,dispatch});
  launcher=createLauncherController(container,{workspaceUrl,fetcher,navigate:url=>{
    const target=new URL(url,workspaceUrl),path=target.searchParams.get('model');
    if(context.services?.navigate&&path){context.services.navigate(path,target.searchParams.get('action'));return;}
    container.ownerDocument.defaultView.location.assign(target.href);
  },extraTools:tools,inspectExtra,showProjects:async()=>{if(!withinExplorer('projects'))return;expanded.set(explorerRoot,true);if(!folders.has(explorerRoot))await load(explorerRoot);const entry=entryFor('projects');if(entry?.kind==='directory')await select('projects');},refreshDocuments:async deletedFolder=>{const selectedFolder=selected?.kind==='directory'?selected.path:null;const parent=deletedFolder?parentOf(deletedFolder):selectedFolder;if(deletedFolder){for(const key of folders.keys())if(key===deletedFolder||key.startsWith(deletedFolder+'/')){folders.delete(key);epochs.set(key,(epochs.get(key)||0)+1);}for(const key of expanded.keys())if(key===deletedFolder||key.startsWith(deletedFolder+'/'))expanded.delete(key);invalidateSummaryTree(deletedFolder);}if(parent&&folders.has(parent))await load(parent);if(selectedFolder===deletedFolder&&parent)await select(parent);else if(selected?.kind==='directory'){invalidateSummaryTree(selected.path);await beginDiscovery(selected.path);}}});
  const onResize=()=>layout.resize();container.ownerDocument.defaultView.addEventListener('resize',onResize);
  const ready=(async()=>{
    const rootListing=load(explorerRoot);
    const results=await Promise.allSettled([launcher.ready,rootListing]);
    if(disposed)return inspect();
    for(const path of context.document.explorer?.initialExpanded||[explorerRoot]){
      if(path===explorerRoot)continue;
      if(entryFor(path)?.kind==='directory'&&visible(path)){expanded.set(path,true);try{await load(path);}catch{}}
    }
    const initialSelection=context.document.explorer?.initialSelection;
    if(typeof initialSelection==='string'&&entryFor(initialSelection)&&visible(initialSelection))await select(initialSelection);
    paint();
    const failed=results.filter(result=>result.status==='rejected');
    if(failed.length)container.querySelector('#launcher-status').textContent=failed.map(result=>result.reason.message).join(' ');
    return inspect();
  })();
  paint();
  return Object.freeze({ready,inspect,dispatch,actions:launcher.actions,tools:[...launcher.tools,...tools],webMcpStatus:launcher.webMcpStatus,dispose(){if(disposed)return;disposed=true;previewEpoch++;openAbort.abort();discoveryAbort?.abort();cancelQueuedSummaries();for(const key of summaryWaiters.keys())finishSummaryWaiters(key,{unavailable:true,error:'The workspace editor has been disposed.'});if(summaryPaint!==null)clearTimeout(summaryPaint);summaryPaint=null;lifetime.abort();standardMenus.dispose();picker.dispose();launcher.dispose();layout.dispose();container.ownerDocument.defaultView.removeEventListener('resize',onResize);}});
}
