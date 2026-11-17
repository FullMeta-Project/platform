/** session controller; explicit live session dependencies. */
import {connectEditorDebugBridge} from '../../../debug/bridge-client.js';
import {registerWebMcpTools} from '../../../runtime/webmcp.js';
import {createEditorTools,describeEditorCommands,fullmetaToolContract} from '../../../runtime/editor-tools.js';
import {createNativeOperationTools,nativeOperationsDigest} from '../../../../js/services.js';
import {nativeOperationActions} from './native-operation-controller.js';
import {describeAdditionalEditorCommands,inspectAdditionalEditorAvailability,inspectEditorFiles} from './command-adapters.js';
import {coreSchemaDialogIds} from '../schema-core-dialog-state.js';
import {validateStructuredValueDraftShape} from '../../shared/structured-value-editor.js';
import {validateGraphicsInterfacesEditorState} from '../../graphics-console/widget.js';
import {validateWorkspaceLayoutState} from '../../../runtime/workspace-layout.js';
function editorDialogSnapshot(sessionContext, dialog){
  const registered=Object.entries(sessionContext.schemaDialogControllers||{}).find(([,controller])=>controller.dialog===dialog);
  const toolId=dialog.dataset.authoringTool||registered?.[0]||null;
  const controller=toolId&&sessionContext.schemaDialogControllers?.[toolId];
  let privateState=controller?.snapshot?.();
  if(privateState&&privateState.source===undefined&&privateState.model?.source===undefined)privateState={...privateState,source:sessionContext.cloneJson(sessionContext.model)};
  const snapshot=sessionContext.captureEditorDialogState(dialog,{toolId,path:privateState?.current?.path??privateState?.target?.itemPath??JSON.parse(dialog.dataset.authoringPath||'[]'),
    privateState:privateState??null});
  snapshot.focus=snapshot.focus||sessionContext.lastDialogFocus.get(dialog)||null;return snapshot;
}

