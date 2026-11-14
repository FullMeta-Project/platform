import { mountWidget as mountPlotTable } from '../../plot-table/widget.js';
import { drawLayeredScene, drawSceneView } from '../../scene-view/widget.js';
import { graphicsWidgetForLayer } from '../../graphics-console/widget.js';
const presentationMounts = new WeakMap();
export function disposeGraphicsViews(sessionContext){ const state=presentationMounts.get(sessionContext);state?.mount?.dispose();presentationMounts.delete(sessionContext); }
export function registerGraphicsView(sessionContext,host,mount,kind){presentationMounts.set(sessionContext,{host,mount,kind,saveStatus:''});}
export function captureDocumentActionIdentity(sessionContext,model=sessionContext.model){return {model,sequence:sessionContext.modelLoadSequence,folder:sessionContext.loadedModelFolder,file:sessionContext.loadedModelFile};}
export function isCurrentDocumentAction(sessionContext,identity){return sessionContext.model===identity.model&&sessionContext.modelLoadSequence===identity.sequence&&sessionContext.loadedModelFolder===identity.folder&&sessionContext.loadedModelFile===identity.file;}
export function createDocumentBoundPlotTableCallback(sessionContext,identity,callback){return (...args)=>isCurrentDocumentAction(sessionContext,identity)?callback(...args):false;}
/** graphics controller; explicit live session dependencies. */
function fieldPointLabel(sessionContext, state,action=state?.action){return sessionContext.applicationResultAdapter().pointLabel(state,{formatFrequency:(frequency)=>sessionContext.formatFieldFrequency(frequency,sessionContext.model,action)})}

function resetPreviewCamera(sessionContext){sessionContext.camera={yaw:.68,pitch:-.42,zoom:1,panX:0,panY:0}}

async function previewSchemaAuthoringOperation(sessionContext){
  const state=sessionContext.schemaAuthoringDialogState;if(!state)return;
  const status=sessionContext.$('#schema-authoring-status');
  const source=sessionContext.model,base=JSON.stringify(sessionContext.model);
  try{
    if((sessionContext.$('#schema-authoring-target-path')?.value.trim()||'')!==state.appliedTargetPath){
      sessionContext.selectSchemaAuthoringTargetPath();
      throw new Error('Target changed. Choose the operation for this target, then preview it.');
    }
    const target=state.target;
    const inspecting=sessionContext.$('#schema-authoring-operation').value==='inspect-existing-structure';
    const input=inspecting?{operation:'edit-existing-structure',edits:sessionContext.schemaInspectionEdits()}:sessionContext.schemaAuthoringFormInput();
    const operationInput=input.operation==='project-integration'
      ?{...input,schemaPath:sessionContext.openedDocumentPath()||sessionContext.activeApplicationPackage?.rootDocumentFile||''}
      :input;
    const result=inspecting
      ?sessionContext.schemaWithEditedStructureFields(sessionContext.model,target.itemPath||[],input.edits)
      :sessionContext.schemaWithAuthoringOperation(sessionContext.model,target.itemPath||[],{
        ...operationInput,binding:target.schemaProjection?.binding||[],
      });
    const errors=sessionContext.validateFullMetaModelWithRules(result.document);
    if(errors.length)throw new Error(`The generated schema is not ready to apply: ${errors[0]}`);
    const widgetCatalog=input.operation==='project-integration'
      ?await sessionContext.loadWidgetCatalogs({schema:result.document,schemaUrl:new URL(operationInput.schemaPath,new URL("../../../../",import.meta.url))})
      :null;
    if(sessionContext.schemaAuthoringDialogState!==state||sessionContext.model!==source||JSON.stringify(sessionContext.model)!==base)throw new Error('The schema changed while preparing this preview. Preview again.');
    sessionContext.$('#schema-authoring-tree').textContent=sessionContext.schemaAuthoringTreePreview(result.document);
    sessionContext.$('#schema-authoring-code').textContent=sessionContext.schemaAuthoringRelevantCode(result);
    sessionContext.$('#schema-authoring-full-code').textContent='';
    const tableOperation=sessionContext.$('#schema-authoring-inputs .schema-authoring-table-wrap')?.getClientRects().length>0;
    sessionContext.$('#schema-authoring-code-detail').open=!tableOperation;
    sessionContext.$('#schema-authoring-tree-detail').open=false;
    sessionContext.$('#schema-authoring-full-code-detail').open=false;
    sessionContext.$('#schema-authoring-preview-summary').textContent=result.sourceSummary
      ||'Preview ready. Expand generated code or project tree if needed.';
    sessionContext.$('#schema-authoring-preview').hidden=false;
    sessionContext.$('#schema-authoring-apply').disabled=false;
    status.hidden=true;
    state.preview={input:operationInput,base,result,widgetCatalog};
  }catch(error){
    state.preview=null;sessionContext.$('#schema-authoring-preview').hidden=true;sessionContext.$('#schema-authoring-apply').disabled=true;
    status.textContent=error.message;status.hidden=false;
  }
}

