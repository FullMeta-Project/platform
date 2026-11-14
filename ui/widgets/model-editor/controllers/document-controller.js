/** document controller; explicit live session dependencies. */
import {renderNewModelChoices,renderMatchingModels} from './document-views.js';
import {runNativeOperation} from './native-operation-controller.js';
import {documentFileController} from './document-files.js';
function openedDocumentPath(sessionContext){
  return sessionContext.loadedModelFile ? [sessionContext.loadedModelFolder==='.'?'':sessionContext.loadedModelFolder,sessionContext.loadedModelFile].filter(Boolean).join('/') : sessionContext.activeApplicationPackage?.schemaPath;
}

function declaredActionEndpoint(sessionContext, name){
  const endpoint=sessionContext.activeApplicationPackage?.editorApi?.[name]||sessionContext.sharedEditorApi[name];
  if(typeof endpoint!=='string'||!endpoint)throw new Error(`The active application does not declare the ${name} action endpoint.`);
  const url=new URL(endpoint,location.origin);
  if(sessionContext.activeApplicationPackage?.id)url.searchParams.set('application',sessionContext.activeApplicationPackage.id);
  if(sessionContext.activeApplicationPackage?.schemaPath)url.searchParams.set('schema',sessionContext.activeApplicationPackage.schemaPath);
  return `${url.pathname}${url.search}`;
}

function actionEndpoint(sessionContext, execution,key){
  const name=execution?.api?.[key];
  if(typeof name!=='string'||!name)throw new Error(`The action does not declare its ${key} API binding.`);
  return sessionContext.declaredActionEndpoint(name);
}

function resolveActionInputs(sessionContext, sources){
  const values={
    'document.model':()=>sessionContext.model,
    'document.folder':()=>sessionContext.loadedModelFolder,
    'document.file':()=>sessionContext.loadedModelFile,
    'application.runsDirectory':()=>sessionContext.activeApplicationPackage?.modelSchema?.['x-fullmeta-runtime']?.storage?.runsDirectory,
    'selection.path':()=>sessionContext.selectedPath?.slice()||null,
    'graphics.componentId':()=>sessionContext.activeComponentId(),
  };
  return Object.fromEntries(Object.entries(sources).map(([name,source])=>{
    const read=values[source];
    if(!read)throw new Error(`The action input ${name} has an unknown source: ${source}.`);
    return[name,read()];
  }));
}

function validateFullMetaModel(sessionContext, value){return sessionContext.applicationSchemaApi()?.validateFullMetaModel(value)||[]}

function validateFullMetaModelStructure(sessionContext, value){return sessionContext.applicationSchemaApi()?.validateFullMetaModelStructure(value)||[]}

function validateFullMetaModelWithRules(sessionContext, value){return sessionContext.applicationSchemaApi()?.validateFullMetaModelWithRules(value)||[]}

function createEditorActionServices(sessionContext){
  return {
    nativeOperation:(execution,readInputs,invocation)=>runNativeOperation(sessionContext,execution,readInputs,invocation),
    validate:sessionContext.validateCurrentModel,
    resolveInputs:sessionContext.resolveActionInputs,
    model:{exists:()=>Boolean(sessionContext.model),valueAtRole:sessionContext.modelValueAtRole,selectionHasRole:(role,path)=>sessionContext.hasEditorRole(role,path)},
    document:{
      isFilename:sessionContext.isModelDocumentFilename,isLoaded:sessionContext.currentSelectionIsLoaded,
      saving:()=>sessionContext.modelSaving,loading:()=>sessionContext.modelLoading,snapshot:()=>sessionContext.loadedModelSnapshot,
      hasUnsavedChanges:sessionContext.hasUnsavedEditorChanges,save:sessionContext.saveModel,
    },
    draft:{commit:sessionContext.commitVisibleEditorState,settingsDirty:()=>sessionContext.settingsDraftDirty,jsonDirty:()=>sessionContext.jsonDraftDirty},
    validation:{
      structure:sessionContext.validateFullMetaModelStructure,model:sessionContext.validateFullMetaModel,
      setRepairErrors(errors){sessionContext.modelRepairErrors=errors;sessionContext.modelRepairMode=errors.length>0;},
      invalidate(){sessionContext.lastValidatedModelSnapshot=null;},renderRepairMode: sessionContext.renderRepairMode,record:sessionContext.recordModelValidation,
    },
    operation:{
      busy:()=>sessionContext.operationProgress.isBusy(),busyWithDocument:()=>sessionContext.operationProgress.isBusy()||sessionContext.modelSaving||sessionContext.modelLoading,
      active:()=>sessionContext.operationProgress.active(),idFor:sessionContext.operationIdFor,createId:sessionContext.createOperationId,
      start:sessionContext.startOperationKind,finish:sessionContext.finishOperationKind,stopRequested:sessionContext.operationStopRequested,
      beginProgress:sessionContext.beginOperationProgress,updateProgress:sessionContext.updateOperationProgress,
      finishProgress:sessionContext.finishOperationProgress,clearProgress:sessionContext.clearOperationProgress,
      finishCancelable:sessionContext.finishCancelableOperation,
    },
    network:{compatible:()=>sessionContext.serverCompatibility==='compatible',requestJson: sessionContext.requestJson,endpoint:sessionContext.declaredActionEndpoint,actionEndpoint: sessionContext.actionEndpoint},
    ui:{
      copy:sessionContext.modelEditorWorkflowCopy,workflow:sessionContext.editorWorkflow,setStatus: sessionContext.setStatus,
      updateWorkflowPanels: sessionContext.updateWorkflowPanels,updateActionAvailability:sessionContext.syncModelActionAvailability,
      updateBuildButtons: sessionContext.updateBuildButtons,setResultSaveBusy:sessionContext.setResultActionSaveBusy,
    },
    preview:{
      updateStatus:sessionContext.updatePreviewRunbar,parse:sessionContext.activeApplicationPackage?.parsePreview,parseMesh:sessionContext.activeApplicationPackage?.parsePreview,
      setGeometry(name){sessionContext.compiledGeo=name;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;sessionContext.drawPreview();},
      show(mesh,componentId,modelSnapshot){sessionContext.previewMesh=mesh;sessionContext.previewMeshComponentId=componentId;sessionContext.previewMeshModelSnapshot=JSON.stringify(modelSnapshot);sessionContext.enablePreviewLayer();sessionContext.drawPreview();},
      clear(){sessionContext.compiledGeo=null;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;sessionContext.drawPreview();},
      reportSummary:sessionContext.previewReportSummary,reportTooltip:sessionContext.previewReportTooltip,
    },
    result:{
      confirmClear:sessionContext.confirmClearProjectRunResults,
      setClearing(value){sessionContext.clearResultsBusy=value;sessionContext.syncModelActionAvailability();},
      setCleanupBusy(value){sessionContext.clearResultsBusy=value;sessionContext.syncModelActionAvailability();},
      runsDirectory:()=>sessionContext.fullmetaRunsDirectory,
      storageDirectory:(name)=>sessionContext.activeApplicationPackage?.projectStorage?.[name],
      invalidateCurrent(){if(sessionContext.fieldPlotState)sessionContext.fieldPlotState={...sessionContext.fieldPlotState,isCurrent:false};},
      reloadActive:async()=>{if(sessionContext.activeResultActionId){const action=(sessionContext.modelValueAtRole('result')||[]).find(item=>item.id===sessionContext.activeResultActionId);if(action)await sessionContext.loadResultAction(action)}},
    },
  };
}

function startOperationKind(sessionContext, kind,id){sessionContext.operationKinds.set(kind,{id,stopRequested:false})}

function finishOperationKind(sessionContext, kind,id){if(sessionContext.operationKinds.get(kind)?.id===id)sessionContext.operationKinds.delete(kind)}

function operationIdFor(sessionContext, kind){return sessionContext.operationKinds.get(kind)?.id||null}

function operationStopRequested(sessionContext, kind){return sessionContext.operationKinds.get(kind)?.stopRequested||false}

function recordModelValidation(sessionContext, errors,{serverValidated=false}={}){
  sessionContext.lastValidatedModelSnapshot=sessionContext.model&&serverValidated?JSON.stringify(sessionContext.model):null;
  sessionContext.lastValidationSummary=errors.length?`Model has ${errors.length} issue(s):\n${errors.join('\n')}`:serverValidated?'Model validation passed.':'Model JSON structure checked. Select Validate for model validation.';
  if(serverValidated)sessionContext.lastDocumentValidation={snapshot:JSON.stringify(sessionContext.model),errors:errors.length,summary:sessionContext.lastValidationSummary,error:false};
  sessionContext.$('#resolved-values').textContent=sessionContext.lastValidationSummary;
}