function snapshotEditor(sessionContext){
  if(sessionContext.treeRename&&!sessionContext.treeRename.sourceAction)throw new Error('Finish or cancel this custom tree rename before exporting state.');
  const path=sessionContext.openedDocumentPath(),saved=sessionContext.loadedModelSnapshot?JSON.parse(sessionContext.loadedModelSnapshot):sessionContext.model;
  const inline=sessionContext.schemaUiAnnotationEditor?.snapshot?.();
  const filePresentation=sessionContext.snapshotFilePresentation?.();
  const pickerDialog=sessionContext.workspacePicker?.dialog;
  const modelUrl=`${sessionContext.editorEndpoint('model')}?folder=${encodeURIComponent(sessionContext.loadedModelFolder)}&file=${encodeURIComponent(sessionContext.loadedModelFile)}`;
  return sessionContext.editorJson({document:{path,applicationId:sessionContext.activeApplicationPackage?.id,schemaPath:sessionContext.activeApplicationPackage?.schemaPath,
      model: sessionContext.model,loadedSnapshot:sessionContext.loadedModelSnapshot,contentHash:sessionContext.loadedModelContentHash,schemaRevision:sessionContext.activeApplicationPackage?.interpretingSchemaRevision||null},
    selection:{path:sessionContext.selectedPath,collection:sessionContext.selectedCollection,label:sessionContext.selectedLabel,projection:sessionContext.selectedSchemaProjection},
    tree:{view:sessionContext.reactTreeState,rootCollapsed:[...sessionContext.treeRootCollapsedState],sections:[...sessionContext.treeSectionCollapsedState],rename:sessionContext.treeRename},
    drafts:{settings:sessionContext.settingsDraft,settingsPresent:sessionContext.settingsDraft!==undefined,settingsDirty:sessionContext.settingsDraftDirty,fields:[...sessionContext.rawFieldDrafts],json:sessionContext.fullJson.value,jsonDirty:sessionContext.jsonDraftDirty,tab:sessionContext.currentTab,surface:sessionContext.captureEditorPanelState(sessionContext.settingsSurfaceContent)},
    designers:{inline:inline?{key:JSON.stringify([path,sessionContext.selectedPath]),source:sessionContext.cloneJson(sessionContext.model),state:inline}:null,annotation:{key:sessionContext.schemaAnnotationKey,state:sessionContext.schemaAnnotationEditor?.snapshot?.()??sessionContext.schemaAnnotationState,changed:sessionContext.schemaAnnotationChanged},ui:{key:sessionContext.schemaUiKey,state:sessionContext.schemaUiEditor?.snapshot?.()??sessionContext.schemaUiState,changed:sessionContext.schemaUiChanged},choice:{key:sessionContext.schemaChoiceKey,state:sessionContext.schemaChoiceEditor?.snapshot?.()??sessionContext.schemaChoiceState,changed:sessionContext.schemaChoiceChanged},graphics:{key:sessionContext.schemaGraphicsKey,draft:sessionContext.schemaGraphicsEditor?.draft?.()??sessionContext.schemaGraphicsState?.draft,changed:sessionContext.schemaGraphicsChanged},global:{key:sessionContext.schemaGlobalUiKey,...(sessionContext.schemaGlobalUiEditor?.snapshotState?{state:sessionContext.schemaGlobalUiEditor.snapshotState()}:{draft:sessionContext.schemaGlobalUiEditor?.draft?.()})}},
    dialogs:[...document.querySelectorAll('dialog[open]')].filter(dialog=>dialog!==pickerDialog&&!['new-model-dialog','save-as-dialog','help-dialog'].includes(dialog.id)).map(sessionContext.editorDialogSnapshot),
    ...(filePresentation===undefined?{}:{files:filePresentation}),
    ...(sessionContext.workspaceLayout?.inspect?{workspaceLayout:sessionContext.workspaceLayout.inspect()}:{}),
    ...(sessionContext.standardMenus?.snapshot?{standardMenus:sessionContext.standardMenus.snapshot()}:{}),
    validation:{snapshot:sessionContext.lastValidatedModelSnapshot,summary:sessionContext.lastValidationSummary,document:sessionContext.lastDocumentValidation,resolved:sessionContext.$('#resolved-values').textContent},
    graphics:{camera: sessionContext.camera,controls:[...sessionContext.graphicsControlState],sceneId:sessionContext.activeGraphicsSceneId},operation:sessionContext.operationProgress.current()||sessionContext.restoredOperationView,nativeOperation:sessionContext.lastNativeOperation,
    focus:sessionContext.captureEditorFocus(sessionContext.container)||sessionContext.lastEditorFocus,status:{text:sessionContext.$('#status')?.textContent||''},
    fixture:{responses:{[`GET ${modelUrl}`]:{body:{model:saved,folder:sessionContext.loadedModelFolder,file:sessionContext.loadedModelFile,contentHash:sessionContext.loadedModelContentHash}}}}});
}