function previewReportSummary(sessionContext, report){return sessionContext.activeApplicationPackage?.previewReportSummary?.(report,sessionContext.activeApplicationPackage.modelEditorUi,sessionContext.activeScenarioDimension())||''}

function previewReportTooltip(sessionContext, report){return sessionContext.activeApplicationPackage?.previewReportTooltip?.(report,sessionContext.activeApplicationPackage.modelEditorUi,sessionContext.activeScenarioDimension(),sessionContext.activeUiProfile)||''}

function isResultPath(sessionContext, path) { return sessionContext.hasEditorRole('result',path); }

function formatFieldFrequency(sessionContext, frequencyGHz,modelValue=sessionContext.model,action=null){return sessionContext.activeApplicationPackage.resultFields.formatFieldFrequency(frequencyGHz,modelValue,action,sessionContext.activeUiProfile?.behavior?.fieldResults?.frequencyUnit,{currentModel:sessionContext.model,fieldPlotState: sessionContext.fieldPlotState})}

function resultViewForAction(sessionContext, action){
  if(!action)return null;
  const scene=sessionContext.graphicsResultScene(action);
  return scene?.onSelect?sessionContext.resolveResultView({scene,widgets:sessionContext.activeApplicationGraphicsWidgets,dimension:sessionContext.activeScenarioDimension(),selectedTabId:sessionContext.sweepViewModes[action.id]}):null;
}

function isFieldResultAction(sessionContext, action){return sessionContext.resultViewForAction(action)?.isSpatial===true}

function isTabularResultAction(sessionContext, action){return sessionContext.resultViewForAction(action)?.layout==='tabs'}

function graphicsProfile(sessionContext){return sessionContext.activeApplicationPackage?.graphicsConsole?.presentation||sessionContext.activeUiProfile?.behavior?.graphics||{}}

function graphicsSceneForPath(sessionContext, path,value){
  return sessionContext.graphicsSceneForSelection(sessionContext.activeApplicationPackage?.graphicsConsole,{
    path:path||[],types:value?.type?[value.type]:[],dimension:sessionContext.activeScenarioDimension(),value,
  });
}

function graphicsResultScene(sessionContext, action){return sessionContext.graphicsSceneForPath([...sessionContext.editorRolePath('result'),0],action).scene}

function graphicsSceneInputsFor(sessionContext, scene,{draftSelected=false}={}){
  return sessionContext.graphicsSceneInputs(scene,{
    model: sessionContext.model,selected:sessionContext.selectedPath?(draftSelected&&sessionContext.hasSettingsDraft()?sessionContext.settingsDraft:sessionContext.selectedDocumentValue()):null,
    runtime:{previewMesh: sessionContext.previewMesh,fieldPlotState: sessionContext.fieldPlotState,resultEntries:sessionContext.lastSweepRender?.entries},view:{camera: sessionContext.camera,selectedPath: sessionContext.selectedPath},
  });
}

function graphicsVisibility(sessionContext, key){
  const scene=sessionContext.activeApplicationPackage?.graphicsConsole?.scenes?.[sessionContext.activeGraphicsSceneId];
  const layer=sessionContext.graphicsLayerForRole(scene,key);
  return layer?layer.control?sessionContext.graphicsControlState.get(layer.control)??sessionContext.$(`[data-graphics-visibility="${layer.control}"]`)?.checked??Boolean(layer.defaultVisible):layer.defaultVisible!==false:false;
}