function stableJsonString(sessionContext, value){
  if(value===undefined)return 'null';
  if(Array.isArray(value))return `[${value.map(sessionContext.stableJsonString).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).filter((key)=>value[key]!==undefined).sort().map((key)=>`${JSON.stringify(key)}:${sessionContext.stableJsonString(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sameJsonModel(sessionContext, left,right){
  try{
    const leftValue=typeof left==='string'?JSON.parse(left):left,rightValue=typeof right==='string'?JSON.parse(right):right;
    return sessionContext.stableJsonString(leftValue)===sessionContext.stableJsonString(rightValue);
  }catch{return false;}
}

function updateSelectionActionVisibility(sessionContext){
  for(const button of document.querySelectorAll('[data-model-editor-selection-action]'))button.classList.add('hidden');
  if(sessionContext.currentTab!=='settings'||!sessionContext.selectedPath)return;
  const selected=sessionContext.selectedDocumentValue();
  for(const binding of sessionContext.activeApplicationPackage?.actionBindings||[]){
    if(!binding.when||!sessionContext.modelEditorSelectionMatches(binding.when,sessionContext.selectedPath,selected))continue;
    const button=sessionContext.$(binding.selector);if(button){button.textContent=binding.label;button.classList.remove('hidden');}
  }
}

function isModelDocumentFilename(sessionContext, value){return typeof value==='string'&&value.length<=255&&/\.json$/i.test(value)&&!/[\\/<>:"|?*\u0000-\u001f]/.test(value);}

function currentJsonDraftIsInvalid(sessionContext){
  if(sessionContext.currentTab!=='json'||!sessionContext.jsonDraftDirty)return false;
  try{return sessionContext.validateFullMetaModel(JSON.parse(sessionContext.fullJson.value)).length>0;}catch{return true;}
}

function hasUnsavedEditorChanges(sessionContext){
  if(!sessionContext.model)return false;
  const modelChanged=sessionContext.loadedModelSnapshot!==null&&!sessionContext.sameJsonModel(sessionContext.model,sessionContext.loadedModelSnapshot);
  const settingsChanged=sessionContext.currentTab==='settings'&&sessionContext.settingsDraftDirty;
  const jsonChanged=sessionContext.jsonDraftDirty;
  return modelChanged||settingsChanged||jsonChanged||Boolean(sessionContext.treeRename);
}

function updateModelEditState(sessionContext){
  const indicator=sessionContext.$('#model-edit-state');if(!indicator)return;
  const schemaDocument=sessionContext.activeApplicationPackage?.kind==='schemaDocument';
  indicator.hidden=schemaDocument||!sessionContext.hasUnsavedEditorChanges();
  indicator.title=indicator.hidden?'':'Save to keep the current edits.';
  const workflow=sessionContext.$('#schema-authoring-workflow');
  if(workflow){
    workflow.hidden=!Boolean(sessionContext.model);
    sessionContext.$('#schema-authoring-save-state').hidden=!schemaDocument;
    sessionContext.$('#schema-authoring-validation-state').hidden=!schemaDocument;
    if(schemaDocument){
      const state=sessionContext.schemaAuthoringWorkflowState({dirty:sessionContext.hasUnsavedEditorChanges(),jsonDirty:sessionContext.jsonDraftDirty,
        settingsDirty:sessionContext.settingsDraftDirty,renamePending:Boolean(sessionContext.treeRename),saving:sessionContext.modelSaving,validating:sessionContext.modelValidating,
        validation:sessionContext.lastDocumentValidation?{...sessionContext.lastDocumentValidation,current:sessionContext.sameJsonModel(sessionContext.model,sessionContext.lastDocumentValidation.snapshot)}:null});
      const save=sessionContext.$('#schema-authoring-save-state'),validation=sessionContext.$('#schema-authoring-validation-state');
      if(save.textContent!==state.save)save.textContent=state.save;
      if(validation.textContent!==state.validation)validation.textContent=state.validation;
      validation.title=state.detail;validation.dataset.state=state.kind;
    }
  }
  if(sessionContext.model&&sessionContext.lastValidatedModelSnapshot!==null){
    const resolvedValues=sessionContext.$('#resolved-values');
    const current=!sessionContext.jsonDraftDirty&&!sessionContext.settingsDraftDirty&&!sessionContext.treeRename&&sessionContext.sameJsonModel(sessionContext.model,sessionContext.lastValidatedModelSnapshot);
    if(resolvedValues)resolvedValues.textContent=current?sessionContext.lastValidationSummary:'Model changed since the last validation. Select Validate to refresh model checks.';
  }
  if(sessionContext.settingsSurface)sessionContext.settingsSurface.update({title:sessionContext.$('#selection-title')?.textContent||'Settings',titleId:'selection-title',content:sessionContext.settingsSurfaceContent,
    state:{draft:sessionContext.settingsDraftDirty||sessionContext.jsonDraftDirty?'pending':sessionContext.hasUnsavedEditorChanges()?'unsaved':'saved'}});
}

function requestUnsavedChangesChoice(sessionContext, message){
  const dialog=sessionContext.$('#unsaved-changes-dialog'),saveButton=sessionContext.$('#unsaved-save'),discardButton=sessionContext.$('#unsaved-discard'),cancelButton=sessionContext.$('#unsaved-cancel');
  sessionContext.$('#unsaved-changes-message').textContent=message;
  return new Promise((resolve)=>{
    let settled=false;
    const finish=(choice)=>{
      if(settled)return;settled=true;
      saveButton.removeEventListener('click',save);discardButton.removeEventListener('click',discard);cancelButton.removeEventListener('click',cancel);dialog.removeEventListener('cancel',onCancel);
      if(dialog.open)dialog.close(choice);
      resolve(choice);
    };
    const save=()=>finish('save'),discard=()=>finish('discard'),cancel=()=>finish('cancel'),onCancel=(event)=>{event.preventDefault();finish('cancel')};
    saveButton.addEventListener('click',save);discardButton.addEventListener('click',discard);cancelButton.addEventListener('click',cancel);dialog.addEventListener('cancel',onCancel);
    dialog.showModal();saveButton.focus();
  });
}

async function confirmModelSwitch(sessionContext, targetFolder,targetFile,{reloading=false}={}){
  if(!sessionContext.model||(!reloading&&sessionContext.loadedModelFolder===targetFolder&&sessionContext.loadedModelFile===targetFile)||!sessionContext.hasUnsavedEditorChanges())return true;
  const label=sessionContext.model.metadata?.name||sessionContext.loadedModelFile||'the open model';
  const action=reloading?'reload':'open';
  const choice=await sessionContext.requestUnsavedChangesChoice(`Save changes to ${label} before you ${action} ${targetFile} from ${targetFolder}?`);
  if(choice==='discard')return true;
  if(choice==='save'){
    try{await sessionContext.saveModel({allowSelectionMismatch:true});return true}
    catch(error){sessionContext.syncModelActionAvailability();sessionContext.setStatus(`Could not save ${label}; the model switch was canceled. ${error.message}`,'error');return false;}
  }
  sessionContext.syncModelActionAvailability();sessionContext.setStatus('Model switch canceled. The open model and its edits are still here.');return false;
}

function applyFullJsonDraft(sessionContext, {force=false}={}){
  if(sessionContext.currentTab!=='json'||(!force&&!sessionContext.jsonDraftDirty))return false;
  const next=JSON.parse(sessionContext.fullJson.value);
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'){
    sessionContext.assertDeclarativeDocument(next);
    const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,next);
    if(generatedIssue)throw new Error(generatedIssue);
  }
  const structureErrors=sessionContext.validateFullMetaModelStructure(next);
  if(structureErrors.length){
    sessionContext.$('#resolved-values').textContent=`Model JSON structure has ${structureErrors.length} issue(s):\n${structureErrors.join('\n')}`;
    sessionContext.updateModelEditState();
    throw new Error(`Model JSON structure is invalid: ${structureErrors[0]}`);
  }
  if(sessionContext.model?.metadata?.id&&next.metadata?.id!==sessionContext.model.metadata.id)throw new Error('Model ID is read-only in the editor.');
  if(sessionContext.sameJsonModel(next,sessionContext.model)){sessionContext.jsonDraftDirty=false;sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);sessionContext.updateModelEditState();return false;}
  sessionContext.model=next;sessionContext.modelRepairMode=false;sessionContext.modelRepairErrors=[];sessionContext.selectedSchemaProjection=null;sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;sessionContext.jsonDraftDirty=false;
  sessionContext.invalidatePreviewArtifacts();sessionContext.$('#selection-path').textContent='No item selected';sessionContext.renderModel();sessionContext.showDefaultGraphicsScene();sessionContext.syncModelActionAvailability();
  const validationErrors=sessionContext.validateFullMetaModel(sessionContext.model);
  sessionContext.recordModelValidation(validationErrors);
  if(validationErrors.length){sessionContext.setStatus(`Model needs attention. ${validationErrors[0]}`,'error')}
  else {sessionContext.setStatus(`Model JSON is valid (${sessionContext.model.modelFormat||sessionContext.activeApplicationPackage?.modelSchema?.title||sessionContext.activeApplicationPackage?.id||'project'}).`,'good');}
  return true;
}

function syncModelActionAvailability(sessionContext){
  sessionContext.updateApplySettingsVisibility();
  const loaded=sessionContext.currentSelectionIsLoaded(),busy=sessionContext.operationProgress.isBusy(),switching=sessionContext.modelLoading||sessionContext.modelSaving||sessionContext.newModelCreating,serverReady=sessionContext.serverCompatibility==='compatible';
  const dirty=Boolean(sessionContext.model&&sessionContext.loadedModelSnapshot!==null&&!sessionContext.sameJsonModel(sessionContext.model,sessionContext.loadedModelSnapshot));
  const jsonDraftInvalid=sessionContext.currentJsonDraftIsInvalid(),modelErrors=sessionContext.model?sessionContext.validateFullMetaModel(sessionContext.model):[],modelValid=modelErrors.length===0;
  let pendingSettingsValid=true,pendingSettingsError='';
  if(sessionContext.currentTab==='settings'&&sessionContext.selectedPath&&sessionContext.hasSettingsDraft()&&sessionContext.settingsDraftDirty){try{sessionContext.editorSettingsDraftIsValid(sessionContext.model,sessionContext.selectedPath,sessionContext.settingsDraft)}catch(error){pendingSettingsValid=false;pendingSettingsError=error instanceof Error?error.message:String(error)}}
  const actions=sessionContext.modelEditorAvailability({loaded,dirty,busy,saving:sessionContext.modelSaving,serverReady,repairMode:sessionContext.modelRepairMode,jsonDraftInvalid,modelValid,pendingSettingsValid,pendingSettingsError,pendingSettingsLabel:sessionContext.selectedLabel||'value',renamePending:Boolean(sessionContext.treeRename)});
  const saveButton=sessionContext.$('#save'),saveAsButton=sessionContext.$('#save-as');
  saveAsButton.textContent='Save As…';
  saveButton.disabled=actions.saveDisabled;
  if(actions.saveDisabledReason){saveButton.title=actions.saveDisabledReason;saveButton.setAttribute('aria-description',actions.saveDisabledReason)}else{saveButton.removeAttribute('title');saveButton.removeAttribute('aria-description')}
  const saveAsDisabled=actions.saveAsDisabled||busy||switching;
  const saveAsReason=actions.saveAsDisabledReason||((busy||switching)?'Wait for the current operation or document transition to finish.':'');
  saveAsButton.disabled=saveAsDisabled;saveAsButton.title=saveAsDisabled?saveAsReason:'Save the model JSON under another filename in the same folder.';
  if(saveAsDisabled&&saveAsReason)saveAsButton.setAttribute('aria-description',saveAsReason);else saveAsButton.removeAttribute('aria-description');
  sessionContext.$('#new-model').disabled=busy||switching||Boolean(sessionContext.activeApplicationPackage&&(!serverReady||!sessionContext.activeApplicationPackage.modelEditorUi?.newModel));sessionContext.$('#open-project').disabled=busy||switching;sessionContext.$('#validate').disabled=actions.validateDisabled||sessionContext.modelValidating;
  const hasModelFile=sessionContext.isModelDocumentFilename(sessionContext.loadedModelFile);
  const controlCopy=sessionContext.activeApplicationPackage?.modelEditorUi?.controlCopy||{};
  const applySettingsButton=sessionContext.$('#apply-settings');
  applySettingsButton.disabled=actions.applySettingsDisabled;
  if(actions.applySettingsDisabledReason){
    applySettingsButton.title=actions.applySettingsDisabledReason;applySettingsButton.setAttribute('aria-description',actions.applySettingsDisabledReason);
  }else{applySettingsButton.removeAttribute('title');applySettingsButton.removeAttribute('aria-description')}
  const applicationState=sessionContext.activeApplicationPackage?.actionAvailability?.({
    loaded,busy,saving:sessionContext.modelSaving,switching,serverReady,repairMode:sessionContext.modelRepairMode,
    jsonDraftInvalid,modelValid,pendingSettingsValid,hasModelFile,
    clearBusy:sessionContext.clearResultsBusy,modelErrors,controlCopy,
  })||{};
  for(const binding of sessionContext.activeApplicationPackage?.actionBindings||[]){
    const button=sessionContext.$(binding.selector),state=applicationState.actions?.[binding.id];
    if(!button||!state)continue;
    button.disabled=Boolean(state.disabled)||Boolean(sessionContext.treeRename);
    if(state.title!==undefined)button.title=state.title;
  }
  for(const note of applicationState.notes||[]){
    const element=sessionContext.$(note.selector);if(!element)continue;
    element.hidden=Boolean(note.hidden);element.textContent=note.text||'';
  }
  sessionContext.updateModelEditState();
}

function renderOperationProgress(sessionContext){
  const panel=sessionContext.$('#operation-panel'),bar=sessionContext.$('#operation-progress'),active=sessionContext.operationProgress.active(),operation=sessionContext.operationProgress.current()||sessionContext.restoredOperationView;
  if(!panel||!bar)return;
  if(!operation||operation.state==='idle'){panel.hidden=true;return;}
  const title=sessionContext.$('#operation-progress-title'),message=sessionContext.$('#operation-progress-message'),detail=sessionContext.$('#operation-progress-detail'),fill=sessionContext.$('#operation-progress-fill');
  const count=sessionContext.$('#operation-progress-count'),time=sessionContext.$('#operation-progress-time'),stopButton=sessionContext.$('#stop-operation');
  if(!title||!message||!detail||!fill||!count||!time||!stopButton)return;
  panel.hidden=false;bar.dataset.state=operation.state||'running';
  title.textContent=operation.label||'Operation';message.textContent=operation.message||'Working…';
  detail.textContent=operation.detail||'';detail.title=operation.detailTitle||operation.detail||'';
  const determinate=Number.isFinite(operation.progress);bar.dataset.indeterminate=operation.state==='running'&&!determinate?'true':'false';
  fill.style.width=determinate?`${Math.max(0,Math.min(100,operation.progress))}%`:operation.state==='running'?'':operation.state==='success'?'100%':'0%';
  count.textContent=Number.isInteger(operation.total)&&operation.total>0?`${Math.max(0,Math.min(operation.total,Number(operation.completed)||0))} / ${operation.total}`:'';
  const elapsedEnd=active?Date.now():(operation.finishedAt||Date.now()),seconds=Math.floor(Math.max(0,elapsedEnd-(operation.startedAt||elapsedEnd))/1000);
  time.textContent=`Elapsed ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  stopButton.hidden=!active||!operation.cancellable;stopButton.disabled=Boolean(operation.stopRequested);stopButton.textContent=operation.stopRequested?'Stopping…':'Stop';
}

function beginOperationProgress(sessionContext, operation){
  sessionContext.restoredOperationView=null;
  const started=sessionContext.operationProgress.begin(operation);
  if(!started)throw new Error('Another operation is already running. Wait for it to finish before starting this one.');
  if(sessionContext.operationProgressTimer)clearInterval(sessionContext.operationProgressTimer);
  sessionContext.operationProgressTimer=setInterval(sessionContext.renderOperationProgress,1000);sessionContext.renderOperationProgress();sessionContext.updateBuildButtons();
  return started;
}

function updateOperationProgress(sessionContext, id,changes){
  const updated=sessionContext.operationProgress.update(id,changes);if(!updated)return null;
  sessionContext.renderOperationProgress();return updated;
}

function finishOperationProgress(sessionContext, id,changes={}){
  const active=sessionContext.operationProgress.active();if(active?.id!==id)return null;
  const finalChanges=active.state==='running'?{state:'success',...changes}:changes;
  const finished=sessionContext.operationProgress.finish(id,finalChanges);if(!finished)return null;
  if(sessionContext.operationProgressTimer){clearInterval(sessionContext.operationProgressTimer);sessionContext.operationProgressTimer=null;}
  sessionContext.renderOperationProgress();sessionContext.updateBuildButtons();return finished;
}

function clearOperationProgress(sessionContext, kind=null){
  if(!sessionContext.operationProgress.clear(kind))return false;
  sessionContext.renderOperationProgress();return true;
}

function createOperationId(sessionContext){return globalThis.crypto?.randomUUID?.()||`op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}

async function finishCancelableOperation(sessionContext, operationId){if(!operationId)return;try{await sessionContext.requestJson(sessionContext.editorEndpoint('operationFinish'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationId})})}catch{}}

