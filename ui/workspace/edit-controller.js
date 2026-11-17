/** Plain-text edit effects shared by ordinary menus and semantic commands. No document history is invented. */
import {flushSync} from '../widgets/shared/react/react-runtime.js';
import {mountReactComponent} from '../widgets/shared/react/mount.js';
import {HelpContent,RecommendedApplicationsContent,RecommendedVersionsContent} from './standard-menus.js';
import {canonicalWorkspacePath} from './file-picker.js';
import {renameRepositoryZip} from './repository-zip.js';

const textTypes=new Set(['text','search','url','tel','password']);
const recommendedInventoryUrl='https://raw.githubusercontent.com/gbaswfm2021/FullMeta/main/applications/inventory.json';
function checkedApplicationRepository(value){
  let url;try{url=new URL(value);}catch{throw new Error('The inventory contains an invalid application repository URL.');}
  const parts=url.pathname.split('/').filter(Boolean);
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash||parts.length!==2||parts.some(part=>! /^[A-Za-z0-9_.-]+$/.test(part)))throw new Error('Applications must link to a public GitHub owner/repository URL.');
  return {owner:parts[0],repository:parts[1],url:`https://github.com/${parts[0]}/${parts[1]}`};
}
function checkedRecommendedApplications(value){
  if(value?.format!=='fullmeta-application-inventory/1'||!Array.isArray(value.applications)||value.applications.length>100)throw new Error('The published application inventory has an unsupported format.');
  const ids=new Set();
  return value.applications.map(entry=>{
    if(!entry||typeof entry.id!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(entry.id)||typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>120)throw new Error('The published application inventory contains an invalid application entry.');
    if(ids.has(entry.id))throw new Error(`The published application inventory repeats ${entry.id}.`);ids.add(entry.id);
    const repository=checkedApplicationRepository(entry.repository),releases=`https://github.com/${repository.owner}/${repository.repository}/releases`;
    if(entry.releases!==undefined&&entry.releases!==releases)throw new Error(`The releases page for ${entry.id} does not match its repository.`);
    if(entry.description!==undefined&&(typeof entry.description!=='string'||entry.description.length>500))throw new Error(`The description for ${entry.id} is invalid.`);
    if(entry.hiddenReleases!==undefined&&(!Array.isArray(entry.hiddenReleases)||entry.hiddenReleases.length>1000||entry.hiddenReleases.some(tag=>typeof tag!=='string'||!tag.length||tag.length>128||/[\x00-\x1f\x7f]/.test(tag))))throw new Error(`The hidden releases for ${entry.id} are invalid.`);
    return {id:entry.id,name:entry.name.trim(),description:entry.description?.trim()||'',repository:repository.url,releases,hiddenReleases:entry.hiddenReleases||[],...repository};
  });
}
/** One ordinary menu bar for every host; native summaries keep their normal toggle behavior. */
function createMenuBar(root){
  const document=root.ownerDocument,menus=[...root.querySelectorAll('details.app-file-menu')],cleanups=[];
  const listen=(node,type,callback,options)=>{node.addEventListener(type,callback,options);cleanups.push(()=>node.removeEventListener(type,callback,options));};
  const closeAll=except=>{for(const menu of menus)if(menu!==except&&menu.open)menu.open=false;};
  const owned=node=>menus.includes(node)?node:null;
  listen(root,'click',event=>{const summary=event.target.closest?.('summary'),menu=owned(summary?.parentElement);if(menu){closeAll(menu);return;}const action=event.target.closest?.('button,a[href]'),owner=owned(action?.closest('details.app-file-menu'));if(owner&&!action.matches(':disabled'))owner.open=false;},true);
  listen(root,'toggle',event=>{const menu=owned(event.target);if(menu?.open)closeAll(menu);},true);
  listen(document,'pointerdown',event=>{if(!menus.some(menu=>menu.contains(event.target)))closeAll();},true);
  listen(document,'keydown',event=>{if(event.key!=='Escape')return;const open=menus.find(menu=>menu.open);if(!open)return;event.preventDefault();event.stopPropagation();closeAll();open.querySelector('summary')?.focus();},true);
  const observer=new document.defaultView.MutationObserver(records=>{if(records.some(record=>record.target.tagName==='DIALOG'&&record.target.open))closeAll();});
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});closeAll(menus.find(menu=>menu.open));
  return {closeAll,dispose(){for(const cleanup of cleanups)cleanup();observer.disconnect();closeAll();}};
}
export function validateStandardMenuState(value){if(!value||value.format!=='fullmeta-standard-menus/1'||!value.help||typeof value.help.open!=='boolean'||!['docs','about'].includes(value.help.section))throw new Error('Invalid Help presentation state.');return value;}
/** Resolve the platform workspace guide or the guide beside the actual interpreting schema. */
export function interpretingSchemaDocumentation(context,workspaceUrl){
  if(!context||!(context.schemaUrl||context.schemaPath))throw new Error('The current interpreting schema is unavailable; its local documentation cannot be resolved.');
  if(!context.schemaUrl&&canonicalWorkspacePath(context.schemaPath,{root:false})!==context.schemaPath)throw new Error('The interpreting schema path must be canonical inside FullMeta.');
  const base=new URL(workspaceUrl),schema=new URL(context.schemaUrl||context.schemaPath,base);
  if(!['http:','https:','file:'].includes(base.protocol)||schema.protocol!==base.protocol||schema.origin!==base.origin||schema.username||schema.password||schema.search||schema.hash||!schema.pathname.startsWith(base.pathname)||!schema.pathname.toLowerCase().endsWith('.json'))throw new Error('The interpreting schema must be a local JSON file inside the FullMeta workspace.');
  const schemaPath=canonicalWorkspacePath(decodeURIComponent(schema.pathname.slice(base.pathname.length)),{root:false}),documentationUrl=schemaPath==='platform/workspace/workspace.schema.json'?new URL('platform/docs/README.md',base):new URL('docs/README.md',schema);
  const documentationPath=canonicalWorkspacePath(decodeURIComponent(documentationUrl.pathname.slice(base.pathname.length)),{root:false});
  return {schemaPath,documentationPath,documentationUrl:documentationUrl.href,key:JSON.stringify([schema.href,context.revision??null])};
}
export function createStandardMenuController({root,fetcher=globalThis.fetch,requestJson,workspaceUrl,getInterpretingSchema=()=>null,clipboard=globalThis.navigator?.clipboard,onApplicationInstalled,onStatus=()=>{}}){
  const document=root.ownerDocument,window=document.defaultView,dialog=root.querySelector('#help-dialog'),host=root.querySelector('#help-dialog-host'),applicationsDialog=root.querySelector('#recommended-applications-dialog'),applicationsHost=root.querySelector('#recommended-applications-host'),versionsDialog=root.querySelector('#recommended-versions-dialog'),versionsHost=root.querySelector('#recommended-versions-host');
  if(!dialog||!host||!applicationsDialog||!applicationsHost||!versionsDialog||!versionsHost)throw new Error('Standard menus need their in-application Help and Applications dialogs.');
  const workspaceRoot=new URL(workspaceUrl||'/',window.location.href);if(!workspaceRoot.pathname.endsWith('/'))workspaceRoot.pathname+='/';
  const docsCache=new Map();
  let target=null,remembered=null,disposed=false,epoch=0,opener=null,aboutPromise=null;
  let state={open:false,section:'docs',loading:false,error:'',text:'',about:null,documentationUrl:null,documentationPath:null,schemaPath:null,workspaceRoot:workspaceRoot.href,generalDocumentationUrl:new URL('platform/docs/README.md',workspaceRoot).href};
  const listeners=[],listen=(node,type,callback,options)=>{node?.addEventListener(type,callback,options);listeners.push(()=>node?.removeEventListener(type,callback,options));};
  let applicationsMount=null,versionsMount=null,applicationsOpener=null,inventoryEpoch=0,versionsEpoch=0;
  let applicationsState={open:false,loading:false,error:'',applications:[]};
  let versionsState={open:false,loading:false,error:'',application:null,releases:[],selectedTag:''};
  const menuBar=createMenuBar(root);
  const candidate=node=>node?.tagName==='TEXTAREA'||node?.tagName==='INPUT'&&textTypes.has(node.type);
  const selection=node=>({start:node.selectionStart??0,end:node.selectionEnd??0,direction:node.selectionDirection||'none'});
  const menuNode=node=>node?.closest?.('.app-file-menu');
  const usable=()=>{if(!target||!target.isConnected||!root.contains(target)||target.matches(':disabled')||target.closest('[hidden],[aria-hidden="true"],[inert]'))return false;if(root.querySelector('dialog[open]')&&!target.closest('dialog[open]'))return false;const activeDialog=document.activeElement?.closest?.('dialog[open]');return !activeDialog||target.closest('dialog')===activeDialog;};
  const setTarget=node=>{target=node;remembered=selection(node);};
  const inspect=()=>{const valid=usable(),range=valid?(document.activeElement===target?selection(target):remembered):null,text=range?target.value.slice(range.start,range.end):'';return {format:'fullmeta-standard-menu-state/1',edit:{available:valid,label:valid?(target.getAttribute('aria-label')||target.labels?.[0]?.textContent?.trim()||target.id||'Text'):null,readOnly:valid?Boolean(target.readOnly):true,selection:range?{...range,text}:null,canCopy:valid&&Boolean(text),canCut:valid&&!target.readOnly&&Boolean(text),canPaste:valid&&!target.readOnly,canSelectAll:valid},help:{open:state.open,section:state.section,loading:state.loading,error:state.error,schemaPath:state.schemaPath,documentationPath:state.documentationPath}};};
  const refresh=()=>{const current=inspect().edit;for(const [id,available]of [['edit-copy',current.canCopy],['edit-cut',current.canCut],['edit-paste',current.canPaste],['edit-select-all',current.canSelectAll]]){const button=root.querySelector('#'+id);if(button)button.disabled=!available;}};
  const restoreTarget=()=>{if(!usable())throw new Error('Focus an editable text control first.');target.focus();if(remembered)target.setSelectionRange(remembered.start,remembered.end,remembered.direction);return target;};
  const render=()=>{if(!disposed)mount.update({state:{...state},onClose:closeHelp});};
  const closeHelp=()=>{epoch++;state={...state,open:false,loading:false};if(dialog.open)dialog.close();if(!disposed)render();if(opener?.isConnected)opener.focus();};
  const checkedText=async url=>{const response=await fetcher(url,{cache:'no-store'});if(!response.ok)throw new Error(`Could not load ${url} (${response.status}).`);const text=await response.text();if(new TextEncoder().encode(text).length>512*1024)throw new Error('This Help resource exceeds its display limit.');return text;};
  const checkedDocumentation=async path=>{const endpoint=`/api/workspace/file?path=${encodeURIComponent(path)}`;let value;if(requestJson)value=await requestJson(endpoint,{cache:'no-store'});else{const response=await fetcher(endpoint,{cache:'no-store'});value=await response.json();if(!response.ok)throw new Error(value.error||`Workspace read failed (${response.status}).`);}if(value?.format!=='fullmeta-workspace-file/1'||value.path!==path||typeof value.text!=='string'||!Number.isSafeInteger(value.bytes)||value.bytes<0||value.bytes>2*1024*1024||new TextEncoder().encode(value.text).length>2*1024*1024||typeof value.contentHash!=='string')throw new Error('The checked documentation response is invalid.');return value.text;};
  const openHelp=async(section='docs')=>{
    if(!['docs','about'].includes(section))throw new Error('Choose Documentation or About.');if(disposed)throw new Error('The menus have been disposed.');
    menuBar.closeAll();
    if(!state.open)opener=document.activeElement;const request=++epoch;state={...state,open:true,section,loading:true,error:'',...(section==='docs'?{text:'',documentationPath:null,documentationUrl:null,schemaPath:null}:{})};render();if(!dialog.open)dialog.showModal();
    let source=null;
    try{if(section==='docs'){source=interpretingSchemaDocumentation(getInterpretingSchema(),workspaceRoot);state={...state,schemaPath:source.schemaPath,documentationPath:source.documentationPath,documentationUrl:source.documentationUrl};render();if(!docsCache.has(source.key)){docsCache.set(source.key,checkedDocumentation(source.documentationPath));while(docsCache.size>8)docsCache.delete(docsCache.keys().next().value);}const text=await docsCache.get(source.key);if(disposed||request!==epoch)return inspect();if(interpretingSchemaDocumentation(getInterpretingSchema(),workspaceRoot).key!==source.key)throw new Error('The interpreting schema changed while loading documentation. Reopen Help for its current guide.');state={...state,text,loading:false};}
      else{aboutPromise||=Promise.all([checkedText('/package.json'),checkedText('/platform/ui/frontend-build.json')]).then(([packageText,manifestText])=>{const packageValue=JSON.parse(packageText),manifest=JSON.parse(manifestText);if(typeof packageValue.version!=='string'||manifest.format!=='fullmeta-frontend-build/1'||typeof manifest.revision!=='string'||typeof manifest.mode!=='string'||typeof manifest.reactVersion!=='string')throw new Error('Build information is unavailable.');return {version:packageValue.version,revision:manifest.revision,mode:manifest.mode,reactVersion:manifest.reactVersion};});const about=await aboutPromise;if(disposed||request!==epoch)return inspect();state={...state,about,loading:false};}
    }catch(error){if(request===epoch&&!disposed){state={...state,loading:false,error:section==='docs'?(source?`Local documentation is unavailable at ${source.documentationPath}. ${error.message}`:error.message):error.message};if(section==='docs'&&source)docsCache.delete(source.key);else if(section==='about')aboutPromise=null;}}
    if(!disposed)render();return inspect();
  };
  const renderApplications=()=>applicationsMount?.update({state:{...applicationsState,applications:[...applicationsState.applications]},onRefresh:()=>void refreshApplications(),onSelect:application=>void openVersions(application),onClose:()=>closeApplications()});
  const versionProps=()=>({state:{...versionsState,releases:[...versionsState.releases]},onSelectVersion:tag=>{versionsState={...versionsState,selectedTag:tag};renderVersions();},onDownload:downloadSelectedVersion,onBack:returnToApplications,onClose:()=>closeVersionPicker(false),onReplace:()=>void installSavedArchive(true),onKeep:keepExistingApplication});
  const renderVersions=()=>versionsMount?.update(versionProps());
  async function refreshApplications(){
    const request=++inventoryEpoch;applicationsState={...applicationsState,loading:true,error:''};renderApplications();
    try{
      const text=await checkedText(recommendedInventoryUrl),value=JSON.parse(text),applications=checkedRecommendedApplications(value);
      if(disposed||request!==inventoryEpoch)return inspect();
      applicationsState={...applicationsState,loading:false,error:'',applications};
    }catch(error){if(!disposed&&request===inventoryEpoch)applicationsState={...applicationsState,loading:false,error:`Could not load the recommended application inventory. ${error.message}`};}
    renderApplications();return inspect();
  }
  function openApplications(){
    if(disposed)throw new Error('The menus have been disposed.');menuBar.closeAll();applicationsOpener=document.activeElement;
    applicationsState={...applicationsState,open:true,error:''};renderApplications();if(!applicationsDialog.open)applicationsDialog.showModal();void refreshApplications();return {opened:'applications',dialog:'recommended-applications-dialog'};
  }
  function closeApplications(restoreFocus=true){
    inventoryEpoch++;applicationsState={...applicationsState,open:false,loading:false};if(applicationsDialog.open)applicationsDialog.close();renderApplications();
    if(restoreFocus&&applicationsOpener?.isConnected)applicationsOpener.focus();
  }
  async function openVersions(application){
    if(!application||typeof application.id!=='string')throw new Error('Choose an application from the current catalog.');
    closeApplications(false);const request=++versionsEpoch;
    versionsState={open:true,loading:true,error:'',application,releases:[],selectedTag:'',phase:'',confirmReplace:false,archiveName:''};renderVersions();if(!versionsDialog.open)versionsDialog.showModal();
    try{
      const endpoint=`https://api.github.com/repos/${encodeURIComponent(application.owner)}/${encodeURIComponent(application.repository)}/releases?per_page=100`;
      const response=await fetcher(endpoint,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
      if(!response.ok)throw new Error(`GitHub releases request failed (${response.status}).`);
      const text=await response.text();if(new TextEncoder().encode(text).length>5*1024*1024)throw new Error('The GitHub releases response is too large to display.');
      const body=JSON.parse(text);if(!Array.isArray(body))throw new Error('GitHub returned an invalid releases list.');
      const hiddenReleases=new Set(application.hiddenReleases);
      const releases=body.filter(release=>release&&!release.draft&&typeof release.tag_name==='string'&&release.tag_name.length>0&&release.tag_name.length<=128&&!/[\x00-\x1f\x7f]/.test(release.tag_name)&&!hiddenReleases.has(release.tag_name))
        .map(release=>({tag:release.tag_name,name:typeof release.name==='string'&&release.name.trim()?release.name.trim():release.tag_name,publishedAt:typeof release.published_at==='string'?release.published_at:'',prerelease:release.prerelease===true}));
      if(disposed||request!==versionsEpoch)return inspect();
      versionsState={...versionsState,loading:false,error:'',releases,selectedTag:releases[0]?.tag||''};
    }catch(error){if(!disposed&&request===versionsEpoch)versionsState={...versionsState,loading:false,error:`Could not load releases for ${application.name}. ${error.message}`};}
    renderVersions();return inspect();
  }
  function returnToApplications(){
    if(versionsState.phase)return;
    versionsEpoch++;versionsState={...versionsState,open:false,loading:false};if(versionsDialog.open)versionsDialog.close();renderVersions();
    applicationsState={...applicationsState,open:true};renderApplications();if(!applicationsDialog.open)applicationsDialog.showModal();
  }
  function closeVersionPicker(returnToCatalog=true){
    if(versionsState.phase)return;
    if(returnToCatalog){returnToApplications();return;}
    versionsEpoch++;versionsState={...versionsState,open:false,loading:false};if(versionsDialog.open)versionsDialog.close();renderVersions();closeApplications(true);
  }
  async function downloadSelectedVersion(){
    const release=versionsState.releases.find(item=>item.tag===versionsState.selectedTag);
    if(!release||!versionsState.application)throw new Error('Choose a published version to download.');
    const application=versionsState.application,request=++versionsEpoch;
    versionsState={...versionsState,loading:false,error:'',phase:'download'};renderVersions();
    try{
      const response=await fetcher(new URL('api/applications/release-archive',workspaceRoot).href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:application.owner,repository:application.repository,tag:release.tag})});
      if(!response.ok){let message='';try{message=(await response.json()).error||'';}catch{}throw new Error(message||`Download failed (${response.status}).`);}
      const total=Number(response.headers?.get('content-length'))||0,chunks=[];let received=0;
      if(total>256*1024*1024)throw new Error('The application ZIP is too large to download.');
      if(response.body?.getReader){const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(received>256*1024*1024){await reader.cancel();throw new Error('The application ZIP is too large to download.');}chunks.push(value);if(disposed||request!==versionsEpoch){await reader.cancel();return {downloaded:false};}}}finally{reader.releaseLock();}}
      else{const data=await response.arrayBuffer();received=data.byteLength;if(received>256*1024*1024)throw new Error('The application ZIP is too large to download.');chunks.push(new Uint8Array(data));}
      const data=new Uint8Array(received);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      const normalized=renameRepositoryZip(data,application.repository);
      if(disposed||request!==versionsEpoch)return {downloaded:false};
      const archiveName=`${application.id}-${release.tag.replace(/[^A-Za-z0-9_.-]/g,'_')}.zip`;
      versionsState={...versionsState,phase:'save',archiveName};renderVersions();
      const saved=await fetcher(new URL(`api/applications/save-archive?name=${encodeURIComponent(archiveName)}`,workspaceRoot).href,{method:'POST',headers:{'Content-Type':'application/zip'},body:normalized});
      const savedValue=await saved.json();if(!saved.ok)throw new Error(savedValue.error||`Could not save ZIP (${saved.status}).`);
      if(savedValue.path!==`applications/${archiveName}`)throw new Error('The server returned an invalid ZIP path.');
      if(disposed||request!==versionsEpoch)return {downloaded:false};
      return await installSavedArchive(false);
    }catch(error){
      if(!disposed&&request===versionsEpoch){versionsState={...versionsState,loading:false,phase:'',error:`Could not download ${application.name}. ${error.message}`};renderVersions();}
      return {downloaded:false};
    }
  }
  async function installSavedArchive(replace){
    const application=versionsState.application,archiveName=versionsState.archiveName,request=versionsEpoch;
    versionsState={...versionsState,phase:'extract',error:'',confirmReplace:false};renderVersions();
    try{
      const response=await fetcher(new URL('api/applications/install-archive',workspaceRoot).href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:application.id,archive:archiveName,replace})});
      const value=await response.json();if(disposed||request!==versionsEpoch)return {installed:false};
      if(response.status===409&&value.code==='APPLICATION_EXISTS'){versionsState={...versionsState,phase:'',confirmReplace:true};renderVersions();return {installed:false,confirmationRequired:true};}
      if(!response.ok)throw new Error(value.error||`Extraction failed (${response.status}).`);
      if(value.folder!==`applications/${application.id}`||value.archive!==`applications/${archiveName}`)throw new Error('The server returned an invalid installation result.');
      versionsState={...versionsState,phase:''};closeVersionPicker(false);onStatus(`Installed ${value.folder}. ZIP saved at ${value.archive}. Reloading…`);
      try{if(onApplicationInstalled)await onApplicationInstalled({id:application.id,folder:value.folder,archive:value.archive,replaced:replace});else window.location.reload();}
      catch(error){onStatus(`Installed ${value.folder}, but the page could not reload. Please refresh it. ${error.message}`,'error');}
      return {installed:true};
    }catch(error){if(!disposed&&request===versionsEpoch){versionsState={...versionsState,phase:'',error:`Could not extract ${application.name}. ZIP saved at applications/${archiveName}. ${error.message}`};renderVersions();}return {installed:false};}
  }
  function keepExistingApplication(){const archive=versionsState.archiveName;versionsState={...versionsState,confirmReplace:false};closeVersionPicker(false);onStatus(`ZIP saved at applications/${archive}. Existing application was kept.`);}
  const writeClipboard=async text=>{if(clipboard?.writeText){await clipboard.writeText(text);return;}if(document.execCommand?.('copy'))return;throw new Error('Clipboard access is unavailable. Use the normal keyboard shortcut in the selected text control.');};
  const replace=(node,text,inputType)=>{if(node.readOnly)throw new Error('This text control is read only.');const range=selection(node);if(node.maxLength>=0)text=text.slice(0,Math.max(0,node.maxLength-(node.value.length-(range.end-range.start))));const value=node.value.slice(0,range.start)+text+node.value.slice(range.end);if(value===node.value)return {changed:false,inserted:0};const prototype=node.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(node,value);const EventClass=window.InputEvent||window.Event;flushSync(()=>node.dispatchEvent(new EventClass('input',{bubbles:true,inputType,data:text})));const caret=range.start+text.length;if(node.isConnected){node.focus();node.setSelectionRange(caret,caret);setTarget(node);}return {changed:true,inserted:text.length};};
  const dispatch=async(name,args={},options={})=>{
    if(disposed)throw new Error('The menus have been disposed.');if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Edit arguments must be an object.');
    if(name==='edit.inspect')return inspect();if(name==='help.open'){if(Object.keys(args).some(key=>key!=='section'))throw new Error('Help accepts its section only.');return openHelp(args.section||'docs');}if(name==='help.close'){closeHelp();return inspect();}
    if(!['edit.copy','edit.cut','edit.paste','edit.selectAll'].includes(name))throw new Error('Choose Copy, Cut, Paste or Select All.');if(Object.keys(args).some(key=>name!=='edit.paste'||key!=='text'))throw new Error('Use explicit text for Paste.');
    const node=restoreTarget(),before=selection(node),beforeValue=node.value,text=node.value.slice(before.start,before.end);
    if(name==='edit.selectAll'){node.select();setTarget(node);refresh();return {selected:true,length:node.value.length};}
    if(name==='edit.paste'){if(node.readOnly)throw new Error('This text control is read only.');let value=args.text;if(value===undefined&&options.clipboard){if(!clipboard?.readText)throw new Error('Clipboard access is unavailable. Use Ctrl+V in the text control.');value=await clipboard.readText();}if(typeof value!=='string')throw new Error('Paste requires explicit text.');if(value.length>2*1024*1024)throw new Error('Paste text exceeds the edit limit.');if(!usable()||target!==node||node.value!==beforeValue||selection(node).start!==before.start||selection(node).end!==before.end)throw new Error('The edit target changed while reading the clipboard.');return replace(node,value,'insertFromPaste');}
    if(name==='edit.cut'&&node.readOnly)throw new Error('This text control is read only.');if(!text)return {changed:false,text:''};if(options.clipboard)await writeClipboard(text);
    if(name==='edit.copy')return {copied:true,text};if(!usable()||target!==node||selection(node).start!==before.start||selection(node).end!==before.end||node.value!==beforeValue)throw new Error('The edit target changed while copying.');return {...replace(node,'','deleteByCut'),text};
  };
  const mount=mountReactComponent(host,HelpContent,{state,onClose:closeHelp});
  applicationsMount=mountReactComponent(applicationsHost,RecommendedApplicationsContent,{state:applicationsState,onRefresh:()=>void refreshApplications(),onSelect:application=>void openVersions(application),onClose:()=>closeApplications()});
  versionsMount=mountReactComponent(versionsHost,RecommendedVersionsContent,versionProps());
  listen(root,'focusin',event=>{if(candidate(event.target))setTarget(event.target);else if(!menuNode(event.target)&&!dialog.contains(event.target))target=null;refresh();});
  listen(root,'focusout',event=>{if(event.target===target)remembered=selection(target);});
  listen(root,'pointerdown',event=>{if(!candidate(event.target)&&!menuNode(event.target)&&!dialog.contains(event.target))target=null;});
  listen(document,'selectionchange',()=>{if(document.activeElement===target){remembered=selection(target);refresh();}});
  listen(root.querySelector('#edit-menu'),'toggle',refresh);
  for(const [id,name,args]of [['edit-cut','edit.cut',{}],['edit-copy','edit.copy',{}],['edit-paste','edit.paste',{}],['edit-select-all','edit.selectAll',{}],['help-documentation','help.open',{section:'docs'}],['help-about','help.open',{section:'about'}]]){
    const button=root.querySelector('#'+id);listen(button,'pointerdown',event=>event.preventDefault());listen(button,'click',()=>{const menu=button.closest('details');if(menu)menu.open=false;void dispatch(name,args,{clipboard:true}).catch(error=>onStatus(error.message,'error'));});
  }
  const applicationsButton=root.querySelector('#help-applications');listen(applicationsButton,'pointerdown',event=>event.preventDefault());listen(applicationsButton,'click',()=>{const menu=applicationsButton.closest('details');if(menu)menu.open=false;try{openApplications();}catch(error){onStatus(error.message,'error');}});
  listen(dialog,'cancel',event=>{event.preventDefault();closeHelp();});listen(dialog,'close',()=>{if(state.open){state={...state,open:false,loading:false};epoch++;render();}});
  listen(applicationsDialog,'cancel',event=>{event.preventDefault();closeApplications();});
  listen(versionsDialog,'cancel',event=>{event.preventDefault();returnToApplications();});
  if(candidate(document.activeElement)&&root.contains(document.activeElement))setTarget(document.activeElement);refresh();
  return {dialog,inspect,dispatch,openHelp,closeHelp,openApplications,snapshot:()=>({format:'fullmeta-standard-menus/1',help:{open:state.open,section:state.section}}),validateState:validateStandardMenuState,async restore(value){validateStandardMenuState(value);return value.help.open?openHelp(value.help.section):(closeHelp(),inspect());},dispose(){if(disposed)return;disposed=true;epoch++;inventoryEpoch++;versionsEpoch++;menuBar.dispose();for(const remove of listeners)remove();for(const active of [dialog,applicationsDialog,versionsDialog])if(active.open)active.close();mount.dispose();applicationsMount.dispose();versionsMount.dispose();target=null;}};
}