function showGraphicsForSelection(sessionContext, path,item,{defaultScene=false}={}){
  const selectedScene=sessionContext.graphicsSceneForPath(path,item).scene;
  const useDefaultScene=defaultScene&&!selectedScene?.onSelect;
  const scene=useDefaultScene?sessionContext.graphicsSceneForPath([],null).scene:selectedScene;
  if(!scene?.onSelect){
    if(scene?.kind==='layered')sessionContext.showGeometryView(scene);
    else sessionContext.showResultMessage('The selected Graphics scene needs a selection action.','error');
    return;
  }
  const action=sessionContext.activeSelectionActions[scene.onSelect];
  if(typeof action!=='function'){sessionContext.showResultMessage(`The active application has no Graphics selection action ${scene.onSelect}.`,'error');return;}
  try{Promise.resolve(action(useDefaultScene?null:item,useDefaultScene?[]:path,scene)).catch(error=>sessionContext.showResultMessage(error.message,'error'))}
  catch(error){sessionContext.showResultMessage(error.message,'error')}
}

function showResultMessage(sessionContext, message,kind='') {
  disposeGraphicsViews(sessionContext);
  sessionContext.lastSweepRender=null;
  sessionContext.$('#geometry-view').hidden=true;sessionContext.$('#geometry-note').hidden=true;sessionContext.$('#geometry-controls').hidden=true;sessionContext.$('#results-view').hidden=false;sessionContext.$('#results-note').hidden=true;
  sessionContext.$('#result-chart').hidden=true;sessionContext.$('#result-legend').replaceChildren();sessionContext.$('#results-toolbar').replaceChildren();
  const notice=sessionContext.$('#result-message');notice.hidden=false;notice.textContent=message;notice.className=`result-message${kind==='error'?' error':''}`;sessionContext.$('#preview-summary').textContent=kind==='error'?'Result unavailable':'Loading result…';
}

function showResultSurface(sessionContext, action) {
  disposeGraphicsViews(sessionContext);
  const view=sessionContext.resultViewForAction(action);
  if(!view)throw new Error('The selected result has no declared Graphics view.');
  sessionContext.configureGraphicsWidget(view.contentWidgetId,view.scene);sessionContext.$('#results-toolbar').replaceChildren();sessionContext.$('#result-chart').hidden=true;sessionContext.$('#result-legend').hidden=true;sessionContext.$('#result-legend').replaceChildren();sessionContext.$('#result-message').hidden=false;sessionContext.$('#result-message').textContent='';
  sessionContext.showResultViewSurface({view,spatialHost:sessionContext.$('#geometry-view'),tabsHost:sessionContext.$('#results-view'),spatialNote:sessionContext.$('#geometry-note'),tabsNote:sessionContext.$('#results-note')});
  if(view.isSpatial){sessionContext.lastSweepRender=null;sessionContext.fieldPlotState=null;sessionContext.$('#geometry-note').textContent=sessionContext.profileCopy('resultFieldOverlayNote','The field overlay follows this structural view. Drag to rotate · wheel to zoom · the Graphics orientation stays shared.');sessionContext.$('#preview-summary').textContent=sessionContext.profileCopyFormat('fieldResolving',{action:action.name},`Resolving ${action.name}…`);sessionContext.renderFieldSettings();return}
  sessionContext.$('#preview-summary').textContent=action.name;sessionContext.$('#results-note').textContent=sessionContext.profileCopy('resultFreshnessNote','Refresh this result after changing model inputs.');
}