async function requestOperationStop(sessionContext, operationId,kind){return sessionContext.requestJson(sessionContext.editorEndpoint('operationCancel'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationId,kind})})}

async function stopActiveOperation(sessionContext){
  const active=sessionContext.operationProgress.active(),kind=active?.kind,state=sessionContext.operationKinds.get(kind);
  if(!active?.cancellable||!state||state.id!==active.id||state.stopRequested)return;
  const previousMessage=active.message;
  state.stopRequested=true;
  sessionContext.updateOperationProgress(active.id,{message:sessionContext.modelEditorWorkflowCopy(`${kind}Stopping`)||'Stopping operation…',stopRequested:true});
  try{await sessionContext.requestOperationStop(active.id,kind)}
  catch(error){state.stopRequested=false;sessionContext.updateOperationProgress(active.id,{message:previousMessage||'Operation is running…',stopRequested:false});sessionContext.setStatus(error.message,'error')}
}

function selectedDocumentValue(sessionContext, path=sessionContext.selectedPath){
  return sessionContext.valueAt(path);
}

function modelValueAtRole(sessionContext, role,source=sessionContext.model){return sessionContext.editorRolePath(role).reduce((value,key)=>value?.[key],source);}

function modelComponent(sessionContext, source=sessionContext.model){const path=sessionContext.activeApplicationPackage?.modelEditorUi?.componentPath;return path?.length?path.reduce((value,key)=>value?.[key],source):null;}

function modelEditorCollectionNote(sessionContext, kind){const notes=sessionContext.activeApplicationPackage?.modelEditorUi?.collectionNotes||{};return notes[kind]||notes.default||'';}

function modelEditorWorkflowCopy(sessionContext, key,values={}){const template=sessionContext.activeApplicationPackage?.modelEditorUi?.workflowCopy?.[key]||'';return Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value)),template);}

function modelEditorControlCopy(sessionContext, key,values={}){const template=sessionContext.activeApplicationPackage?.modelEditorUi?.controlCopy?.[key]??sessionContext.sharedControlCopy[key]??'';return Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value)),template);}

function cloneJson(sessionContext, value) { return JSON.parse(JSON.stringify(value)); }

function ensureSelectedResultActionLoad(sessionContext, action){
  const isSweepPlot=sessionContext.isTabularResultAction(action);
  if((!sessionContext.isFieldResultAction(action)&&!isSweepPlot)||sessionContext.jsonDraftDirty)return;
  const alreadyRendered=sessionContext.isFieldResultAction(action)?sessionContext.fieldPlotState?.actionId===action.id:sessionContext.lastSweepRender?.action?.id===action.id;
  const alreadyLoading=sessionContext.activeResultActionId===action.id&&sessionContext.resultActionLoading;
  if(alreadyRendered||alreadyLoading||(sessionContext.isFieldResultAction(action)&&sessionContext.fieldPlotLoadStatus?.actionId===action.id))return;
  queueMicrotask(()=>{
    const selectedAction=sessionContext.isResultPath(sessionContext.selectedPath)?sessionContext.valueAt(sessionContext.selectedPath):null;
    if((!sessionContext.isFieldResultAction(selectedAction)&&!sessionContext.isTabularResultAction(selectedAction))||selectedAction.id!==action.id||sessionContext.jsonDraftDirty)return;
    const selectedAlreadyRendered=sessionContext.isFieldResultAction(selectedAction)?sessionContext.fieldPlotState?.actionId===action.id:sessionContext.lastSweepRender?.action?.id===action.id;
    if(selectedAlreadyRendered||(sessionContext.activeResultActionId===action.id&&sessionContext.resultActionLoading)||(sessionContext.isFieldResultAction(selectedAction)&&sessionContext.fieldPlotLoadStatus?.actionId===action.id))return;
    sessionContext.loadResultAction(selectedAction).catch((error)=>sessionContext.showResultMessage(error.message,'error'));
  });
}