async function restoreEditor(sessionContext, value){
  if(sessionContext.operationProgress.isBusy()||sessionContext.modelLoading||sessionContext.modelSaving||sessionContext.modelValidating)throw new Error('Finish the active editor transaction before restoring state.');
  sessionContext.validateEditorWorkspaceState(value,{applicationId:sessionContext.activeApplicationPackage?.id,schemaPath:sessionContext.activeApplicationPackage?.schemaPath,toolIds:sessionContext.activeApplicationPackage?.kind==='schemaDocument'?sessionContext.schemaAuthoringTools().map(tool=>tool.id):[],builtinToolIds:sessionContext.activeApplicationPackage?.kind==='schemaDocument'?coreSchemaDialogIds:[]});
  if(value.files!==undefined){if(typeof sessionContext.validateFilePresentation!=='function'||typeof sessionContext.restoreFilePresentation!=='function')throw new Error('This editor has no safe file-presentation restore interface.');sessionContext.validateFilePresentation(value.files);}
  if(value.files?.picker?.open&&value.files.picker.purpose==='import'){
    const imports={'bulk-annotations':'Import field annotation TSV file','bulk-widgets':'Import widget settings TSV file','bulk-schema-authoring':'Import schema authoring batch file'},picker=value.files.picker;
    if(!Object.hasOwn(imports,picker.ownerKey)||imports[picker.ownerKey]!==picker.importKey||!(value.dialogs||[]).some(dialog=>dialog.toolId===picker.ownerKey))throw new Error('Restore only the saved authoring dialog’s declared workspace import controls.');
  }
  if(value.workspaceLayout!==undefined){validateWorkspaceLayoutState(value.workspaceLayout);if(typeof sessionContext.workspaceLayout?.restore!=='function')throw new Error('This editor has no workspace layout restore interface.');}
  if(value.standardMenus!==undefined){if(typeof sessionContext.standardMenus?.validateState!=='function'||typeof sessionContext.standardMenus?.restore!=='function')throw new Error('This editor has no safe standard-menu restore interface.');sessionContext.standardMenus.validateState(value.standardMenus);}
  const restoredScene=value.graphics?.sceneId?sessionContext.activeApplicationPackage?.graphicsConsole?.scenes?.[value.graphics.sceneId]:null;
  if(value.graphics?.sceneId&&!restoredScene)throw new Error('The saved graphics scene is not declared by the current application.');
  const source=value.document;
  if(!source?.model||typeof source.path!=='string'||!source.path||source.path.split('/').some(part=>part==='..'||part==='.'||!part))throw new Error('State needs a canonical workspace document path and JSON model.');
  if(value.document.applicationId!==sessionContext.activeApplicationPackage?.id||value.document.schemaPath!==sessionContext.activeApplicationPackage?.schemaPath)throw new Error('Open the state’s interpreting schema/application before restoring its editor state.');
  if(source.schemaRevision&&sessionContext.activeApplicationPackage?.interpretingSchemaRevision&&source.schemaRevision!==sessionContext.activeApplicationPackage.interpretingSchemaRevision)throw new Error('Interpreting schema revision conflict. Reload or rebase this scenario against the changed schema.');
  const designerKey=JSON.stringify([source.path,value.selection?.path]);
  for(const state of Object.values(value.designers||{})){if(state?.key&&state.key!==designerKey)throw new Error('The saved designer belongs to another selected declaration.');if(state?.draft)validateStructuredValueDraftShape(state.draft);}
  if(value.designers?.global?.state)validateGraphicsInterfacesEditorState(value.designers.global.state);
  if(value.dialogs!==undefined&&!Array.isArray(value.dialogs))throw new Error('Dialog snapshots must be an array.');
  const tools=new Set([...sessionContext.schemaAuthoringTools().map(tool=>tool.id),...(sessionContext.activeApplicationPackage?.kind==='schemaDocument'?coreSchemaDialogIds:[])]);
  for(const state of value.dialogs||[]){
    sessionContext.validateEditorDialogState(state);
    if(!state.toolId||!tools.has(state.toolId))throw new Error('Only declared schema authoring dialogs can be restored; no confirmation or file action was invoked.');
    if(state.privateState){const controller=sessionContext.schemaDialogControllers?.[state.toolId],privateSource=state.privateState.source??state.privateState.model?.source;
      if(!controller?.restore)throw new Error('The authoring tool has no private-state restore interface.');
      if(JSON.stringify(privateSource)!==JSON.stringify(source.model))throw new Error('The authoring dialog belongs to a different document snapshot.');}
  }
  const selectionPath=value.selection?.path;
  if(selectionPath!==undefined&&selectionPath!==null&&(!Array.isArray(selectionPath)||selectionPath.some(part=>typeof part!=='string'&&!Number.isInteger(part))||selectionPath.reduce((node,key)=>node?.[key],source.model)===undefined))throw new Error('The saved selection path is unavailable in this document.');
  const renameAction=value.tree?.rename?.sourceAction;
  if(renameAction?.kind==='declared-title'&&sessionContext.treeActionPlans().inlineEditForAction?.(renameAction.action)?.field!=='title')throw new Error('The saved action does not declare an inline title edit.');
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  sessionContext.schemaStructureDialogState=null;sessionContext.schemaAuthoringDialogState=null;
  if(sessionContext.settingsTable&&sessionContext.$('#settings-view'))sessionContext.$('#settings-view').append(sessionContext.settingsTable);
  sessionContext.treeRename=null;sessionContext.treeRenameCommit=null;
  sessionContext.resetSchemaAuthoringEditors();
  if(source.path!==sessionContext.openedDocumentPath()){
    const parts=source.path.split('/'),file=parts.pop();await sessionContext.openModel(parts.join('/')||'.',file,{discardConfirmed:true,force:true,restorePreview:false});
  }
  sessionContext.model=sessionContext.cloneJson(source.model);sessionContext.loadedModelSnapshot=source.loadedSnapshot;sessionContext.loadedModelContentHash=source.contentHash;
  sessionContext.modelRepairErrors=sessionContext.validateFullMetaModelStructure(sessionContext.model);sessionContext.modelRepairMode=sessionContext.modelRepairErrors.length>0;
  sessionContext.selectedPath=value.selection?.path??null;sessionContext.selectedCollection=value.selection?.collection??null;sessionContext.selectedLabel=value.selection?.label||'';sessionContext.selectedSchemaProjection=value.selection?.projection??null;
  sessionContext.reactTreeState=sessionContext.createTreeViewState(value.tree?.view);sessionContext.treeRootCollapsedState.clear();sessionContext.treeSectionCollapsedState.clear();
  for(const [key,entry] of value.tree?.rootCollapsed||[])sessionContext.treeRootCollapsedState.set(key,Boolean(entry));
  for(const [key,entry] of value.tree?.sections||[])sessionContext.treeSectionCollapsedState.set(key,Boolean(entry));
  sessionContext.graphicsControlState.clear();for(const [key,entry] of value.graphics?.controls||[])sessionContext.graphicsControlState.set(key,entry);
  if(value.graphics?.camera)sessionContext.camera={...sessionContext.camera,...value.graphics.camera};
  sessionContext.restoredOperationView=value.operation?{...value.operation,label:`Restored snapshot · ${value.operation.label||'Operation'}`,cancellable:false}:null;
  sessionContext.lastNativeOperation=value.nativeOperation?{...sessionContext.cloneJson(value.nativeOperation),restored:true}:null;
  sessionContext.settingsDraft=undefined;sessionContext.settingsDraftDirty=false;
  sessionContext.renderModel();
  const restoredBeforeDrafts=new Set();
  for(const state of value.dialogs||[]){const controller=sessionContext.schemaDialogControllers?.[state.toolId];if(controller?.restoreBeforeDrafts){await controller.restore(state.privateState);restoredBeforeDrafts.add(state.toolId);}}
  if(restoredScene?.kind==='layered'&&!restoredScene.onSelect)sessionContext.showGeometryView({...restoredScene,id:value.graphics.sceneId});
  sessionContext.rawFieldDrafts.clear();for(const [key,draft] of value.drafts?.fields||[])sessionContext.rawFieldDrafts.set(key,sessionContext.cloneJson(draft));
  sessionContext.settingsDraft=value.drafts?.settingsPresent?sessionContext.cloneJson(value.drafts.settings):undefined;sessionContext.settingsDraftDirty=Boolean(value.drafts?.settingsDirty);
  if(sessionContext.selectedPath&&sessionContext.hasSettingsDraft())sessionContext.renderSelectedItemSettings(sessionContext.selectedLabel,sessionContext.selectedPath);
  if(value.designers){
    for(const [name,prefix] of [['annotation','schemaAnnotation'],['ui','schemaUi'],['choice','schemaChoice']]){const saved=value.designers[name];if(saved?.key){sessionContext[prefix+'State']=saved.state===undefined?null:sessionContext.cloneJson(saved.state);sessionContext[prefix+'Key']=saved.key;sessionContext[prefix+'Changed']=saved.changed===true;}}
    const graphics=value.designers.graphics;if(graphics?.draft){sessionContext.schemaGraphicsEditor?.restore(graphics.draft);sessionContext.schemaGraphicsChanged=graphics.changed===true;}
    const global=value.designers.global;if(global?.state)sessionContext.schemaGlobalUiEditor?.restoreState(global.state);else if(global?.draft)sessionContext.schemaGlobalUiEditor?.restore(global.draft);
    // Annotation factories consume their raw snapshots through their normal mount path.
    if(['annotation','ui','choice'].some(key=>value.designers[key]?.key))sessionContext.renderSettingsTable();
    const savedInline=value.designers.inline?.state;
    if(savedInline){const target=savedInline.target,index=(sessionContext.schemaUiAnnotationEditorEntries||[]).findIndex(record=>(record.entry.file||null)===target.file&&JSON.stringify(record.entry.path||null)===JSON.stringify(target.path)&&record.entry.propertyName===target.propertyName),record=sessionContext.schemaUiAnnotationEditorEntries?.[index];
      if(!record||JSON.stringify(record.entry.schema)!==JSON.stringify(savedInline.sourceSchema))throw new Error('The saved inline UI declaration is unavailable or changed.');
      const trigger=sessionContext.settingsTable.querySelector(`[data-schema-ui-annotation-editor="${index}"]`);
      sessionContext.schemaUiAnnotationEditor.open(record.entry,record.host,trigger,record.titleHost);sessionContext.schemaUiAnnotationEditor.restore(savedInline);}
  }
  sessionContext.lastValidatedModelSnapshot=value.validation?.snapshot??null;sessionContext.lastValidationSummary=value.validation?.summary||'';sessionContext.lastDocumentValidation=value.validation?.document??null;
  const skipPrivateInlineControl=node=>Boolean(value.designers?.inline?.state&&node.closest?.('[data-inline-ui-editor]'));
  if(value.drafts?.surface)await sessionContext.restoreEditorPanelState(sessionContext.settingsSurfaceContent,value.drafts.surface,{skipControl:skipPrivateInlineControl});
  // Restoring Settings controls can run their normal input handlers and refresh the
  // JSON editor buffer. Restore the independent raw JSON draft after those handlers.
  sessionContext.fullJson.value=value.drafts?.json??JSON.stringify(sessionContext.model,null,2);sessionContext.jsonDraftDirty=Boolean(value.drafts?.jsonDirty);sessionContext.currentTab=value.drafts?.tab||'settings';
  sessionContext.$('#resolved-values').textContent=value.validation?.resolved||'';sessionContext.renderOperationProgress();sessionContext.updateModelPathDisplay();sessionContext.updateModelEditState();sessionContext.syncModelActionAvailability();sessionContext.drawPreview();
  for(const state of value.dialogs||[]){
    const controller=sessionContext.schemaDialogControllers?.[state.toolId];
    if(!restoredBeforeDrafts.has(state.toolId)){if(coreSchemaDialogIds.includes(state.toolId))await controller.restore(state.privateState);
      else{await sessionContext.openSchemaAuthoringTool(state.toolId,state.path||[]);if(state.privateState)await controller.restore(state.privateState);}}
    const dialog=controller?.dialog||[...document.querySelectorAll('dialog[open]')].at(-1);
    if(dialog)await sessionContext.restoreEditorDialogState(dialog,state,{restoreControls:!state.privateState||controller?.restoreControls===true,skipControl:skipPrivateInlineControl});
    if(controller?.afterRestore){await controller.afterRestore();if(dialog)await sessionContext.restoreEditorDialogState(dialog,state,{restoreControls:false});}
  }
  if(value.tree?.rename){const saved=value.tree.rename,action=saved.sourceAction;
    const started=action.kind==='name'?sessionContext.startRenameTreeItem(action.path):sessionContext.startDeclaredTreeInlineEdit(action.action,{itemPath:action.path,schemaProjection:action.projection||null},{field:'title'});
    if(started===false||!sessionContext.treeRename||!sessionContext.treeRenameCommit)throw new Error('The saved tree rename action is unavailable.');
    sessionContext.treeRename={...sessionContext.treeRename,value:saved.value,error:saved.error||''};sessionContext.renderTree();sessionContext.updateModelEditState();}
  if(value.files!==undefined)await sessionContext.restoreFilePresentation(value.files);
  if(value.workspaceLayout!==undefined)sessionContext.workspaceLayout.restore(value.workspaceLayout);
  if(value.standardMenus!==undefined)await sessionContext.standardMenus.restore(value.standardMenus);
  if(!(value.dialogs||[]).length&&!value.files?.dialog?.open&&!value.files?.picker?.open&&!value.standardMenus?.help?.open)sessionContext.restoreEditorFocus(sessionContext.container,value.focus);sessionContext.setStatus(`Restored editor state · ${sessionContext.editorDebug.serviceMode} services.`);
}