async function loadResultAction(sessionContext, action){
  if(!action)return;sessionContext.activeResultActionId=action.id;sessionContext.resultActionLoading=true;if(sessionContext.isFieldResultAction(action)){if(sessionContext.fieldPlotState?.actionId===action.id)sessionContext.fieldPlotState={...sessionContext.fieldPlotState,isCurrent:false};sessionContext.fieldPlotLoadStatus={actionId:action.id,message:sessionContext.modelEditorWorkflowCopy('fieldRunResolving')}}sessionContext.setResultActionSaveBusy(true);const sequence=++sessionContext.resultRenderSequence;sessionContext.showResultSurface(action);if(!sessionContext.isFieldResultAction(action)){sessionContext.$('#result-message').hidden=false;sessionContext.$('#result-message').textContent='Resolving result inputs…'}sessionContext.$('#result-chart').hidden=true;sessionContext.$('#results-toolbar').replaceChildren();
  try{
    const selection=sessionContext.activeApplicationPackage.resultPresentation.selectionForAction({action,model: sessionContext.model,stored:sessionContext.resultSelections[action.id]});
    const resolveBody=sessionContext.activeApplicationPackage.resultPresentation.resolveBody({
      folder:sessionContext.loadedModelFolder,file:sessionContext.loadedModelFile,model: sessionContext.model,action,selection,
    });
    const resolved=await sessionContext.requestResultJson(sessionContext.editorEndpoint('resultResolve'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(resolveBody)},`Resolving ${action.name||'result'} data`);
    if(sequence!==sessionContext.resultRenderSequence)return;
    if(sessionContext.isFieldResultAction(action)){
      const fieldPlan=sessionContext.activeApplicationPackage.resultPresentation.fieldResolution({action,resolved,missingMessage:sessionContext.modelEditorWorkflowCopy('fieldRunMissing')});
      if(fieldPlan.error)throw new Error(fieldPlan.error);
      if(fieldPlan.tables.length)sessionContext.resultTablesByAction.set(action.id,fieldPlan.tables);
      if(fieldPlan.selectionError){
        if(sessionContext.isResultPath(sessionContext.selectedPath)&&sessionContext.valueAt(sessionContext.selectedPath)?.id===action.id)sessionContext.renderSettingsTable();
        throw new Error(fieldPlan.selectionError);
      }
      const loadingMessage=(stage)=>sessionContext.activeApplicationPackage.resultPresentation.fieldLoadingMessage(stage,sessionContext.profileCopy);
      sessionContext.$('#preview-summary').textContent=loadingMessage('fetch');sessionContext.fieldPlotLoadStatus={actionId:action.id,message:loadingMessage('artifact')};sessionContext.renderFieldSettings();
      const raw=await sessionContext.requestResultJson(fieldPlan.artifactUrl,{cache:'no-store'},loadingMessage('artifact'),120000);if(sequence!==sessionContext.resultRenderSequence)return;
      sessionContext.fieldPlotLoadStatus={actionId:action.id,message:loadingMessage('parse')};sessionContext.renderFieldSettings();
      const resolvedAction=(sessionContext.modelValueAtRole('result')||[]).find((entry)=>entry.id===action.id)||action;
      sessionContext.fieldPlotLoadStatus={actionId:action.id,message:loadingMessage('plot')};sessionContext.renderFieldSettings();
      sessionContext.fieldPlotState=sessionContext.activeApplicationPackage.resultPresentation.prepareField({
        raw,resolved,action,resolvedAction,model: sessionContext.model,dimension:sessionContext.activeScenarioDimension(),
      });
      sessionContext.resultSelections[action.id]=sessionContext.activeApplicationPackage.resultPresentation.selectionAfterLoad({stored:sessionContext.resultSelections[action.id],resolved,state:sessionContext.fieldPlotState});
      sessionContext.resultActionLoading=false;sessionContext.fieldPlotLoadStatus=null;sessionContext.renderFieldSettings();
      if(sessionContext.isResultPath(sessionContext.selectedPath)&&sessionContext.valueAt(sessionContext.selectedPath)?.id===action.id)sessionContext.renderSettingsTable();
      sessionContext.$('#preview-summary').textContent=sessionContext.activeApplicationPackage.resultPresentation.fieldPlotSummary({state:sessionContext.fieldPlotState,action,copy:sessionContext.modelEditorWorkflowCopy,pointLabel:sessionContext.fieldPointLabel});
      sessionContext.showResultViewSurface({view:sessionContext.resultViewForAction(action),spatialHost:sessionContext.$('#geometry-view'),tabsHost:sessionContext.$('#results-view'),spatialNote:sessionContext.$('#geometry-note'),tabsNote:sessionContext.$('#results-note')});sessionContext.$('#result-message').hidden=true;sessionContext.drawPreview();return;
    }
    const entries=[];
    for(const originalDataset of resolved.datasets||[]){
      if(originalDataset.missing){entries.push({dataset:originalDataset,missing:originalDataset.message});continue;}
      try{
        entries.push(await sessionContext.activeApplicationPackage.resultPresentation.prepareDataset(originalDataset,action,sessionContext.model));
      }catch(error){entries.push({dataset:error.dataset||originalDataset,missing:error.message});}
    }
    if(sequence!==sessionContext.resultRenderSequence)return;
    sessionContext.resultTablesByAction.set(action.id,entries.filter((entry)=>entry.table).map((entry)=>entry.table));
    sessionContext.resultActionLoading=false;sessionContext.drawSweepResult(action,entries,sessionContext.model);
    if(sessionContext.isResultPath(sessionContext.selectedPath)&&sessionContext.valueAt(sessionContext.selectedPath)?.id===action.id)sessionContext.renderSettingsTable();
  }catch(error){if(sequence===sessionContext.resultRenderSequence){sessionContext.resultActionLoading=false;sessionContext.fieldPlotLoadStatus=null;sessionContext.showResultMessage(error.message,'error')}}
}