function updateProjectRoutingApplyState(sessionContext){
  const applicationInput=sessionContext.settingsTable.querySelector('[data-project-routing="application"]'),schemaInput=sessionContext.settingsTable.querySelector('[data-project-routing="schema"]'),button=sessionContext.settingsTable.querySelector('[data-project-routing-apply]');
  if(!applicationInput||!schemaInput||!button)return;
  button.disabled=applicationInput.value.trim()===String(sessionContext.model?.application??'')&&schemaInput.value.trim()===String(sessionContext.model?.['x-fullmeta-schema']??'');
}

async function applyProjectRoutingDraft(sessionContext){
  if(!sessionContext.model||!sessionContext.currentSelectionIsLoaded()||sessionContext.activeApplicationPackage?.kind==='schemaDocument'||sessionContext.selectedPath||sessionContext.selectedCollection)throw new Error('Open a project model and select its root overview before editing routing fields.');
  const applicationInput=sessionContext.settingsTable.querySelector('[data-project-routing="application"]'),schemaInput=sessionContext.settingsTable.querySelector('[data-project-routing="schema"]');
  if(!applicationInput||!schemaInput)throw new Error('Project routing fields are not available in this view.');
  const application=applicationInput.value.trim(),schema=schemaInput.value.trim();
  if(!application)throw new Error('Application is required.');
  if(!schema)throw new Error('Schema path is required.');
  if(sessionContext.modelLoading||sessionContext.modelSaving)throw new Error('Wait for the current model operation to finish before changing its routing.');
  const candidate=sessionContext.cloneJson(sessionContext.model);
  candidate.application=application;
  candidate['x-fullmeta-schema']=schema;
  const resourcePath=[...(sessionContext.loadedModelFolder==='.'?[]:sessionContext.loadedModelFolder.split('/')),sessionContext.loadedModelFile].map(encodeURIComponent).join('/');
  sessionContext.modelLoading=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus('Loading and validating the selected application and schema…');
  try{
    const targetPackage=await sessionContext.loadApplicationPackage(application,{model:candidate,modelLocation:new URL(`/${resourcePath}`,location.origin)});
    const prepared=targetPackage.prepareModelForEditor(candidate);
    const errors=targetPackage.modelEditorSchema?.validateFullMetaModel?.(candidate);
    if(!Array.isArray(errors))throw new Error('The selected application does not provide project validation.');
    if(errors.length)throw new Error(`The selected application/schema rejects this project: ${errors[0]}`);
    const nextUiProfile=targetPackage.defaultUiProfile
      ?targetPackage.defaultUiProfile
      :await sessionContext.loadUiProfile(prepared.profile,targetPackage);
    // Switch the active schema/package only after the candidate passes its own validation.
    // The candidate is cloned from the original model, so only the two routing fields change.
    sessionContext.model=candidate;
    sessionContext.activateApplicationPackage(targetPackage);
    sessionContext.activeUiProfile=nextUiProfile;sessionContext.activeScenarioDefinition=prepared.profile;sessionContext.applyUiProfile(sessionContext.activeUiProfile);sessionContext.restorePanelLayout();
    sessionContext.resultTablesByAction.clear();sessionContext.compiledGeo=null;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;
    sessionContext.selectedSchemaProjection=null;sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;sessionContext.jsonDraftDirty=false;
    sessionContext.modelRepairErrors=[];sessionContext.modelRepairMode=false;sessionContext.lastValidatedModelSnapshot=null;
    sessionContext.updateSelectionActionVisibility();sessionContext.updatePreviewRunbar('idle','');sessionContext.updateWorkflowPanels();sessionContext.updateModelPathDisplay();
    sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);sessionContext.renderModel();sessionContext.showDefaultGraphicsScene();sessionContext.recordModelValidation(errors);
    sessionContext.setStatus('Applied routing fields and loaded the selected application/schema. Save to keep this migration.','good');
  }finally{
    sessionContext.modelLoading=false;sessionContext.syncModelActionAvailability();sessionContext.updateModelEditState();
  }
}

function renderModel(sessionContext) {
  if(sessionContext.modelRepairMode){sessionContext.renderRepairMode();return;}
  sessionContext.fullJson.value = JSON.stringify(sessionContext.model, null, 2);sessionContext.jsonDraftDirty=false; sessionContext.renderTree();
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'&&!sessionContext.selectedCollection&&!sessionContext.selectedPath){sessionContext.selectedPath=[];sessionContext.selectedLabel='Document settings';}
  if(sessionContext.selectedCollection){sessionContext.settingsDraftDirty=false;sessionContext.selectedLabel=sessionContext.definitionCollectionLabel(sessionContext.selectedCollection);sessionContext.$('#selection-title').textContent=sessionContext.selectedLabel;sessionContext.$('#selection-path').textContent=`${sessionContext.definitionCollectionPath(sessionContext.selectedCollection).join(' › ')} › ${sessionContext.selectedLabel}`;sessionContext.$('#editor-note').textContent=sessionContext.modelEditorCollectionNote(sessionContext.selectedCollection);sessionContext.renderSettingsTable();}
  else if (sessionContext.selectedPath && sessionContext.selectedDocumentValue() !== undefined) {
    sessionContext.settingsDraft = sessionContext.cloneJson(sessionContext.selectedDocumentValue());sessionContext.settingsDraftDirty=false;
    sessionContext.$('#selection-path').textContent = sessionContext.activeApplicationPackage?.kind==='schemaDocument'
      &&Array.isArray(sessionContext.selectedSchemaProjection?.treeTrail)
      ?sessionContext.selectedSchemaProjection.treeTrail.map(entry=>entry.label).join(' › '):sessionContext.selectedPath.join(' › ');
    sessionContext.renderSettingsTable();
  }
  else { sessionContext.selectedPath = null; sessionContext.settingsDraft = null;sessionContext.settingsDraftDirty=false; sessionContext.renderSettingsTable(); }
  sessionContext.updateSelectionActionVisibility();sessionContext.updateWorkflowPanels();
  if(sessionContext.isResultPath(sessionContext.selectedPath))sessionContext.showGraphicsForSelection(sessionContext.selectedPath,sessionContext.valueAt(sessionContext.selectedPath));
  else sessionContext.drawPreview();
  sessionContext.updateModelEditState();
}

function settingPanelActionTitle(sessionContext, item,path){
  if(!item||!Array.isArray(path))return '';
  const title=sessionContext.modelEditorTitle(sessionContext.activeApplicationPackage?.modelEditorUi,path,item)
    ||sessionContext.treeActionPlans().itemTitle(item,path);
  return typeof title==='string'?title:'';
}

function addActionAvailability(sessionContext, action,target){
  return sessionContext.treeActionAvailability(action,target);
}

async function requestJson(sessionContext,url,options){
  const fixture=await sessionContext.editorDebug?.request(url,options);if(fixture?.handled)return fixture.value;
  const method=String(options?.method||'GET').toUpperCase();
  if(method!=='GET'&&sessionContext.serverCompatibility!=='compatible')throw new Error('The editor has not confirmed that the local server matches this version. Restart the server with npm start, then refresh this page before saving or running operations.');
  const {responseType,...requestOptions}=options||{};
  if(responseType!==undefined&&!['json','text'].includes(responseType))throw new Error('Choose JSON or text response data.');
  const response=await fetch(url,sessionContext.applicationRequestOptions(requestOptions));
  const result=responseType==='text'&&response.ok?await response.text():await response.json();
  if(!response.ok){const error=new Error(result.error||'Request failed ('+response.status+').');Object.assign(error,{apiCode:result.code||result.diagnostics?.[0]?.code||null,diagnostics:result.diagnostics||[],status:response.status});throw error;}
  return result;
}

async function requestResultJson(sessionContext, url,options,description,timeoutMs=30000){
  const fixture=await sessionContext.editorDebug?.request(url,options);if(fixture?.handled)return fixture.value;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const method=String(options?.method||'GET').toUpperCase();
    if(method!=='GET'&&sessionContext.serverCompatibility!=='compatible')throw new Error('The editor has not confirmed that the local server matches this version. Restart the server with npm start, then refresh this page before loading results.');
    const response=await fetch(url,sessionContext.applicationRequestOptions({...options,signal:controller.signal})),result=await response.json();
    if(!response.ok)throw new Error(result.error||`Request failed (${response.status}).`);
    return result;
  }catch(error){
    if(error.name==='AbortError')throw new Error(`${description} timed out after ${Math.round(timeoutMs/1000)} seconds.`);
    throw error;
  }finally{clearTimeout(timer)}
}