function inspectEditor(sessionContext){
  const path=sessionContext.selectedPath||[],schema=sessionContext.resolveModelEditorSchema(sessionContext.modelEditorSchemaForPath(sessionContext.model,path))||{};
  return sessionContext.editorJson({contract:'fullmeta-editor-debug/1',revision:sessionContext.commandSession?.revision??0,serviceMode:sessionContext.editorDebug?.serviceMode,document:{path:sessionContext.openedDocumentPath(),schemaPath:sessionContext.activeApplicationPackage?.schemaPath,applicationId:sessionContext.activeApplicationPackage?.id},
    selection:{path:sessionContext.selectedPath,label:sessionContext.selectedLabel,projection:sessionContext.selectedSchemaProjection},tree:sessionContext.reactTreeProjection,
    settings:sessionContext.projectSettingsFields(schema,sessionContext.settingsDraft??sessionContext.valueAt(path),{path}),surface:sessionContext.inspectEditorSurface(sessionContext.container),
    dialogs:[...document.querySelectorAll('dialog[open]')].map(dialog=>({toolId:dialog.dataset.authoringTool,id:dialog.id,surface:sessionContext.inspectEditorSurface(dialog)})),
    validation:sessionContext.lastDocumentValidation?{...sessionContext.lastDocumentValidation,current:!sessionContext.settingsDraftDirty&&!sessionContext.jsonDraftDirty&&!sessionContext.treeRename&&sessionContext.sameJsonModel(sessionContext.model,sessionContext.lastDocumentValidation.snapshot)}:null,operation:sessionContext.operationProgress.current()||sessionContext.restoredOperationView,files:inspectEditorFiles(sessionContext),workspaceLayout:sessionContext.workspaceLayout?.inspect?.()||null,standardMenus:sessionContext.standardMenus?.inspect?.()||null,
    transactions:{settingsDirty:sessionContext.settingsDraftDirty,jsonDirty:sessionContext.jsonDraftDirty,renamePending:Boolean(sessionContext.treeRename),unsaved:sessionContext.hasUnsavedEditorChanges(),busy:sessionContext.operationProgress.isBusy()||Boolean(sessionContext.commandSession?.active)},
    commands:Object.keys(sessionContext.editorCommands),commandSchemas:describeEditorCommands(Object.keys(sessionContext.editorCommands)).map(entry=>describeAdditionalEditorCommands([entry.name])[0]||entry),
    availability:inspectAdditionalEditorAvailability(sessionContext),
    applicationActions:sessionContext.applicationCommands.inspect(),authoringTools:sessionContext.activeApplicationPackage?.kind==='schemaDocument'?sessionContext.schemaAuthoringTools().map(({id,label,group})=>({id,label:label||id,group:group||''})):[],
    nativeOperations:{digest:sessionContext.activeApplicationPackage?.nativeOperationsDigest ?? null,actions:nativeOperationActions(sessionContext),last:sessionContext.lastNativeOperation},
    tools:{contract:fullmetaToolContract,...sessionContext.editorWebMcp?.status()}});
}