function drawSweepResult(sessionContext, action,entries,currentModel){
  const documentIdentity=captureDocumentActionIdentity(sessionContext,currentModel),isCurrentDocument=()=>isCurrentDocumentAction(sessionContext,documentIdentity);
  sessionContext.lastSweepRender={action,entries,currentModel};
  const scene=sessionContext.activeApplicationPackage?.graphicsConsole?.scenes?.[sessionContext.activeGraphicsSceneId],sceneInputs=sessionContext.graphicsSceneInputsFor(scene);
  action=sceneInputs[scene?.settingsInput||'settings']||action;
  const selectedView=sessionContext.selectPlotTableView({scene,selectedTabId:sessionContext.sweepViewModes[action.id],inputs:sceneInputs,fallbackEntries:entries});
  entries=selectedView.entries;
  const presentation=sessionContext.activeApplicationPackage.resultPresentation;
  const selected=presentation.selectEntries(action,entries),ready=selected.filter(entry=>entry.view&&!entry.view.error&&entry.view.rows.length),missing=selected.filter(entry=>entry.missing||entry.view?.error);
  const host=sessionContext.$('#result-data-table');
  sessionContext.$('#result-chart').hidden=true;sessionContext.$('#result-legend').hidden=true;sessionContext.$('#results-toolbar').hidden=true;host.hidden=false;
  let state=presentationMounts.get(sessionContext);if(state&&(state.host!==host||state.kind!=='plot-table'||!state.mount.inspect().mounted)){state.mount.dispose();state=null;presentationMounts.delete(sessionContext);}
  const sourceSummary=presentation.sourceSummary(ready),freshnessText=presentation.freshnessNotice(ready,sessionContext.profileCopy);
  const saveInfo=presentation.figureSaveInfo({action,entries,ready,isPlot:selectedView.isPlot,loading:sessionContext.resultActionLoading,activeOperation:sessionContext.operationProgress.active()});
  let plotView=null;
  if(ready.length&&ready.every(entry=>entry.view.xColumn))presentation.renderPlot({canvas:sessionContext.$('#result-chart'),ready,action,model:currentModel,parameters:sessionContext.modelValueAtRole('parameter',currentModel),renderer:options=>{const {canvas,...data}=options;plotView=data;return '';}});
  const missingText=ready.some(entry=>!entry.view.xColumn)&&selectedView.isPlot?'No parameter column is available for the X axis. View these samples in Table.':presentation.missingSummary(missing);
  const props={columnsForEntry:entry=>presentation.tableColumns(action,entry,currentModel),titleForEntry:entry=>presentation.tableSectionTitle(entry),resizeKeyForEntry:(entry,index)=>`result-data:${currentModel.metadata?.id||'document'}:${action.id}:${entry.dataset?.id||index}`,view:{scene,selectedTabId:sessionContext.sweepViewModes[action.id],inputs:{...sceneInputs,[selectedView.activeTab.input]:selected},fallbackEntries:selected,sourceSummary,freshnessText,saveInfo:{...saveInfo,enabled:saveInfo.enabled&&ready.length>0&&!ready.some(entry=>!entry.view.xColumn),label:state?.saveStatus||saveInfo.label},missingText,plotView},
    onTabSelect:createDocumentBoundPlotTableCallback(sessionContext,documentIdentity,tabId=>{sessionContext.sweepViewModes[action.id]=tabId;sessionContext.drawSweepResult(action,entries,currentModel)}),
    onSave:createDocumentBoundPlotTableCallback(sessionContext,documentIdentity,async()=>{const canvas=host.querySelector('canvas');if(!canvas)return;state.saveStatus='Saving figure…';state.mount.update({...props,view:{...props.view,saveInfo:{...saveInfo,enabled:false,label:state.saveStatus}}});try{const imageDataUrl=presentation.figureImageDataUrl({action,canvas}),body=presentation.figureSaveBody({folder:documentIdentity.folder,file:documentIdentity.file,model:currentModel,action,imageDataUrl,canvas});const saved=await sessionContext.requestJson(sessionContext.editorEndpoint('saveFigure'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!isCurrentDocument())return;state.saveStatus=presentation.savedFigureLabel(saved);}catch(error){if(!isCurrentDocument())return;state.saveStatus=error.message;}if(!isCurrentDocument())return;state.mount.update({...props,view:{...props.view,saveInfo:{...saveInfo,label:state.saveStatus}}});})
  };
  if(state)state.mount.update(props);else{state={host,mount:mountPlotTable(host,props),kind:'plot-table',saveStatus:''};presentationMounts.set(sessionContext,state);}
  sessionContext.$('#result-message').hidden=true;sessionContext.$('#results-note').textContent=presentation.flowSummary(action,currentModel);
}

function drawPreview(sessionContext){
  sessionContext.previewCanvas.graphicsTooltipAt=null;
  sessionContext.hideGraphicsHoverTooltip();
  const activeScene=sessionContext.activeApplicationPackage?.graphicsConsole?.scenes?.[sessionContext.activeGraphicsSceneId];
    const controls=sessionContext.$('#geometry-controls');
    if(controls&&sessionContext.activeApplicationPackage?.graphicsControlAvailability&&sessionContext.activeGraphicsWidget){
      const availability=sessionContext.activeApplicationPackage.graphicsControlAvailability({model:sessionContext.model,scene:activeScene,inputs:sessionContext.graphicsSceneInputsFor(activeScene)});
      if(controls.dataset.graphicsAvailability!==JSON.stringify(availability))sessionContext.configureGraphicsWidget(sessionContext.activeGraphicsWidget,activeScene);
    }
  if(activeScene?.kind==='layered'){
    const inputs=sessionContext.graphicsSceneInputsFor(activeScene),prepared=sessionContext.activeGraphicsLayerRegistry.prepare(activeScene,inputs,{camera:sessionContext.camera},layer=>sessionContext.graphicsVisibility(layer.role||layer.id));
    if(prepared.length&&prepared.every(entry=>entry.output?.primitives||entry.output?.scene?.primitives||entry.output?.data)){
      const layers=prepared.map(({layer,output})=>({id:layer.id,draw:output.primitives||output.scene?.primitives?drawSceneView:sessionContext.activeApplicationGraphicsWidgets[graphicsWidgetForLayer(layer,sessionContext.activeScenarioDimension())]?.render,options:output.primitives?{scene:output}:output.scene?{scene:output.scene}:{data:output.data}}));
      drawLayeredScene({canvas:sessionContext.previewCanvas,layers,view:sessionContext.camera});sessionContext.renderSchemaTduvOverview();return;
    }
  }
  if(!sessionContext.activeApplicationPackage?.renderPreview)return;
  sessionContext.previewCanvas.graphicsTooltipAt=null;
  sessionContext.hideGraphicsHoverTooltip();
  sessionContext.activeApplicationPackage.renderPreview({
    previewCanvas: sessionContext.previewCanvas,previewContext: sessionContext.previewContext,getElement:sessionContext.$,activeApplicationPackage: sessionContext.activeApplicationPackage,activeGraphicsSceneId: sessionContext.activeGraphicsSceneId,
    graphicsSceneInputsFor: sessionContext.graphicsSceneInputsFor,model: sessionContext.model,activeComponentId: sessionContext.activeComponentId,previewMeshComponentId: sessionContext.previewMeshComponentId,graphicsSceneForPath: sessionContext.graphicsSceneForPath,
    selectedPath: sessionContext.selectedPath,selectedSchemaProjection: sessionContext.selectedSchemaProjection,valueAt: sessionContext.valueAt,settingsDraft: sessionContext.settingsDraft,graphicsVisibility: sessionContext.graphicsVisibility,camera: sessionContext.camera,activeScenarioDimension: sessionContext.activeScenarioDimension,
    activeApplicationGraphicsWidgets: sessionContext.activeApplicationGraphicsWidgets,activeGraphicsWidget: sessionContext.activeGraphicsWidget,graphicsProfile: sessionContext.graphicsProfile,profileCopyFormat: sessionContext.profileCopyFormat,
    profileCopy: sessionContext.profileCopy,fieldPointLabel: sessionContext.fieldPointLabel,
    prepareGraphicsLayers:(scene,inputs,context)=>sessionContext.activeGraphicsLayerRegistry.prepare(
      scene,inputs,context,layer=>sessionContext.graphicsVisibility(layer.role||layer.id)),
  });
  sessionContext.renderSchemaTduvOverview();
}

function hideGraphicsHoverTooltip(sessionContext){
  sessionContext.graphicsHoverTooltip.hidden=true;
  sessionContext.previewCanvas.style.cursor='';
}

function showGraphicsHoverTooltip(sessionContext, event){
  const tooltipAt=sessionContext.previewCanvas.graphicsTooltipAt;
  if(sessionContext.pointer||typeof tooltipAt!=='function'){sessionContext.hideGraphicsHoverTooltip();return}
  const canvasBounds=sessionContext.previewCanvas.getBoundingClientRect();
  const detail=tooltipAt(event.clientX-canvasBounds.left,event.clientY-canvasBounds.top);
  if(!detail){sessionContext.hideGraphicsHoverTooltip();return}
  sessionContext.graphicsHoverTooltip.textContent=detail;
  sessionContext.graphicsHoverTooltip.hidden=false;
  sessionContext.previewCanvas.style.cursor='help';
  const host=sessionContext.$('#geometry-view'),hostBounds=host.getBoundingClientRect();
  const localX=event.clientX-hostBounds.left,localY=event.clientY-hostBounds.top;
  const left=Math.max(8,Math.min(localX+14,host.clientWidth-sessionContext.graphicsHoverTooltip.offsetWidth-8));
  const top=Math.max(8,Math.min(localY+14,host.clientHeight-sessionContext.graphicsHoverTooltip.offsetHeight-8));
  sessionContext.graphicsHoverTooltip.style.left=`${left}px`;
  sessionContext.graphicsHoverTooltip.style.top=`${top}px`;
}

export function createController(context){return {
    disposeGraphicsViews:()=>disposeGraphicsViews(context),
    fieldPointLabel: (...args) => fieldPointLabel(context, ...args),
    resetPreviewCamera: (...args) => resetPreviewCamera(context, ...args),
    previewSchemaAuthoringOperation: (...args) => previewSchemaAuthoringOperation(context, ...args),
    previewReportSummary: (...args) => previewReportSummary(context, ...args),
    previewReportTooltip: (...args) => previewReportTooltip(context, ...args),
    isResultPath: (...args) => isResultPath(context, ...args),
    formatFieldFrequency: (...args) => formatFieldFrequency(context, ...args),
    resultViewForAction: (...args) => resultViewForAction(context, ...args),
    isFieldResultAction: (...args) => isFieldResultAction(context, ...args),
    isTabularResultAction: (...args) => isTabularResultAction(context, ...args),
    graphicsProfile: (...args) => graphicsProfile(context, ...args),
    graphicsSceneForPath: (...args) => graphicsSceneForPath(context, ...args),
    graphicsResultScene: (...args) => graphicsResultScene(context, ...args),
    graphicsSceneInputsFor: (...args) => graphicsSceneInputsFor(context, ...args),
    graphicsVisibility: (...args) => graphicsVisibility(context, ...args),
    showGraphicsForSelection: (...args) => showGraphicsForSelection(context, ...args),
    showResultMessage: (...args) => showResultMessage(context, ...args),
    showResultSurface: (...args) => showResultSurface(context, ...args),
    loadResultAction: (...args) => loadResultAction(context, ...args),
    drawSweepResult: (...args) => drawSweepResult(context, ...args),
    drawPreview: (...args) => drawPreview(context, ...args),
    hideGraphicsHoverTooltip: (...args) => hideGraphicsHoverTooltip(context, ...args),
    showGraphicsHoverTooltip: (...args) => showGraphicsHoverTooltip(context, ...args),
};}