async function saveModel(sessionContext, {allowSelectionMismatch=false}={}){
  if(sessionContext.modelSaving)throw new Error(sessionContext.modelEditorWorkflowCopy('saveInProgress')||'A model save is already in progress.');
  if(!sessionContext.model||!sessionContext.loadedModelFolder||!sessionContext.loadedModelFile||(!allowSelectionMismatch&&!sessionContext.currentSelectionIsLoaded()))throw new Error('Open a model before saving its JSON.');
  sessionContext.commitVisibleEditorState();
  const errors=sessionContext.validateFullMetaModel(sessionContext.model);
  if(errors.length)throw new Error(`Model JSON is invalid: ${errors[0]}`);
  const snapshot=sessionContext.createModelSaveSnapshot(sessionContext.model);
  if(sessionContext.loadedModelSnapshot!==null&&sessionContext.sameJsonModel(snapshot.model,sessionContext.loadedModelSnapshot)){
    sessionContext.updateModelPathDisplay();sessionContext.syncModelActionAvailability();
    sessionContext.setStatus('No editor changes to save. The document file was not rewritten.','good');
    return snapshot.model;
  }
  let allowApplicationChange=false;
  try{allowApplicationChange=sessionContext.loadedModelSnapshot!==null&&JSON.parse(sessionContext.loadedModelSnapshot)?.application!==snapshot.model.application;}catch{}
  sessionContext.modelSaving=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus(`Saving ${sessionContext.loadedModelFolder}/${sessionContext.loadedModelFile}…`);
  try{
    const result=sessionContext.activeApplicationPackage?.saveDocument
      ?await sessionContext.activeApplicationPackage.saveDocument({requestJson: sessionContext.requestJson,folder:sessionContext.loadedModelFolder,file:sessionContext.loadedModelFile,value:snapshot.model,expectedHash:sessionContext.loadedModelContentHash,allowApplicationChange})
      :await sessionContext.requestJson(sessionContext.editorEndpoint('save'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({folder:sessionContext.loadedModelFolder,file:sessionContext.loadedModelFile,model:snapshot.model,expectedContentHash:sessionContext.loadedModelContentHash,overwrite:true,allowApplicationChange})});
    sessionContext.loadedModelSnapshot=snapshot.serialized;
    sessionContext.loadedModelContentHash=result.contentHash;
    sessionContext.updateModelPathDisplay();
    const savedPath=sessionContext.activeApplicationPackage?.saveDocument?result.file:`${result.folder}/${result.file}`;
    sessionContext.setStatus(sessionContext.hasUnsavedEditorChanges()?`Saved ${savedPath}. New edits remain unsaved.`:`Saved ${savedPath}.`,'good');
    return snapshot.model;
  }finally{sessionContext.modelSaving=false;sessionContext.syncModelActionAvailability();}
}

function openSaveAsDialog(sessionContext,{restorePresentation=false}={}){
  if(sessionContext.$('#save-as').disabled&&!restorePresentation)return;
  const dialog=sessionContext.$('#save-as-dialog'),nameInput=sessionContext.$('#save-as-name'),message=sessionContext.$('#save-as-status');
  nameInput.value=(sessionContext.loadedModelFile||'model.json').replace(/\.json$/i,'-copy.json');
  sessionContext.$('#save-as-folder-preview').textContent=sessionContext.loadedModelFolder||'.';
  message.hidden=true;message.textContent='';dialog.showModal();nameInput.focus();nameInput.select();
}

async function saveProjectAs(sessionContext){
  if(sessionContext.modelSaving)return;
  if(!sessionContext.model||!sessionContext.loadedModelFolder||!sessionContext.loadedModelFile||!sessionContext.currentSelectionIsLoaded())throw new Error('Open a model before saving a copy.');
  if(sessionContext.operationProgress.isBusy())throw new Error('Wait for the current operation to finish before saving a copy.');
  sessionContext.commitVisibleEditorState();
  if(sessionContext.jsonDraftDirty)sessionContext.applyFullJsonDraft({force:true});
  const errors=sessionContext.validateFullMetaModel(sessionContext.model);
  if(errors.length)throw new Error(`Model JSON is invalid: ${errors[0]}`);
  const targetFile=sessionContext.$('#save-as-name').value.trim();
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i.test(targetFile))throw new Error('Choose a JSON filename using letters, numbers, periods, hyphens, or underscores.');
  const sourceFolder=sessionContext.loadedModelFolder,sourceFile=sessionContext.loadedModelFile;
  const snapshot=sessionContext.createModelSaveSnapshot(sessionContext.model),dialog=sessionContext.$('#save-as-dialog'),confirmButton=sessionContext.$('#save-as-confirm'),message=sessionContext.$('#save-as-status');
  message.hidden=true;message.textContent='';sessionContext.modelSaving=true;confirmButton.disabled=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus(`Saving ${sourceFolder}/${targetFile}…`);
  let result;
  try{
    result=sessionContext.activeApplicationPackage?.saveDocument
      ?await sessionContext.activeApplicationPackage.saveDocument({requestJson: sessionContext.requestJson,folder:sourceFolder,file:sourceFile,value:snapshot.model,expectedHash:sessionContext.loadedModelContentHash,copyName:targetFile})
      :await sessionContext.requestJson(sessionContext.editorEndpoint('saveAs'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({folder:sourceFolder,sourceFile,file:targetFile,model:snapshot.model})});
  }finally{sessionContext.modelSaving=false;confirmButton.disabled=false;sessionContext.syncModelActionAvailability();}
  dialog.close();
  const savedFolder=sessionContext.activeApplicationPackage?.saveDocument?sourceFolder:result.folder;
  const savedFile=sessionContext.activeApplicationPackage?.saveDocument?targetFile:result.file;
  try{await sessionContext.openModel(savedFolder,savedFile,{discardConfirmed:true});}
  catch(error){throw new Error(`The copy was saved at ${savedFolder}/${savedFile}, but could not be opened. ${error.message}`);}
  sessionContext.setStatus(`Saved a JSON copy as ${savedFolder}/${savedFile}.`,'good');
}

async function verifyServerCompatibility(sessionContext){
  const banner=sessionContext.$('#server-compatibility');
  try{
    const infoUrl=new URL(sessionContext.editorEndpoint('info'),location.href);
    infoUrl.searchParams.set('application',sessionContext.activeApplicationPackage.id);
    const response=await fetch(infoUrl,sessionContext.applicationRequestOptions({cache:'no-store'}));
    if(!response.ok)throw new Error(`compatibility endpoint returned ${response.status}`);
    const info=await response.json(),expected=sessionContext.activeApplicationPackage?.runtimeCompatibility?.()||{};
    const labels=Object.fromEntries(Object.entries(sessionContext.activeApplicationPackage?.modelSchema?.['x-fullmeta-runtime']?.compatibility||{}).map(([key,field])=>[key,field.label]));
    const comparison=sessionContext.compareEditorRuntime(expected,info,labels);
    if(comparison.compatible){sessionContext.serverCompatibility='compatible';banner.hidden=true;banner.textContent='';}
    else{
      sessionContext.serverCompatibility='incompatible';
      banner.textContent=sessionContext.modelEditorControlCopy('compatibilityMismatch',{details:sessionContext.describeEditorRuntimeMismatches(comparison.mismatches)});
      banner.hidden=false;
    }
  }catch(error){
    sessionContext.serverCompatibility='incompatible';
    banner.textContent=sessionContext.modelEditorControlCopy('compatibilityFailed',{error:error.message});
    banner.hidden=false;
  }
  sessionContext.syncModelActionAvailability();sessionContext.setResultActionSaveBusy(false);
}

function setResultActionSaveBusy(sessionContext, busy){
  const button=sessionContext.$('#results-toolbar [data-plot-table-save]');if(button)button.disabled=busy||sessionContext.serverCompatibility!=='compatible'||button.dataset.plotTableCanSave!=='true';
}

function updateModelPathDisplay(sessionContext){
  const modelPath=sessionContext.openedDocumentPath()||sessionContext.defaultModelManifestFile;
  sessionContext.projectDisplay.textContent=sessionContext.model?modelPath:'';
  sessionContext.projectDisplay.title=sessionContext.model?modelPath:'';
  if(sessionContext.model)document.title=modelPath;
}