function currentDebugDialog(sessionContext){const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(!dialog)throw new Error('Open an authoring dialog first.');return dialog;}

function debugTreeNode(sessionContext, path,nodeId){
  const find=nodes=>{for(const node of nodes||[]){if((nodeId&&node.id===nodeId)||(!nodeId&&Array.isArray(node.path)&&sessionContext.samePath(node.path,path)&&(node.kind!=='group'||node.heading&&Array.isArray(sessionContext.valueAt(node.path)))))return node;const owner=node.owner;if(owner&&((nodeId&&owner.id===nodeId)||(!nodeId&&sessionContext.samePath(owner.path,path))))return owner;const child=find(node.children);if(child)return child;}return null;};
  const visible=find(sessionContext.reactTreeProjection?.nodes);if(visible)return visible;
  const schemaDescriptor=sessionContext.modelEditorSchemaForPath(sessionContext.model,[])?.['x-fullmeta-ui-tree'];
  const descriptor=sessionContext.activeApplicationPackage?.treeDescriptorForModel?.(sessionContext.model,schemaDescriptor)||schemaDescriptor;
  return find(sessionContext.projectSchemaTree(sessionContext.model,descriptor,{state:sessionContext.createTreeViewState(),schemaForPath:path=>sessionContext.modelEditorSchemaForPath(sessionContext.model,path),resolveSchema:sessionContext.resolveModelEditorSchema,labelFor:sessionContext.referenceItemLabel,collapsedByDefault:false}).nodes);
}