async function openModel(sessionContext, targetFolder,targetFile,{discardConfirmed=false,force=false,restorePreview=true}={}) {
  if(!targetFile)throw new Error('Choose a model file first.');
  if(!force&&sessionContext.model&&sessionContext.loadedModelFolder===targetFolder&&sessionContext.loadedModelFile===targetFile){sessionContext.syncModelActionAvailability();return;}
  if(sessionContext.operationProgress.isBusy())throw new Error('Wait for the current operation to finish before switching models.');
  if(!discardConfirmed&&!await sessionContext.confirmModelSwitch(targetFolder,targetFile))return;
  sessionContext.treeRename=null;sessionContext.treeRenameCommit=null;
  sessionContext.clearOperationProgress();
  const sequence=++sessionContext.modelLoadSequence;sessionContext.modelLoading=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus(`Opening ${targetFolder}/${targetFile}…`);
  try{
    const path=[targetFolder==='.'?'':targetFolder,targetFile].filter(Boolean).join('/');
    const result = sessionContext.initialResult && path===sessionContext.initial.path ? sessionContext.initialResult : await sessionContext.requestJson(`${sessionContext.editorEndpoint('model')}?folder=${encodeURIComponent(targetFolder)}&file=${encodeURIComponent(targetFile)}`, {cache:'no-store'});
    sessionContext.initialResult=null;
    const resolved=await sessionContext.services.resolveEditor(result.model,new URL(path,sessionContext.services.workspaceUrl));
    if(resolved.selection.widget.id!==sessionContext.initial.selection.widget.id){sessionContext.allowConfirmedEditorExit=true;sessionContext.services.navigate(path);return;}
    sessionContext.editorMountOptions=resolved.selection.options;
    if(sequence!==sessionContext.modelLoadSequence)return;
    const resourcePath=[...(targetFolder==='.'?[]:targetFolder.split('/')),targetFile].map(encodeURIComponent).join('/');
    const nextApplicationPackage=await sessionContext.loadApplicationPackage(result.model?.application,{model:result.model,modelLocation:new URL(`/${resourcePath}`,location.origin)});
    if(sequence!==sessionContext.modelLoadSequence)return;
    const prepared=nextApplicationPackage.prepareModelForEditor(result.model);
    const nextUiProfile=nextApplicationPackage.defaultUiProfile
      ?nextApplicationPackage.defaultUiProfile
      :await sessionContext.loadUiProfile(prepared.profile,nextApplicationPackage);
    if(sequence!==sessionContext.modelLoadSequence)return;
    sessionContext.fullJson.setAttribute('aria-hidden','true');sessionContext.fullJson.tabIndex=-1;
    sessionContext.invalidateScanConfirmation?.();
    sessionContext.loadedModelFolder=targetFolder;sessionContext.loadedModelFile=targetFile;sessionContext.modelManifestFile=targetFile;
    sessionContext.activateApplicationPackage(nextApplicationPackage);
    sessionContext.resetPreviewCamera();
    sessionContext.activeUiProfile=nextUiProfile;sessionContext.activeScenarioDefinition=prepared.profile;sessionContext.applyUiProfile(sessionContext.activeUiProfile);sessionContext.restorePanelLayout();
    sessionContext.resultTablesByAction.clear();sessionContext.loadedModelSnapshot=JSON.stringify(result.model);sessionContext.loadedModelContentHash=result.contentHash||null;
    // Raw input belongs to the previous document, even when the next document
    // contains the same selection and field paths. Clear it only after loading
    // and preparing the replacement has succeeded.
    sessionContext.rawFieldDrafts?.clear();
    sessionContext.relatedFieldsDraft=null;sessionContext.relatedFieldsDraftPaths?.clear();
    sessionContext.model=prepared.model;sessionContext.reactTreeState=sessionContext.createTreeViewState();
    sessionContext.modelRepairErrors=sessionContext.validateFullMetaModelStructure(sessionContext.model);sessionContext.modelRepairMode=sessionContext.modelRepairErrors.length>0;
    sessionContext.lastValidatedModelSnapshot=null;sessionContext.lastDocumentValidation=null;sessionContext.compiledGeo=null;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;sessionContext.selectedSchemaProjection=null;sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;sessionContext.jsonDraftDirty=false;sessionContext.resultSelections={};sessionContext.updateSelectionActionVisibility();sessionContext.updatePreviewRunbar('idle','');sessionContext.updateWorkflowPanels();
    sessionContext.updateModelPathDisplay();
    const nextUrl=new URL(location.href);const debugEnabled=nextUrl.searchParams.get('debug');nextUrl.search='';if(debugEnabled==='1')nextUrl.searchParams.set('debug','1');nextUrl.searchParams.set('model',targetFolder==='.'?targetFile:`${targetFolder}/${targetFile}`);history.replaceState(null,'',nextUrl);
    const schemaAuthoringWarnings=(nextApplicationPackage.schemaEditorDiagnostics||[])
      .filter(diagnostic=>diagnostic?.severity==='warning').map(diagnostic=>diagnostic.message).filter(Boolean);
    const schemaAuthoringWarning=schemaAuthoringWarnings.length
      ?` Schema authoring warning: ${schemaAuthoringWarnings.slice(0,2).join(' ')}`:'';
    if(sessionContext.modelRepairMode){sessionContext.renderRepairMode();sessionContext.setStatus(`Opened ${result.file}, but its JSON structure needs repair. ${sessionContext.modelRepairErrors[0]}${schemaAuthoringWarning}`,'error');}
    else{
      sessionContext.renderModel();sessionContext.showDefaultGraphicsScene();
      if(restorePreview&&typeof requestAnimationFrame==='function'){
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          if(sequence===sessionContext.modelLoadSequence&&sessionContext.model===prepared.model
            &&sessionContext.loadedModelFolder===targetFolder&&sessionContext.loadedModelFile===targetFile){
            sessionContext.drawPreview();
          }
        }));
      }
      const validationErrors=sessionContext.validateFullMetaModel(sessionContext.model);
      sessionContext.recordModelValidation(validationErrors);
      if(validationErrors.length){sessionContext.setStatus(`Opened ${result.folder}/${result.file}; model needs attention. ${validationErrors[0]}${schemaAuthoringWarning}`,'error')}
      else {sessionContext.setStatus(`${prepared.appliedDefault?`Opened ${result.folder}/${result.file}; applied the schema default ${prepared.appliedDefault}. Save to store it.`:sessionContext.activeApplicationPackage.kind==='schemaDocument'?`Opened ${result.folder}/${result.file} as a JSON Schema document.`:`Opened ${result.folder}/${result.file} · ${sessionContext.model.modelFormat||nextApplicationPackage.modelSchema?.title||nextApplicationPackage.id}.`}${schemaAuthoringWarning}`,'good');}
      if(!validationErrors.length&&restorePreview)void sessionContext.restoreApplicationPreview(sequence);
    }
  }finally{if(sequence===sessionContext.modelLoadSequence){sessionContext.modelLoading=false;sessionContext.syncModelActionAvailability();}}
}

function updateNewModelFolderPreview(sessionContext){
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'&&!sessionContext.schemaProjectCreation)return;
  const id=sessionContext.$('#new-model-id').value.trim();
  const file=sessionContext.$('#new-model-file');
  if(!file.dataset.userEdited)file.value=id?`${id}.json`:'';
}

async function openNewModelDialog(sessionContext, {fromSchema=false,restorePresentation=false}={}){
  if(sessionContext.$('#new-model').disabled&&!fromSchema&&!restorePresentation)return;
  if(fromSchema&&sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document before creating a project from it.');
  if(fromSchema){const issue=sessionContext.activeApplicationPackage.projectCreationIssue?.(sessionContext.model);if(issue)throw new Error(issue);}
  sessionContext.schemaProjectCreation=fromSchema;
  if(!restorePresentation&&sessionContext.hasUnsavedEditorChanges()){
    const label=sessionContext.model?.metadata?.name||sessionContext.loadedModelFile||'the open model';
    const choice=await sessionContext.requestUnsavedChangesChoice(`Save changes to ${label} before creating a new model?`);
    if(choice==='cancel'){sessionContext.schemaProjectCreation=false;return;}
    if(choice==='save')await sessionContext.saveModel({allowSelectionMismatch:true});
    else if(choice==='discard'&&fromSchema)await sessionContext.openModel(sessionContext.loadedModelFolder,sessionContext.loadedModelFile,{discardConfirmed:true,force:true,restorePreview:false});
  }
  if(!sessionContext.activeApplicationPackage){
    return documentFileController(sessionContext).selectSchema();
  }
  const schemaDocument=sessionContext.activeApplicationPackage.kind==='schemaDocument'&&!fromSchema;
  const schemaProjectConfig=fromSchema
    ?await sessionContext.activeApplicationPackage.schemaProjectConfiguration?.(sessionContext.model)||{choiceConfig:{},choices:[]}
    :null;
  const createsProjectFolder=Boolean(fromSchema&&schemaProjectConfig?.createsProjectFolder);
  const choices=fromSchema?schemaProjectConfig.choices:sessionContext.activeApplicationPackage.newModelChoices?.(sessionContext.model)||sessionContext.modelEditorNewModelChoices(sessionContext.activeApplicationPackage.modelEditorUi,sessionContext.scenarioMetadata.profiles);
  const dialog=sessionContext.$('#new-model-dialog'),form=sessionContext.$('#new-model-form'),choiceSelect=sessionContext.$('#new-model-choice');
  const choiceConfig=fromSchema?schemaProjectConfig.choiceConfig||{}:sessionContext.activeApplicationPackage.modelEditorUi.newModel||{};
  if(choiceConfig.choiceRequestKey&&!choices.length)throw new Error('No choices are available for a new model.');
  sessionContext.$('#new-model-title').textContent=fromSchema?'New project from schema':schemaDocument?'New schema':'New model';
  sessionContext.$('#new-model-id-label').textContent=schemaDocument?'Application ID':createsProjectFolder?'Project ID':'Model ID';
  sessionContext.$('#new-model-id').pattern=schemaDocument?'[a-z][a-z0-9\\-]{0,47}':'[A-Za-z][A-Za-z0-9_]{0,63}';
  sessionContext.$('#new-model-id').maxLength=schemaDocument?48:64;
  sessionContext.$('#new-model-confirm').textContent=fromSchema?'Create project':schemaDocument?'Create schema':'Create model';
  sessionContext.$('#new-model-description').textContent=fromSchema
    ?schemaProjectConfig.description||choiceConfig.description||'Create an empty model initialized from this schema. Required fields, constants, defaults and generated identities are filled automatically.'
    :sessionContext.activeApplicationPackage.modelEditorUi.newModel?.description||'';
  sessionContext.$('#new-model-choice-label').textContent=choiceConfig.choiceLabel||'';
  sessionContext.$('#new-model-choice-row').hidden=!choiceConfig.choiceRequestKey;
  choiceSelect.required=Boolean(choiceConfig.choiceRequestKey);
  for(const id of ['new-model-folder','new-model-file']){
    const control=sessionContext.$(`#${id}`);
    control.parentElement.hidden=createsProjectFolder;
    control.required=!createsProjectFolder;
  }
  form.reset();
  sessionContext.$('#new-model-folder').value=fromSchema
    ?schemaProjectConfig.projectRootFolder||sessionContext.loadedModelFolder||sessionContext.projectRootFolder
    :sessionContext.loadedModelFolder||sessionContext.projectRootFolder;
  sessionContext.$('#new-model-file').dataset.userEdited='';
  if(schemaDocument){
    sessionContext.$('#new-model-id').value=/^[a-z][a-z0-9-]{0,47}$/.test(sessionContext.model?.application||'')?sessionContext.model.application:'';
    sessionContext.$('#new-model-file').value='untitled.schema.json';
    sessionContext.$('#new-model-file').dataset.userEdited='true';
  }
  if(fromSchema){
    sessionContext.$('#new-model-id').value='model';sessionContext.$('#new-model-file').value='model.json';
  }
  renderNewModelChoices(choiceSelect,choices);
  const preferred=fromSchema
    ?schemaProjectConfig.choiceConfig?.scenario?.defaultProfileId
    :sessionContext.activeApplicationPackage?.currentNewModelChoice?.(sessionContext.model)??sessionContext.modelEditorScenarioId(sessionContext.activeApplicationPackage?.modelEditorUi,sessionContext.model);
  if(choices.some(choice=>choice.id===preferred))choiceSelect.value=preferred;
  sessionContext.$('#new-model-status').hidden=true;
  sessionContext.updateNewModelFolderPreview();
  dialog.showModal();
  sessionContext.$('#new-model-id').focus();
}

async function createNewModel(sessionContext, event){
  event?.preventDefault?.();
  const form=sessionContext.$('#new-model-form');
  if(sessionContext.newModelCreating||!form.reportValidity())return;
  const id=sessionContext.$('#new-model-id').value.trim(),choice=sessionContext.$('#new-model-choice').value;
  const folder=sessionContext.$('#new-model-folder').value.trim(),file=sessionContext.$('#new-model-file').value.trim();
  const message=sessionContext.$('#new-model-status'),confirm=sessionContext.$('#new-model-confirm');
  message.hidden=true;
  const creatingSchemaProject=sessionContext.schemaProjectCreation;
  sessionContext.newModelCreating=true;confirm.textContent='Creating…';confirm.disabled=true;sessionContext.$('#new-model-cancel').disabled=true;
  sessionContext.syncModelActionAvailability();
  sessionContext.setStatus(`Creating ${id}…`);
  let created;
  try{
    if(creatingSchemaProject){
      const packageValue=sessionContext.activeApplicationPackage;
      const issue=packageValue.projectCreationIssue?.(sessionContext.model);
      if(issue)throw new Error(issue);
      if(typeof packageValue.createSchemaProject==='function'){
        const result=await packageValue.createSchemaProject({requestJson: sessionContext.requestJson,schemaDocument:sessionContext.model,projectId:id,profileId:choice,folder,file});
        const path=String(result.file||file).split('/');
        created={folder:result.folder||path.slice(0,-1).join('/')||folder||'.',file:path.at(-1)};
      }else{
        const value=await packageValue.createProjectDocument({schemaDocument:sessionContext.model,projectId:id,profileId:choice,folder,file});
        const result=await packageValue.createDocument({requestJson: sessionContext.requestJson,endpoint:'/api/program/document/create',folder,file,value});
        const path=result.file.split('/');created={folder:path.slice(0,-1).join('/')||'.',file:path.at(-1)};
      }
    }else if(sessionContext.activeApplicationPackage.kind==='schemaDocument'){
      const newModelApi=sessionContext.activeApplicationPackage.modelEditorUi.newModel?.api;
      const newModelEndpoint=newModelApi?sessionContext.activeApplicationPackage.editorApi?.[newModelApi]:sessionContext.activeApplicationPackage.modelEditorUi.newModel?.endpoint;
      if(!newModelEndpoint)throw new Error('The schema editor does not register its New-schema API.');
      if(typeof sessionContext.activeApplicationPackage.createModelDocument!=='function')throw new Error('The schema editor cannot prepare a new schema document.');
      const value=sessionContext.activeApplicationPackage.createModelDocument({application:id,folder,file});
      const result=await sessionContext.activeApplicationPackage.createDocument({requestJson: sessionContext.requestJson,endpoint:newModelEndpoint,folder,file,value});
      const path=result.file.split('/');
      created={folder:path.slice(0,-1).join('/')||'.',file:path.at(-1)};
    }else{
      const newModelApi=sessionContext.activeApplicationPackage.modelEditorUi.newModel?.api;
      const newModelEndpoint=newModelApi?sessionContext.activeApplicationPackage.editorApi?.[newModelApi]:sessionContext.activeApplicationPackage.modelEditorUi.newModel?.endpoint;
      if(!newModelEndpoint)throw new Error('The model schema does not register its New-model API.');
      if(typeof sessionContext.activeApplicationPackage.createModelDocument!=='function')throw new Error('The application package cannot prepare a new model document.');
      const model=sessionContext.activeApplicationPackage.createModelDocument({modelId:id,profileId:choice,folder});
      if(sessionContext.activeApplicationPackage.kind==='schemaProject'){
        const result=await sessionContext.activeApplicationPackage.createDocument({requestJson: sessionContext.requestJson,endpoint:newModelEndpoint,folder,file,value:model});
        const path=result.file.split('/');created={folder:path.slice(0,-1).join('/')||'.',file:path.at(-1)};
      }else created=await sessionContext.requestJson(newModelEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({modelId:id,folder,file,model})});
    }
    await sessionContext.openModel(created.folder,created.file,{discardConfirmed:true});
    sessionContext.$('#new-model-dialog').close();
    const schemaWarnings=(sessionContext.activeApplicationPackage.schemaEditorDiagnostics||[])
      .filter(diagnostic=>diagnostic?.severity==='warning').map(diagnostic=>diagnostic.message).filter(Boolean);
    const schemaWarning=schemaWarnings.length?` Schema authoring warning: ${schemaWarnings.slice(0,2).join(' ')}`:'';
    sessionContext.setStatus(`Created and opened ${created.folder}/${created.file}.${schemaWarning}`,'good');
  }catch(error){
    const detail=created?`Created ${created.folder}/${created.file}, but could not open it. ${error.message}`:error.message;
    message.textContent=detail;message.hidden=false;
    sessionContext.setStatus(`Could not create and open the ${creatingSchemaProject?'project':sessionContext.activeApplicationPackage.kind==='schemaDocument'?'schema':'model'}. ${detail}`,'error');
  }finally{
    sessionContext.newModelCreating=false;
    if(!sessionContext.$('#new-model-dialog').open)sessionContext.schemaProjectCreation=false;
    confirm.textContent=creatingSchemaProject?'Create project':sessionContext.activeApplicationPackage.kind==='schemaDocument'?'Create schema':'Create model';confirm.disabled=false;sessionContext.$('#new-model-cancel').disabled=false;
    sessionContext.syncModelActionAvailability();
  }
}

function chooseNativeModel(sessionContext,options={}){return documentFileController(sessionContext).openModelPicker(options);}

function chooseMatchingModel(sessionContext, matches){
  const dialog=sessionContext.$('#model-match-dialog'),list=sessionContext.$('#model-match-list');
  let selected=null;
  renderMatchingModels(list,matches,match=>{selected=match;dialog.close('selected');});
  return new Promise(resolve=>{
    dialog.addEventListener('close',()=>resolve(selected),{once:true});
    dialog.showModal();
    list.querySelector('button')?.focus();
  });
}

async function openNativeModel(sessionContext, selectedFile){
  if(sessionContext.operationProgress.isBusy()||sessionContext.modelLoading||sessionContext.modelSaving)throw new Error('Wait for the current operation to finish before opening another model.');
  const bytes=await selectedFile.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
  const sha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  if(sessionContext.editorDebug?.serviceMode==='fixture')throw new Error('Fixture mode blocks native file matching. Choose live services explicitly to open a native file.');
  const response=await fetch('/api/program/schema-match',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:selectedFile.name,sha256})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Could not locate the selected JSON file.');
  if(!result.files?.length)throw new Error('Choose a JSON file already inside the FullMeta workspace or one of its subfolders.');
  const match=result.files.length===1?result.files[0]:await sessionContext.chooseMatchingModel(result.files);
  if(!match)return;
  const parts=match.split('/'),file=parts.pop(),folder=parts.join('/')||'.';
  await sessionContext.openModel(folder,file);
}