export function refreshEditorTools(sessionContext){
  if(!sessionContext.editorDebug)return;
  sessionContext.editorWebMcp?.dispose();
  const debug=new URL(location.href).searchParams.get('debug')==='1';
  const tools=[...createEditorTools(sessionContext.editorDebug,{commands:Object.keys(sessionContext.editorCommands),debug}),
    ...createNativeOperationTools({actions:()=>nativeOperationActions(sessionContext),dispatch:(command,args)=>sessionContext.editorDebug.dispatch(command,args)})];
  sessionContext.editorWebMcp=registerWebMcpTools({document,navigator,tools,onStatus:status=>{sessionContext.container.dataset.fullmetaWebmcp=status.state;}});
}
function initializeEditorDebug(sessionContext){
  const debug=new URL(location.href).searchParams.get('debug')==='1';
  const rememberFocus=event=>{if(event.target.closest?.('[data-editor-debug]'))return;const dialog=event.target.closest?.('dialog');if(dialog){const focus=sessionContext.captureEditorFocus(dialog);if(focus)sessionContext.lastDialogFocus.set(dialog,focus);}else{const focus=sessionContext.captureEditorFocus(sessionContext.container);if(focus)sessionContext.lastEditorFocus=focus;}};
  sessionContext.listenDocument('focusin',rememberFocus);sessionContext.listenDocument('focusout',rememberFocus);
  sessionContext.listenDocument('pointerdown',()=>rememberFocus({target:document.activeElement}));sessionContext.listenDocument('keydown',rememberFocus);
  sessionContext.listenDocument('selectionchange',()=>rememberFocus({target:document.activeElement}));
  const commands=Object.fromEntries(Object.keys(sessionContext.editorCommands).map(type=>[type,async args=>{const {expectedRevision,...input}=args;return (await sessionContext.commandSession.dispatch(type,input,{expectedRevision})).result;}]));
  sessionContext.editorDebug=sessionContext.createEditorDebugController({snapshot:sessionContext.snapshotEditor,restore:sessionContext.restoreEditor,commands,inspect:sessionContext.inspectEditor,interruptCommands:['operation.cancel'],
    assertIdle({command}={}){if((sessionContext.operationProgress.isBusy()&&command!=='operation.cancel')||sessionContext.modelLoading||sessionContext.modelSaving||sessionContext.modelValidating)throw new Error('Finish the active editor transaction before changing services or replaying commands.');},
    settle:()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),
    capture:async(panel)=>{const node=panel==='canvas'?sessionContext.previewCanvas:panel==='dialog'?document.querySelector('dialog[open]'):panel==='tree'?sessionContext.treeContent:sessionContext.$('.panel.editor');if(!node)return null;const bounds=node.getBoundingClientRect();return {kind:panel==='canvas'?'canvas-png':'visible-panel',panel:panel||'settings',bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},...(panel==='canvas'?{image:sessionContext.previewCanvas.toDataURL('image/png')}:{}),screenshot:'Use the connected visible-browser screenshot tool to capture this panel with browser layout.'};},
    onMode(mode){sessionContext.container.dataset.editorServiceMode=mode;const host=sessionContext.$('#geometry-controls');if(host)host.dataset.serviceMode=mode;}});
  refreshEditorTools(sessionContext);
  sessionContext.resources.add(()=>sessionContext.editorWebMcp?.dispose());
  if(!debug)return;
  window.fullmetaDebug=sessionContext.editorDebug;
  let bridge=null,bridgeDisposed=false;
  sessionContext.resources.add(()=>{bridgeDisposed=true;bridge?.dispose();});
  void fetch('/platform/ui/frontend-build.json',{cache:'no-store'}).then(response=>response.json()).then(manifest=>{
    if(bridgeDisposed)return;
    sessionContext.editorDebugPanel?.revision((manifest.lastGoodRevision||manifest.revision||'Unknown').slice(0,12));
    bridge=connectEditorDebugBridge(sessionContext.editorDebug,{window,revision:manifest.lastGoodRevision||manifest.revision,onStatus:message=>sessionContext.editorDebugPanel?.status(message)});
  }).catch(error=>sessionContext.editorDebugPanel?.status(`Local command bridge unavailable: ${error.message}`));
  const watchKey='fullmeta.editor.watch-enabled.v1';
  sessionContext.editorDebugPanel=sessionContext.mountEditorDebugPanel(sessionContext.container,sessionContext.editorDebug,{onWatch:enabled=>{sessionStorage.setItem(watchKey,String(enabled));sessionContext.editorWatch?.setEnabled(enabled);}});
  sessionContext.editorWatch=sessionContext.installEditorWatch(sessionContext.editorDebug,{window,canReload:()=>!sessionContext.operationProgress.isBusy()&&!sessionContext.modelLoading&&!sessionContext.modelSaving&&!sessionContext.modelValidating,onStatus:message=>sessionContext.editorDebugPanel.status(message)});
  const enabled=sessionStorage.getItem(watchKey)==='true';sessionContext.editorWatch.setEnabled(enabled);
  const checkbox=sessionContext.container.querySelector('[aria-label="Enable watch and fixture replay"]');if(checkbox)checkbox.checked=enabled;
}

export function createController(context){return {
    editorDialogSnapshot: (...args) => editorDialogSnapshot(context, ...args),
    snapshotEditor: (...args) => snapshotEditor(context, ...args),
    restoreEditor: (...args) => restoreEditor(context, ...args),
    inspectEditor: (...args) => inspectEditor(context, ...args),
    currentDebugDialog: (...args) => currentDebugDialog(context, ...args),
    debugTreeNode: (...args) => debugTreeNode(context, ...args),
    initializeEditorDebug: (...args) => initializeEditorDebug(context, ...args),
};}