async function validateCurrentModel(sessionContext, readInputs,execution) {
  if(sessionContext.modelValidating)return;
  let validationSubmittedSnapshot=null;
  try {
    if(sessionContext.currentTab==='json')sessionContext.applyFullJsonDraft();
    else sessionContext.commitVisibleEditorState();
    if(sessionContext.activeApplicationPackage?.validateDocument){
      const submitted=sessionContext.cloneJson(sessionContext.model);
      validationSubmittedSnapshot=JSON.stringify(submitted);
      sessionContext.modelValidating=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus('Validating the JSON document…');
      const errors=await sessionContext.activeApplicationPackage.validateDocument({value:submitted,validate:sessionContext.validateFullMetaModel});
      if(!sessionContext.sameJsonModel(sessionContext.model,submitted)||sessionContext.jsonDraftDirty||sessionContext.settingsDraftDirty)return;
      sessionContext.recordModelValidation(errors,{serverValidated:true});
      sessionContext.setStatus(errors.length?`JSON document has ${errors.length} issue(s). ${errors[0]}`:'JSON document validation passed.',errors.length?'error':'good');
      return;
    }
    const inputs=readInputs();
    const submitted=JSON.parse(JSON.stringify(inputs.model));
    validationSubmittedSnapshot=JSON.stringify(submitted);
    const submittedFolder=inputs.folder,submittedFile=inputs.file;
    sessionContext.modelValidating=true;sessionContext.syncModelActionAvailability();sessionContext.setStatus(sessionContext.modelEditorControlCopy('validationStart'));
    const command=execution?.command;
    if(!command?.registryId||!command?.entry||command.stdin!=='document.model'||!Array.isArray(command.args))throw new Error('The validation action has no complete schema-declared command contract.');
    const args=command.args.map(argument=>typeof argument==='string'?argument:typeof argument?.value==='string'?argument.value:null);
    if(args.some(argument=>argument===null))throw new Error('The validation command contains an unresolved argument binding.');
    const commandResult=await sessionContext.requestJson(sessionContext.declaredActionEndpoint('kernelCommandRun'),{
      method:'POST',headers:{'content-type':'application/json'},
      documentContext:Boolean(sessionContext.loadedModelFile),
      body:JSON.stringify({registryId:command.registryId,entry:command.entry,args,cwd:command.cwd||'.',stdin:JSON.stringify(submitted),expectedOutputs:command.expectedOutputs||[]}),
    });
    let result;
    try{result=JSON.parse(commandResult.stdout)}catch{
      const detail=commandResult.stderr?.trim()||`The native validator returned no JSON report (exit code ${commandResult.exitCode??'unknown'}).`;
      throw new Error(detail);
    }
    if(result?.schema!=='fullmeta-model-validation/1'||typeof result.valid!=='boolean'||!Array.isArray(result.errors)||!Array.isArray(result.structureErrors)){
      throw new Error('The native validator returned an incomplete fullmeta-model-validation/1 report.');
    }
    if(Boolean(commandResult.success)!==result.valid)throw new Error('The native validator exit status does not match its validation report.');
    if(sessionContext.loadedModelFolder!==submittedFolder||sessionContext.loadedModelFile!==submittedFile)return;
    if(!sessionContext.sameJsonModel(sessionContext.model,submitted)||sessionContext.jsonDraftDirty||sessionContext.settingsDraftDirty){
      sessionContext.lastValidatedModelSnapshot=null;
      sessionContext.$('#resolved-values').textContent=sessionContext.modelEditorControlCopy('validationChanged');
      sessionContext.setStatus(sessionContext.modelEditorControlCopy('validationChanged'));
      return;
    }
    const wasRepairMode=sessionContext.modelRepairMode;
    sessionContext.modelRepairErrors = result.structureErrors||[];
    sessionContext.modelRepairMode = sessionContext.modelRepairErrors.length > 0;
    const validationErrors=[...result.errors];
    let resolvedParameters=null;
    if(!result.errors.some(error=>!String(error).startsWith('Project identity:'))){
      try{resolvedParameters=sessionContext.applicationSchemaApi()?.resolvedParametersForModel?.(submitted)??null;}
      catch(error){validationErrors.push(`Parameter resolution: ${error.message||String(error)}`);}
    }
    sessionContext.syncModelActionAvailability();
    if (sessionContext.modelRepairMode) {
      sessionContext.lastValidatedModelSnapshot=null;
      sessionContext.renderRepairMode();
      sessionContext.setStatus(`Model JSON structure is invalid: ${sessionContext.modelRepairErrors[0]}`, 'error');
    } else {
      sessionContext.recordModelValidation(validationErrors,{serverValidated:true});
      if(wasRepairMode)sessionContext.renderModel();
      if(validationErrors.length){sessionContext.setStatus(`Model needs attention. ${validationErrors[0]}`,'error')}
      else {
        if(resolvedParameters){
          const values=Object.entries(resolvedParameters).map(([symbol,value])=>`${symbol} = ${value}`);
          const summary=sessionContext.modelEditorControlCopy('validationSummary');
          sessionContext.lastValidationSummary=values.length?`${summary}\n${values.join('\n')}`:summary;
          sessionContext.$('#resolved-values').textContent=sessionContext.lastValidationSummary;
        }
        sessionContext.setStatus(sessionContext.modelEditorControlCopy('validationPassed',{modelFormat:sessionContext.model.modelFormat}), 'good');
      }
    }
  } catch (e) {
    sessionContext.lastValidatedModelSnapshot=null;
    sessionContext.lastDocumentValidation={snapshot:validationSubmittedSnapshot,errors:0,error:true,summary:e.message};
    sessionContext.$('#resolved-values').textContent=sessionContext.modelEditorControlCopy('validationIncomplete',{error:e.message});
    sessionContext.setStatus(sessionContext.modelEditorControlCopy('validationFailed',{error:e.message}), 'error');
  } finally {
    sessionContext.modelValidating=false;sessionContext.syncModelActionAvailability();
  }
}

function confirmClearProjectRunResults(sessionContext, projectId,projectFolder,copyKey='clearResults'){
  const dialog=sessionContext.applicationExtension('clearResults');
  const copy=sessionContext.activeApplicationPackage?.modelEditorUi?.confirmations?.[copyKey];
  if(!dialog)throw new Error('The Clear results confirmation dialog is not mounted for this application.');
  const title=dialog.querySelector('#clear-results-title');
  const description=dialog.querySelector('#clear-results-description');
  const confirmButton=dialog.querySelector('#confirm-clear-results');
  const path=dialog.querySelector('#clear-results-path');
  if(!title||!description||!confirmButton||!path)throw new Error('The Clear results confirmation dialog is missing required content.');
  title.textContent=copy?.title||'';
  description.textContent=(copy?.description||'').replaceAll('{project}',projectId);
  confirmButton.textContent=copy?.confirmLabel||'';
  path.textContent=`${projectFolder}/${sessionContext.fullmetaRunsDirectory}`;
  dialog.returnValue='';
  return new Promise((resolve)=>{
    dialog.addEventListener('close',()=>resolve(dialog.returnValue==='clear'),{once:true});
    dialog.showModal();
    dialog.querySelector('#cancel-clear-results')?.focus();
  });
}

function editorJson(sessionContext, value){return value===undefined?null:JSON.parse(JSON.stringify(value));}

export function createController(context){return {
    openedDocumentPath: (...args) => openedDocumentPath(context, ...args),
    declaredActionEndpoint: (...args) => declaredActionEndpoint(context, ...args),
    actionEndpoint: (...args) => actionEndpoint(context, ...args),
    resolveActionInputs: (...args) => resolveActionInputs(context, ...args),
    validateFullMetaModel: (...args) => validateFullMetaModel(context, ...args),
    validateFullMetaModelStructure: (...args) => validateFullMetaModelStructure(context, ...args),
    validateFullMetaModelWithRules: (...args) => validateFullMetaModelWithRules(context, ...args),
    createEditorActionServices: (...args) => createEditorActionServices(context, ...args),
    startOperationKind: (...args) => startOperationKind(context, ...args),
    finishOperationKind: (...args) => finishOperationKind(context, ...args),
    operationIdFor: (...args) => operationIdFor(context, ...args),
    operationStopRequested: (...args) => operationStopRequested(context, ...args),
    recordModelValidation: (...args) => recordModelValidation(context, ...args),
    stableJsonString: (...args) => stableJsonString(context, ...args),
    sameJsonModel: (...args) => sameJsonModel(context, ...args),
    updateSelectionActionVisibility: (...args) => updateSelectionActionVisibility(context, ...args),
    isModelDocumentFilename: (...args) => isModelDocumentFilename(context, ...args),
    currentJsonDraftIsInvalid: (...args) => currentJsonDraftIsInvalid(context, ...args),
    hasUnsavedEditorChanges: (...args) => hasUnsavedEditorChanges(context, ...args),
    updateModelEditState: (...args) => updateModelEditState(context, ...args),
    requestUnsavedChangesChoice: (...args) => requestUnsavedChangesChoice(context, ...args),
    confirmModelSwitch: (...args) => confirmModelSwitch(context, ...args),
    applyFullJsonDraft: (...args) => applyFullJsonDraft(context, ...args),
    syncModelActionAvailability: (...args) => syncModelActionAvailability(context, ...args),
    renderOperationProgress: (...args) => renderOperationProgress(context, ...args),
    beginOperationProgress: (...args) => beginOperationProgress(context, ...args),
    updateOperationProgress: (...args) => updateOperationProgress(context, ...args),
    finishOperationProgress: (...args) => finishOperationProgress(context, ...args),
    clearOperationProgress: (...args) => clearOperationProgress(context, ...args),
    createOperationId: (...args) => createOperationId(context, ...args),
    finishCancelableOperation: (...args) => finishCancelableOperation(context, ...args),
    requestOperationStop: (...args) => requestOperationStop(context, ...args),
    stopActiveOperation: (...args) => stopActiveOperation(context, ...args),
    selectedDocumentValue: (...args) => selectedDocumentValue(context, ...args),
    modelValueAtRole: (...args) => modelValueAtRole(context, ...args),
    modelComponent: (...args) => modelComponent(context, ...args),
    modelEditorCollectionNote: (...args) => modelEditorCollectionNote(context, ...args),
    modelEditorWorkflowCopy: (...args) => modelEditorWorkflowCopy(context, ...args),
    modelEditorControlCopy: (...args) => modelEditorControlCopy(context, ...args),
    cloneJson: (...args) => cloneJson(context, ...args),
    ensureSelectedResultActionLoad: (...args) => ensureSelectedResultActionLoad(context, ...args),
    updateProjectRoutingApplyState: (...args) => updateProjectRoutingApplyState(context, ...args),
    applyProjectRoutingDraft: (...args) => applyProjectRoutingDraft(context, ...args),
    renderModel: (...args) => renderModel(context, ...args),
    settingPanelActionTitle: (...args) => settingPanelActionTitle(context, ...args),
    addActionAvailability: (...args) => addActionAvailability(context, ...args),
    requestJson: (...args) => requestJson(context, ...args),
    requestResultJson: (...args) => requestResultJson(context, ...args),
    saveModel: (...args) => saveModel(context, ...args),
    openSaveAsDialog: (...args) => openSaveAsDialog(context, ...args),
    saveProjectAs: (...args) => saveProjectAs(context, ...args),
    verifyServerCompatibility: (...args) => verifyServerCompatibility(context, ...args),
    setResultActionSaveBusy: (...args) => setResultActionSaveBusy(context, ...args),
    updateModelPathDisplay: (...args) => updateModelPathDisplay(context, ...args),
    openModel: (...args) => openModel(context, ...args),
    updateNewModelFolderPreview: (...args) => updateNewModelFolderPreview(context, ...args),
    openNewModelDialog: (...args) => openNewModelDialog(context, ...args),
    createNewModel: (...args) => createNewModel(context, ...args),
    chooseNativeModel: (...args) => chooseNativeModel(context, ...args),
    chooseMatchingModel: (...args) => chooseMatchingModel(context, ...args),
    openNativeModel: (...args) => openNativeModel(context, ...args),
    validateCurrentModel: (...args) => validateCurrentModel(context, ...args),
    confirmClearProjectRunResults: (...args) => confirmClearProjectRunResults(context, ...args),
    editorJson: (...args) => editorJson(context, ...args),
};}
