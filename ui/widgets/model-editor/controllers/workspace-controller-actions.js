import React from '../../shared/react/react-runtime.js';
import {renderOwnedView,joinView} from '../../../runtime/owned-view.js';
import {SchemaField,SchemaObject,SchemaStructure} from '../schema-form.js';
import {RowMoveControls} from '../../shared/react/collection-controls.js';
import {mountPlotTableSections} from '../../plot-table/widget.js';
import {disposeGraphicsViews,registerGraphicsView} from './graphics-controller.js';
import {renderApplicationSelectionActions} from './workspace-views.js';
const graphicsPreferences=new WeakMap();
function storedGraphicsPreferences(host,profileKey){
  const key=`fullmeta.modelEditor.graphics/${encodeURIComponent(profileKey)}`;
  try{
    const raw=host.ownerDocument.defaultView?.sessionStorage?.getItem(key);
    if(!raw)return new Map();
    const entries=JSON.parse(raw);
    return Array.isArray(entries)?new Map(entries.filter(entry=>Array.isArray(entry)&&typeof entry[0]==='string'&&typeof entry[1]==='boolean')):new Map();
  }catch{return new Map();}
}
function saveGraphicsPreferences(host,profileKey,preferences){
  try{host.ownerDocument.defaultView?.sessionStorage?.setItem(`fullmeta.modelEditor.graphics/${encodeURIComponent(profileKey)}`,JSON.stringify([...preferences]));}catch{}
}
export function applicationExtension(sessionContext, name){return document.querySelector(`[data-model-editor-extension="${name}"]`)}

export function editorDomain(sessionContext, name,...args){
  const operation=sessionContext.activeApplicationPackage?.editorDomain?.[name];
  if(typeof operation!=='function')throw new Error(`The active application does not provide ${name}.`);
  return operation(...args);
}

export function editorEndpoint(sessionContext, name){
  const endpoint=sessionContext.activeApplicationPackage?.editorApi?.[name]||sessionContext.sharedEditorApi[name];
  if(!endpoint)throw new Error(`The active application does not declare the ${name} editor endpoint.`);
  return endpoint;
}

export function editorFactory(sessionContext, name){
  const factory=sessionContext.activeApplicationPackage?.editorFactories?.[name];
  if(typeof factory!=='function')throw new Error(`The application does not provide editor operation ${name}.`);
  return factory;
}

export function editorOptions(sessionContext){return sessionContext.applicationSchemaApi()?.editorOptionsForModel?.(sessionContext.model)||{}}

export function editorAllows(sessionContext, option){return sessionContext.editorOptions()[option]!==false}

export function applicationResultAdapter(sessionContext){return sessionContext.activeApplicationPackage.resultAdapters.forModel(sessionContext.model)}

export function activateApplicationPackage(sessionContext, applicationPackage){
  sessionContext.activeApplicationPackage=applicationPackage;
  sessionContext.projectRootFolder=applicationPackage.modelEditorUi.projectRootFolder||'.';
  sessionContext.applicationPanels.replace(applicationPackage.mountEditorPanels?.bind(applicationPackage),{settingsView:sessionContext.$('#settings-view'),settingsTable: sessionContext.settingsTable});
  const selectionActions=sessionContext.$('#application-selection-actions');
  renderApplicationSelectionActions(selectionActions,applicationPackage.actionBindings||[]);
  if(applicationPackage.projectStorage){
    sessionContext.defaultModelManifestFile=applicationPackage.projectStorage.modelFile;
    sessionContext.modelManifestFile=sessionContext.defaultModelManifestFile;
    sessionContext.fullmetaRunsDirectory=applicationPackage.projectStorage.runsDirectory;
    sessionContext.fullmetaResultsDirectory=applicationPackage.projectStorage.resultsDirectory;
  }
  sessionContext.activeApplicationGraphicsWidgets=applicationPackage.graphicsWidgets||{};
  sessionContext.activeGraphicsLayerRegistry=sessionContext.createGraphicsLayerRegistry(applicationPackage.graphicsLayerHandlers||{});
  sessionContext.activeGraphicsWidget=applicationPackage.manifest.defaultGraphicsWidget;
  const emptyState=applicationPackage.modelEditorUi.emptyState||{};
  sessionContext.lastDocumentValidation=null;
  sessionContext.previewCanvas.setAttribute('aria-label',emptyState.canvasLabel||'Model graphics');
  sessionContext.lastValidationSummary=emptyState.resolvedValues||'';
  sessionContext.$('#resolved-values').textContent=sessionContext.lastValidationSummary;
  sessionContext.$('#validate').title=applicationPackage.modelEditorUi.controlCopy?.validateHelp||'';
  sessionContext.scenarioMetadata=applicationPackage.scenarioMetadata;
  sessionContext.engineCapabilities=applicationPackage.engineCapabilities;
  sessionContext.uiProfileSchema=applicationPackage.uiProfileSchema;
  const api=applicationPackage.modelEditorSchema;
  sessionContext.modelUnitChoices=api.modelUnitChoices||[];
  sessionContext.activeApplicationActions=applicationPackage.actions?.(sessionContext.createEditorActionServices(),applicationPackage.actionBindings||[])||{};
  sessionContext.activeSelectionActions=applicationPackage.selectionActions?.({loadResultAction: sessionContext.loadResultAction})||{};
  sessionContext.activeApplicationWidgetRenderers=applicationPackage.createWidgetRenderers({
    getModel:()=>sessionContext.model,
    getSettingsDraft:()=>sessionContext.settingsDraft,
    escapeHtml:sessionContext.esc,
    formatChoiceLabel: sessionContext.formatChoiceLabel,
  });
  sessionContext.activeApplicationWidgetComponents={...Object.fromEntries(Object.entries(applicationPackage.reactWidgetProviders||{}).map(([id,provider])=>[id,provider.component])),...(applicationPackage.createWidgetComponents?.({getModel:()=>sessionContext.model,getSettingsDraft:()=>sessionContext.settingsDraft,onCommand:sessionContext.onWidgetCommand})||{})};
  sessionContext.activeApplicationDynamicPropertySets=applicationPackage.createDynamicPropertySets?.({
    getModel:()=>sessionContext.model,
    getSettingsDraft:()=>sessionContext.settingsDraft,
  })||{};
  sessionContext.refreshEditorTools();
  if(sessionContext.compatibilityApplicationId!==applicationPackage.id){
    sessionContext.compatibilityApplicationId=applicationPackage.id;
    if(applicationPackage.requiresServerCompatibility===false){
      sessionContext.serverCompatibility='compatible';sessionContext.serverCompatibilityReady=Promise.resolve();
      const banner=sessionContext.$('#server-compatibility');banner.hidden=true;banner.textContent='';
    }else{sessionContext.serverCompatibility='checking';sessionContext.serverCompatibilityReady=sessionContext.verifyServerCompatibility();}
  }
}

export function resizeWidthsFor(sessionContext, table,count){
  const cols=table.querySelector(':scope > colgroup');
  if(cols?.children.length===count){const widths=Array.from(cols.children,col=>parseFloat(col.style.width));if(widths.every((width)=>Number.isFinite(width)&&width>0))return widths}
  const bodyRow=Array.from(table.tBodies).flatMap((body)=>Array.from(body.rows)).find((row)=>row.cells.length===count&&Array.from(row.cells).every((cell)=>cell.colSpan===1));
  const cells=bodyRow?Array.from(bodyRow.cells):Array.from(table.tHead.rows[0].cells),tableWidth=table.getBoundingClientRect().width||table.parentElement?.clientWidth||count*120;
  let widths=cells.map((cell)=>Math.max(sessionContext.resizeMinColumnWidth,Math.round(cell.getBoundingClientRect().width||tableWidth/count)));
  if(widths.length!==count)widths=Array(count).fill(Math.max(sessionContext.resizeMinColumnWidth,Math.round(tableWidth/count)));
  const target=Math.max(tableWidth,table.classList.contains('definition-table')?610:0),difference=target-widths.reduce((sum,width)=>sum+width,0);
  if(difference>0)widths[count-1]+=difference;
  return widths;
}

export function applyResizeWidths(sessionContext, table,widths,persist=false){
  const cols=table.querySelector(':scope > colgroup');if(!cols)return;
  const minimum=table.classList.contains('definition-table')?610:0,total=widths.reduce((sum,width)=>sum+width,0),extra=Math.max(0,minimum-total);
  if(extra)widths[widths.length-1]+=extra;
  Array.from(cols.children).forEach((col,index)=>{col.style.width=`${widths[index]}px`});
  table.style.width=`${widths.reduce((sum,width)=>sum+width,0)}px`;
  if(persist){try{localStorage.setItem(`fullmeta.column-widths.${table.dataset.columnResizeKey}`,JSON.stringify(widths))}catch{}}
}

export function restoreResizeWidths(sessionContext, table,count){
  const key=table.dataset.columnResizeKey;
  try{const stored=JSON.parse(localStorage.getItem(`fullmeta.column-widths.${key}`)||'null');if(Array.isArray(stored)&&stored.length===count&&stored.every((width)=>Number.isFinite(width)&&width>=sessionContext.resizeMinColumnWidth))return sessionContext.fitSettingsColumnsToPane(table,stored)}
  catch{}
  return sessionContext.fitSettingsColumnsToPane(table,sessionContext.resizeWidthsFor(table,count));
}

export function beginColumnResize(sessionContext, event,table,index){
  if(event.button!==0)return;const cols=table.querySelector(':scope > colgroup');if(!cols)return;
  event.preventDefault();const widths=Array.from(cols.children,col=>parseFloat(col.style.width));if(widths.some((width)=>!Number.isFinite(width)))return;
  const startX=event.clientX,start=[...widths],last=widths.length-1;document.body.classList.add('column-resize-active');
  const move=(moveEvent)=>{const delta=moveEvent.clientX-startX;if(index<last){const applied=Math.max(sessionContext.resizeMinColumnWidth-start[index],Math.min(start[index+1]-sessionContext.resizeMinColumnWidth,delta));widths[index]=start[index]+applied;widths[index+1]=start[index+1]-applied}else widths[index]=Math.max(sessionContext.resizeMinColumnWidth,start[index]+delta);sessionContext.applyResizeWidths(table,widths)};
  const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);document.body.classList.remove('column-resize-active');sessionContext.applyResizeWidths(table,widths,true)};
  sessionContext.listenWindow('pointermove',move);sessionContext.listenWindow('pointerup',finish,{once:true});sessionContext.listenWindow('pointercancel',finish,{once:true});
}

export function nudgeColumnBoundary(sessionContext, table,index,delta){
  const cols=table.querySelector(':scope > colgroup');if(!cols)return;const widths=Array.from(cols.children,col=>parseFloat(col.style.width)),last=widths.length-1;if(index<0||index>last)return;
  if(index<last){const applied=Math.max(sessionContext.resizeMinColumnWidth-widths[index],Math.min(widths[index+1]-sessionContext.resizeMinColumnWidth,delta));widths[index]+=applied;widths[index+1]-=applied}else widths[index]=Math.max(sessionContext.resizeMinColumnWidth,widths[index]+delta);
  sessionContext.applyResizeWidths(table,widths,true);
}

export function prepareResizableTable(sessionContext, table){
  const header=table.tHead?.rows?.[0];if(!header)return;const count=header.cells.length;if(count<2)return;
  const key=table.dataset.columnResizeKey||table.id||`table-${count}`;table.dataset.columnResizeKey=key;
  let cols=table.querySelector(':scope > colgroup');
  if(table.dataset.columnResizeAppliedKey!==key||cols?.children.length!==count){table.style.tableLayout='auto';table.style.width='100%';cols?.remove();cols=null;}
  if(!cols){const widths=sessionContext.restoreResizeWidths(table,count);cols=document.createElement('colgroup');for(const width of widths){const col=document.createElement('col');col.style.width=`${width}px`;cols.append(col)}table.insertBefore(cols,table.firstElementChild)}
  table.style.tableLayout='fixed';sessionContext.applyResizeWidths(table,Array.from(cols.children,col=>parseFloat(col.style.width)));
  Array.from(header.cells).forEach((th,index)=>{
    if(th.querySelector('.column-resizer'))return;
    const handle=document.createElement('span');handle.className='column-resizer';handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label',`Resize ${th.textContent.trim()||`column ${index+1}`} column`);handle.setAttribute('tabindex','0');handle.title='Drag to resize this column';
    handle.addEventListener('pointerdown',(event)=>sessionContext.beginColumnResize(event,table,index));
    handle.addEventListener('keydown',(event)=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();sessionContext.nudgeColumnBoundary(table,index,event.key==='ArrowRight'?12:-12)}});
    th.append(handle);
  });
  table.dataset.columnResizeAppliedKey=key;
}

export function prepareResizableTables(sessionContext, root=document){if(root.matches?.('.settings-table,.result-grid'))sessionContext.prepareResizableTable(root);root.querySelectorAll?.('.settings-table,.result-grid').forEach(sessionContext.prepareResizableTable)}

export function setStatus(sessionContext, message, kind = '') { sessionContext.status.textContent = message; sessionContext.status.className = `status ${kind}`;sessionContext.updateModelEditState(); }

export function updateWorkflowPanels(sessionContext){
  for(const panel of document.querySelectorAll('[data-model-editor-panel]'))panel.hidden=true;
  if(sessionContext.currentTab!=='settings'||!sessionContext.selectedPath)return;
  const selected=sessionContext.selectedDocumentValue();
  for(const declaration of sessionContext.modelEditorSelectionPanels(sessionContext.activeApplicationPackage?.modelEditorUi,sessionContext.selectedPath,selected)){
    const panel=sessionContext.$(declaration.selector);if(!panel)continue;
    const heading=panel.querySelector('[data-model-editor-panel-heading]');
    const note=panel.querySelector('[data-model-editor-panel-note]');
    if(heading)heading.textContent=declaration.heading||'';
    if(note)note.textContent=declaration.note||'';
    for(const binding of sessionContext.activeApplicationPackage?.actionBindings||[]){
      const button=sessionContext.$(binding.selector);
      if(button&&panel.contains(button))button.textContent=binding.label;
    }
    panel.hidden=false;
  }
}

export function currentSelectionIsLoaded(sessionContext){return Boolean(sessionContext.model&&!sessionContext.modelLoading&&sessionContext.loadedModelFolder&&sessionContext.loadedModelFile);}

export function commitVisibleEditorState(sessionContext){
  if(sessionContext.treeRename)throw new Error('Finish the tree rename with Enter, or cancel it with Escape, before committing other edits.');
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'&&sessionContext.currentTab==='settings'){
    for(const numberInput of sessionContext.settingsTable.querySelectorAll('[data-setting-type="number"]')){
      const error=sessionContext.schemaDocumentNumericFieldError(numberInput);
      if(error){numberInput.focus();throw new Error(error);}
    }
    for(const jsonInput of sessionContext.settingsTable.querySelectorAll('[data-setting-type="json-value"],[data-setting-type="json-array"]')){
      let parsed;
      try{parsed=JSON.parse(jsonInput.value)}catch{jsonInput.focus();throw new Error(`${jsonInput.getAttribute('aria-label')||'Value'} must be valid JSON before saving.`);}
      if(jsonInput.dataset.settingType==='json-array'&&!Array.isArray(parsed)){
        jsonInput.focus();throw new Error(`${jsonInput.getAttribute('aria-label')||'Value'} must be a JSON array before saving.`);
      }
    }
    const input=document.activeElement;
    if(input?.matches?.('[data-setting-path]')&&sessionContext.settingsTable.contains(input)&&sessionContext.hasSettingsDraft()){
      const type=input.dataset.settingType;
      if(type==='json-array'||type==='json-value'){
        let parsed;try{parsed=JSON.parse(input.value)}catch{throw new Error(`${sessionContext.selectedLabel||'Value'} must be valid JSON before saving.`)}
        if(type==='json-array'&&!Array.isArray(parsed))throw new Error(`${sessionContext.selectedLabel||'Value'} must be a JSON array before saving.`);
      }
      if(type==='number'&&!Number.isFinite(Number(input.value)))throw new Error(`${sessionContext.selectedLabel||'Value'} must be a finite number before saving.`);
      if(type==='array-number'&&input.value.split(',').map(value=>value.trim()).filter(Boolean).some(value=>!Number.isFinite(Number(value)))){
        throw new Error(`${sessionContext.selectedLabel||'Value'} must contain only numbers before saving.`);
      }
      sessionContext.commitSettingsInput(input);
    }
  }
  return sessionContext.applyCurrentSettingsDraft({refresh:true});
}

export function updateBuildButtons(sessionContext){sessionContext.syncModelActionAvailability();}

export function updatePreviewRunbar(sessionContext, state,message,detail='',tooltip=detail){
  const kind=sessionContext.activeApplicationPackage?.previewOperationKind||'preview';
  const active=sessionContext.operationProgress.active();
  if(state==='idle'){if(!active)sessionContext.clearOperationProgress(kind);return;}
  if(!active||active.kind!==kind)return;
  sessionContext.updateOperationProgress(active.id,{state,message,detail,detailTitle:tooltip,progress:state==='success'?100:null});
}

export function editorWorkflow(sessionContext, name,...args){
  const operation=sessionContext.activeApplicationPackage?.editorWorkflow?.[name];
  if(typeof operation!=='function')throw new Error(`The active application does not provide ${name}.`);
  return operation(...args);
}

export function invalidatePreviewArtifacts(sessionContext, message=sessionContext.modelEditorWorkflowCopy('previewInvalidated')){
  sessionContext.compiledGeo=null;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;sessionContext.updatePreviewRunbar('idle',message);sessionContext.drawPreview();
}

export function esc(sessionContext, value) { return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

export function valueAt(sessionContext, path) { return path.reduce((value, key) => value?.[key], sessionContext.model); }

export function componentVariantSource(sessionContext, variant){
  const file=variant?.file,path=sessionContext.componentVariantSourcePath(variant);
  if(file!==sessionContext.activeApplicationPackage?.rootDocumentFile)throw new Error('The component variant must be declared in the open schema.');
  const value=sessionContext.valueAt(path);
  if(!value||typeof value!=='object'||Array.isArray(value)){
    throw new Error(`The component variant source ${file}${variant.pointer} is unavailable.`);
  }
  return{file,path,value};
}

export function hasEditorRole(sessionContext, role,path=sessionContext.selectedPath) { return sessionContext.modelEditorSelectionHasRole(sessionContext.activeApplicationPackage?.modelEditorUi,role,path); }

export function editorRolePath(sessionContext, role){return sessionContext.activeApplicationPackage?.modelEditorUi?.roles?.[role]?.slice()||[];}

export function editorRolePathAt(sessionContext, role,contextPath=[]){return sessionContext.editorRolePath(role).map((part,index)=>part==='*'?contextPath[index]:part);}

export function isEditorRoleRoot(sessionContext, role,path){return sessionContext.modelEditorPathMatches(sessionContext.editorRolePath(role),path);}

export function isEditorRoleItem(sessionContext, role,path){
  if(!Array.isArray(path))return false;
  const pattern=sessionContext.editorRolePath(role);
  if(pattern.at(-1)==='*')return sessionContext.modelEditorPathMatches(pattern,path);
  return Number.isInteger(path.at(-1))&&sessionContext.modelEditorPathMatches(pattern,path.slice(0,-1));
}

export function hasAnyEditorRole(sessionContext, group,path=sessionContext.selectedPath){return (sessionContext.activeApplicationPackage?.modelEditorUi?.[group]||[]).some(role=>sessionContext.hasEditorRole(role,path));}

export function profileCopy(sessionContext, key,fallback=''){return sessionContext.activeUiProfile?.copy?.[key]??fallback}

export function profileCopyFormat(sessionContext, key,values,fallback=''){return Object.entries(values||{}).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value)),sessionContext.profileCopy(key,fallback))}

export function sharedUiCopy(sessionContext, key,values={}){
  const template=sessionContext.activeUiProfile?.copy?.[key]??sessionContext.uiProfileSchema?.properties?.copy?.default?.[key]??'';
  return Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value??'')),template);
}

export function formatChoiceLabel(sessionContext, template,item={}){
  if(typeof template!=='string'||!template)return'';
  return template.replace(/\{([^}]+)\}/g,(_,key)=>String(item?.[key]??'')).trim().replace(/^[\s·,;:–—-]+|[\s·,;:–—-]+$/g,'');
}

export function profileDataLabel(sessionContext, key,fallback=''){return sessionContext.activeUiProfile?.ui?.dataLabels?.[key]??fallback}

export function activeScenario(sessionContext){return sessionContext.activeApplicationPackage?.scenarioForModel?.(sessionContext.model,sessionContext.activeScenarioDefinition)||sessionContext.modelEditorScenario(sessionContext.activeApplicationPackage?.modelEditorUi,sessionContext.scenarioMetadata.profiles,sessionContext.model,sessionContext.activeScenarioDefinition)}

export function activeScenarioDimension(sessionContext){return sessionContext.activeApplicationPackage?.scenarioDimensionForModel?.(sessionContext.model,sessionContext.activeScenario())??sessionContext.modelEditorScenarioDimension(sessionContext.activeApplicationPackage?.modelEditorUi,sessionContext.scenarioMetadata.profiles,sessionContext.model,sessionContext.activeScenario())}

export function applyProfileAttributes(sessionContext, root=document){
  for(const [selector,attributes] of Object.entries(sessionContext.activeUiProfile?.ui?.attributes||{})){
    let elements=[];try{elements=Array.from(root.querySelectorAll(selector));if(root instanceof Element&&root.matches(selector))elements.unshift(root)}catch(error){throw new Error(`Invalid UI profile selector ${selector}: ${error.message}`)}
    for(const element of elements)for(const [name,value] of Object.entries(attributes||{}))element.setAttribute(name,String(value));
  }
}

export function applyProfileVisibility(sessionContext, root=document){
  for(const [selector,visible] of Object.entries(sessionContext.activeUiProfile?.behavior?.visibility||{})){
    if(visible!==false)continue;
    let elements=[];try{elements=Array.from(root.querySelectorAll(selector));if(root instanceof Element&&root.matches(selector))elements.unshift(root)}catch(error){throw new Error(`Invalid UI profile selector ${selector}: ${error.message}`)}
    for(const element of elements)element.hidden=true;
  }
}

export function applyUiProfile(sessionContext, profile){
  sessionContext.workspaceLayout?.useSchemaDefault(sessionContext.activeApplicationPackage?.schemaPath||sessionContext.activeApplicationPackage?.id,sessionContext.activeApplicationPackage?.modelEditorUi?.layout?.defaultLayout||'stacked');
  if(profile?.ui?.documentTitle)document.title=profile.ui.documentTitle;
  for(const [selector,value] of Object.entries(profile?.ui?.text||{})){
    let elements=[];try{elements=document.querySelectorAll(selector)}catch(error){throw new Error(`Invalid UI profile text selector ${selector}: ${error.message}`)}
    for(const element of elements)element.textContent=String(value);
  }
  const brandSubtitle=sessionContext.$('.brand-sub');if(brandSubtitle)brandSubtitle.textContent=sessionContext.activeApplicationPackage?.modelEditorUi?.brandSubtitle||sessionContext.sharedBrandSubtitle;
  sessionContext.applyProfileAttributes();
  sessionContext.applyProfileVisibility();
}

export async function loadUiProfile(sessionContext, catalogProfile,applicationPackage=sessionContext.activeApplicationPackage) {
  const profileId = catalogProfile?.id;
  const embeddedProfile = applicationPackage?.uiProfiles?.[profileId];
  if (!embeddedProfile) throw new Error(`Simulation profile ${profileId || '(unknown)'} has no embedded UI profile.`);
  const profile = structuredClone(embeddedProfile);
  const profileSchema=applicationPackage.uiProfileSchema;
  const extensionSchema=applicationPackage.uiProfileExtensionSchema;
  const schemaErrors=[
    ...sessionContext.validateUiProfileSchema(profile,profileSchema,'#',profileSchema),
    ...(extensionSchema?sessionContext.validateUiProfileSchema(profile,extensionSchema,'#',extensionSchema):[]),
  ];
  if(schemaErrors.length)throw new Error(`Embedded UI profile ${profileId} does not comply with its application UI profile contracts: ${schemaErrors[0]}`);
  return profile;
}

export function pathLabel(sessionContext, path) { return path.map((part) => typeof part === 'number' ? `[${part + 1}]` : String(part).replace(/([a-z])([A-Z])/g,'$1 $2')).join(' · '); }

export function compatibleUnitsFor(sessionContext, unit,allowed=sessionContext.modelUnitChoices){
  let dimension=null;try{dimension=sessionContext.getUnit(unit).dimension}catch{}
  const choices=allowed.filter((candidate)=>{try{return dimension===null||JSON.stringify(sessionContext.getUnit(candidate).dimension)===JSON.stringify(dimension)}catch{return candidate===unit}});
  if(unit&&!choices.includes(unit))choices.unshift(unit);
  return choices;
}

export function commitInputsBeforeRowMove(sessionContext){
  if(sessionContext.jsonDraftDirty){sessionContext.setStatus('Apply the current JSON draft before moving rows.','error');return false;}
  if(sessionContext.selectedCollection){
    for(const input of sessionContext.settingsTable.querySelectorAll('[data-definition-index][data-definition-field]')){
      sessionContext.commitDefinitionInput(input);
      if(input.getAttribute('aria-invalid')==='true'){input.focus();return false;}
    }
  }else if(sessionContext.settingsDraft){
    for(const input of sessionContext.settingsTable.querySelectorAll('[data-setting-path]')){
      const actionError=sessionContext.schemaActionFacingError(input);
      if(actionError){sessionContext.setStatus(actionError,'error');input.focus();return false;}
      const type=input.dataset.settingType;
      if((type==='number'&&(!Number.isFinite(Number(input.value))||input.validity.badInput))
        ||(type==='array-number'&&input.value.split(',').map((value)=>value.trim()).filter(Boolean).some((value)=>!Number.isFinite(Number(value))))){
        sessionContext.setStatus('Correct the numeric value before moving rows.','error');input.focus();return false;
      }
      sessionContext.commitSettingsInput(input);
    }
  }
  return true;
}

export function addItem(sessionContext, parent, label, path, enabled = true, schemaForPath=sessionContext.modelEditorSchemaForPath, projectionNode=null) {
  const location=projectionNode?.treeLocation;
  const active=Array.isArray(location)&&Array.isArray(sessionContext.selectedSchemaProjection?.treeLocation)
    ?sessionContext.samePath(sessionContext.selectedSchemaProjection.treeLocation,location):sessionContext.samePath(sessionContext.selectedPath,path);
  const dataset={modelPath:JSON.stringify(path)};
  if(Array.isArray(location))dataset.schemaTreeLocation=JSON.stringify(location);
  const button = sessionContext.createModelTreeItem(label,path,{active,disabled:!enabled,dataset,schemaForPath,iconSvg:projectionNode?.iconSvg});
  if(projectionNode)sessionContext.schemaProjectionForTreeButton.set(button,projectionNode);
  button.addEventListener('click', () => sessionContext.selectItem(label, path, button, projectionNode)); parent.append(button); return button;
}

export function samePath(sessionContext, left,right){return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&left.every((part,index)=>part===right[index])}

export function uniqueId(sessionContext, base = 'item') { return sessionContext.uniqueModelId(sessionContext.model,base); }

export function uniqueName(sessionContext, arrayPath, base) { return sessionContext.uniqueArrayName(sessionContext.valueAt(arrayPath)||[],base); }

export function uniqueSymbol(sessionContext, prefix) { return sessionContext.editorFactory('uniqueDefinitionSymbol')(sessionContext.model,prefix); }

export function componentForArray(sessionContext, path) { return sessionContext.hasAnyEditorRole('componentRoles',path) ? sessionContext.modelComponent() : null; }

export function activeComponentId(sessionContext){return sessionContext.activeApplicationPackage?.componentIdForModel?.(sessionContext.model,sessionContext.selectedPath)??sessionContext.modelEditorGraphicsComponentId(sessionContext.activeApplicationPackage?.modelEditorUi,sessionContext.model)}

export function clearPreviewForComponentChange(sessionContext, previousId,nextId){if(!previousId||previousId===nextId)return;sessionContext.compiledGeo=null;sessionContext.previewMesh=null;sessionContext.previewMeshComponentId=null;sessionContext.previewMeshModelSnapshot=null;sessionContext.updatePreviewRunbar('idle',sessionContext.modelEditorWorkflowCopy('componentPreviewChanged'))}

export function cloneWithUniqueIds(sessionContext, source, arrayPath) { return sessionContext.cloneModelItemWithUniqueIds(sessionContext.model,source,arrayPath); }

export function defaultArrayItem(sessionContext, arrayPath){return sessionContext.treeActionPlans().defaultArrayItem(arrayPath)}

export function displayItemName(sessionContext, item, arrayPath) { return sessionContext.treeActionPlans().displayItemName(item,arrayPath); }

export function referenceItemLabel(sessionContext, item, siblings = []) {
  const label=item?.name||item?.symbol||item?.id||sessionContext.sharedUiCopy('unnamedReferenceLabel');
  const id=item?.id;
  const repeatedName=Boolean(item?.name&&id&&(siblings||[]).filter((candidate)=>candidate?.id&&candidate.name===item.name).length>1);
  return repeatedName?sessionContext.sharedUiCopy('duplicateReferenceLabel',{label,id}):label;
}

export function insertionIndexFor(sessionContext, arrayPath,afterIndex=null){
  const list=sessionContext.valueAt(arrayPath);if(!Array.isArray(list)){if(sessionContext.treeActionPlans().allowsMissingArray(arrayPath)&&list===undefined)return 0;throw new Error(`${sessionContext.pathLabel(arrayPath)} is not an item list.`)}
  try{return sessionContext.insertionIndexForModelArray(list,afterIndex)}catch(error){throw new Error(`${sessionContext.pathLabel(arrayPath)} is not an item list.`)}
}

export function checkArrayInsertionLimit(sessionContext, arrayPath){
  const list=sessionContext.valueAt(arrayPath),schema=sessionContext.resolveModelEditorSchema(sessionContext.modelEditorSchemaForPath(sessionContext.model,arrayPath));
  if(Array.isArray(list)&&Number.isInteger(schema?.maxItems)&&list.length>=schema.maxItems){
    throw new Error(`${sessionContext.pathLabel(arrayPath)} allows at most ${schema.maxItems} item(s).`);
  }
}

export function insertArrayItem(sessionContext, arrayPath, item, afterIndex = null) {
  const previousComponentId=sessionContext.activeComponentId();
  const index=sessionContext.insertionIndexFor(arrayPath,afterIndex);
  sessionContext.checkArrayInsertionLimit(arrayPath);
  // Tree additions are drafts; Validate diagnoses incomplete or inconsistent models.
  sessionContext.model=sessionContext.modelWithArrayItemDraft(sessionContext.model,arrayPath,item,index);
  const definitionKind=sessionContext.definitionCollectionKindForPath(arrayPath);
  if(definitionKind){
    sessionContext.selectedCollection=definitionKind;sessionContext.selectedPath=null;sessionContext.settingsDraft=null;sessionContext.selectedLabel=sessionContext.definitionCollectionLabel(sessionContext.selectedCollection);sessionContext.clearPreviewForComponentChange(previousComponentId,sessionContext.activeComponentId());sessionContext.setTab('settings');sessionContext.renderModel();sessionContext.setStatus(`Added ${sessionContext.definitionLabel(item)}. Save to keep the change.`,'good');return;
  }
  sessionContext.selectedCollection=null; sessionContext.selectedPath=[...arrayPath,index]; sessionContext.selectedLabel=sessionContext.displayItemName(item,arrayPath);
  sessionContext.clearPreviewForComponentChange(previousComponentId,sessionContext.activeComponentId());
  if (sessionContext.hasAnyEditorRole('previewCollectionInvalidationRoles',arrayPath)) sessionContext.invalidatePreviewArtifacts();
  sessionContext.$('#selection-title').textContent=sessionContext.selectedLabel; sessionContext.$('#selection-path').textContent=sessionContext.selectedPath.join(' › ');
  sessionContext.renderModel(); sessionContext.setStatus(`Added ${sessionContext.selectedLabel}. Validate the model and Save to keep the change.`, 'good');
}

export function isToggleEnabledItemPath(sessionContext, path){return (sessionContext.activeApplicationPackage?.modelEditorUi?.toggleEnabledRoles||[]).some(role=>sessionContext.isEditorRoleItem(role,path));}

export function availableMenuButton(sessionContext, label,action,target=sessionContext.contextTarget){return sessionContext.menuButton(label,action,sessionContext.addActionAvailability(action,target))}

export function panelLayoutDefaults(sessionContext){const layout=sessionContext.activeUiProfile?.layout;return{treeWidth:sessionContext.editorMountOptions.treeWidthPx??layout?.treeWidthPx??260,graphicsRatio:(sessionContext.editorMountOptions.graphicsHeightPercent??layout?.graphicsHeightPercent??60)/100}}

export function readPanelSize(sessionContext, name,fallback){try{const value=Number(localStorage.getItem(name));return Number.isFinite(value)&&value>0?value:fallback}catch{return fallback}}

export function setGraphicsHeight(sessionContext, graphicsHeight,persist=true) {
  if(window.matchMedia('(max-width: 900px)').matches)return;
  const height=sessionContext.rightWorkspace.clientHeight;if(!height)return;
  const divider=14,available=Math.max(0,height-divider),minGraphics=Math.min(180,Math.max(80,available*.3)),minSettings=Math.min(160,Math.max(80,available-minGraphics)),maxGraphics=Math.max(minGraphics,available-minSettings);
  const actual=Math.max(minGraphics,Math.min(Math.round(graphicsHeight),maxGraphics));
  sessionContext.rightWorkspace.style.setProperty('--graphics-height',`${actual}px`);
  sessionContext.rightSplitter.setAttribute('aria-valuemin',String(minGraphics));sessionContext.rightSplitter.setAttribute('aria-valuemax',String(maxGraphics));sessionContext.rightSplitter.setAttribute('aria-valuenow',String(actual));
  if(persist){try{localStorage.setItem('fullmeta.modelEditor.graphicsRatio',String(actual/available))}catch{}}
  sessionContext.drawPreview();
}

export function bindWidthSplitter(sessionContext, handle) {
  let dragState=null;
  handle.addEventListener('pointerdown',(event)=>{if(event.button!==0||window.matchMedia('(max-width: 900px)').matches)return;event.preventDefault();dragState={id:event.pointerId,x:event.clientX,tree:sessionContext.readPanelSize('fullmeta.modelEditor.treeWidth',sessionContext.panelLayoutDefaults().treeWidth)};handle.classList.add('dragging');handle.setPointerCapture(event.pointerId)});
  handle.addEventListener('pointermove',(event)=>{if(!dragState||event.pointerId!==dragState.id)return;sessionContext.setTreeWidth(dragState.tree+event.clientX-dragState.x)});
  const finish=(event)=>{if(!dragState||event.pointerId!==dragState.id)return;dragState=null;handle.classList.remove('dragging');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId)};
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
  handle.addEventListener('keydown',(event)=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();sessionContext.setTreeWidth(sessionContext.readPanelSize('fullmeta.modelEditor.treeWidth',sessionContext.panelLayoutDefaults().treeWidth)+(event.key==='ArrowRight'?12:-12))});
}

export function bindGraphicsHeightSplitter(sessionContext, handle) {
  let dragState=null;
  handle.addEventListener('pointerdown',(event)=>{if(event.button!==0||window.matchMedia('(max-width: 900px)').matches)return;event.preventDefault();dragState={id:event.pointerId,y:event.clientY,height:parseFloat(getComputedStyle(sessionContext.rightWorkspace).getPropertyValue('--graphics-height'))||sessionContext.rightWorkspace.clientHeight*sessionContext.panelLayoutDefaults().graphicsRatio};handle.classList.add('dragging');handle.setPointerCapture(event.pointerId)});
  handle.addEventListener('pointermove',(event)=>{if(!dragState||event.pointerId!==dragState.id)return;sessionContext.setGraphicsHeight(dragState.height+event.clientY-dragState.y)});
  const finish=(event)=>{if(!dragState||event.pointerId!==dragState.id)return;dragState=null;handle.classList.remove('dragging');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId)};
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
  handle.addEventListener('keydown',(event)=>{if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();sessionContext.setGraphicsHeight((parseFloat(getComputedStyle(sessionContext.rightWorkspace).getPropertyValue('--graphics-height'))||sessionContext.rightWorkspace.clientHeight*sessionContext.panelLayoutDefaults().graphicsRatio)+(event.key==='ArrowDown'?12:-12))});
}

export function restorePanelLayout(sessionContext){
  if(sessionContext.workspaceLayout){sessionContext.workspaceLayout.resize();return;}
  if(!sessionContext.activeUiProfile)return;
  const defaults=sessionContext.panelLayoutDefaults();
  sessionContext.setTreeWidth(sessionContext.readPanelSize('fullmeta.modelEditor.treeWidth',defaults.treeWidth));
  if(!window.matchMedia('(max-width: 900px)').matches){const available=sessionContext.rightWorkspace.clientHeight-12,ratio=Math.max(.3,Math.min(.8,sessionContext.readPanelSize('fullmeta.modelEditor.graphicsRatio',defaults.graphicsRatio)));sessionContext.setGraphicsHeight(available*ratio,false)}
}

export function applicationRequestOptions(sessionContext, options={}){
  if(sessionContext.editorDebug?.serviceMode==='fixture')throw new Error('Fixture mode blocked an unregistered direct application request. No live request was sent.');
  const {documentContext=true,...fetchOptions}=options;
  const applicationId=sessionContext.activeApplicationPackage?.id||sessionContext.model?.application;
  if(!applicationId)return fetchOptions;
  const headers=new Headers(fetchOptions.headers||{});
  if(!headers.has('x-fullmeta-application'))headers.set('x-fullmeta-application',applicationId);
  if(sessionContext.activeApplicationPackage?.schemaPath&&!headers.has('x-fullmeta-model-schema'))headers.set('x-fullmeta-model-schema',encodeURIComponent(sessionContext.activeApplicationPackage.schemaPath));
  if(documentContext&&sessionContext.openedDocumentPath()&&!headers.has('x-fullmeta-document'))headers.set('x-fullmeta-document',encodeURIComponent(sessionContext.openedDocumentPath()));
  return {...fetchOptions,headers};
}

export function configureGraphicsWidget(sessionContext, widget,scene=null){
  const config=sessionContext.graphicsProfile(),descriptor=sessionContext.activeApplicationGraphicsWidgets[widget];
  if(!descriptor)throw new Error(`Graphics widget ${widget} is not registered by the active application.`);
  const widgetConfig=config.widgets?.[widget]||{},host=sessionContext.$('#geometry-controls');
  sessionContext.activeGraphicsSceneId=scene?.id||sessionContext.activeGraphicsSceneId;
  const sceneControls=(scene?.layers||[]).filter(layer=>layer.control).map(layer=>({key:layer.control,label:layer.label,defaultChecked:layer.defaultVisible}));
  const profileKey=sessionContext.openedDocumentPath()||sessionContext.activeApplicationPackage?.schemaPath||sessionContext.activeApplicationPackage?.id||'application';
  // Model sessions can recreate both their context and controls host while
  // the editor page remains mounted. Scope per-document preferences to that
  // page document, not either transient object.
  const preferencesOwner=host.ownerDocument;
  if(!graphicsPreferences.has(preferencesOwner))graphicsPreferences.set(preferencesOwner,new Map());
  const preferences=graphicsPreferences.get(preferencesOwner);
  const availability=sessionContext.activeApplicationPackage?.graphicsControlAvailability?.({model:sessionContext.model,scene,inputs:sessionContext.graphicsSceneInputsFor(scene)})||{};
  const controlsKey=JSON.stringify(sceneControls),previous=host.dataset.graphicsProfile===profileKey
    ?new Map([...host.querySelectorAll('[data-graphics-visibility]')].map(input=>[input.dataset.graphicsVisibility,input.checked])):new Map();
  if(host.dataset.graphicsProfile&&host.dataset.graphicsProfile!==profileKey){
    const carried=new Map(sessionContext.graphicsControlState);
    for(const [key,value] of [...host.querySelectorAll('[data-graphics-visibility]')].map(input=>[input.dataset.graphicsVisibility,input.checked]))if(!carried.has(key))carried.set(key,value);
    preferences.set(host.dataset.graphicsProfile,carried);
    saveGraphicsPreferences(host,host.dataset.graphicsProfile,carried);
  }
  if(!preferences.has(profileKey))preferences.set(profileKey,storedGraphicsPreferences(host,profileKey));
  if(host.dataset.graphicsProfile!==profileKey){sessionContext.graphicsControlState.clear();for(const [key,value]of preferences.get(profileKey)||[])sessionContext.graphicsControlState.set(key,value);}
  const controls=sceneControls.map(control=>{const value=sessionContext.graphicsControlState.has(control.key)?sessionContext.graphicsControlState.get(control.key):previous.has(control.key)?previous.get(control.key):Boolean(control.defaultChecked);
    const status=availability[control.key]||{};
    sessionContext.graphicsControlState.set(control.key,value);return {id:`show-${control.key}`,key:control.key,label:control.label,type:'boolean',value,disabled:Boolean(status.disabled),reason:status.reason||''};});
  if(widgetConfig.resetViewLabel)controls.push({id:'reset-view',kind:'action',label:widgetConfig.resetViewLabel});
  const props={controls,serviceMode:sessionContext.editorDebug?.serviceMode||'live',onChange({key,value}){if(controls.find(control=>control.key===key)?.disabled)return;sessionContext.graphicsControlState.set(key,value);const next=new Map(sessionContext.graphicsControlState);preferences.set(profileKey,next);saveGraphicsPreferences(host,profileKey,next);sessionContext.configureGraphicsWidget(widget,scene);sessionContext.drawPreview();},onAction(id){if(id==='reset-view'){sessionContext.resetPreviewCamera();sessionContext.drawPreview();}}};
  if(sessionContext.graphicsControlSurface)sessionContext.graphicsControlSurface.update(props);else sessionContext.graphicsControlSurface=sessionContext.mountGraphicsControls(host,props);
  for(const input of host.querySelectorAll('[data-setting-key]')){input.dataset.graphicsVisibility=input.dataset.settingKey;input.id=`show-${input.dataset.settingKey}`;}
  const reset=host.querySelector('[data-action-id="reset-view"]');if(reset)reset.id='reset-view';
  host.dataset.graphicsProfile=profileKey;host.dataset.graphicsControls=controlsKey;
  host.dataset.graphicsAvailability=JSON.stringify(availability);
  sessionContext.activeGraphicsWidget=widget;
  sessionContext.$('#graphics-widget-title').textContent=widgetConfig.label||widget;
  host.hidden=!widgetConfig.showSceneControls;
}

export function enablePreviewLayer(sessionContext){
  const role=sessionContext.activeApplicationPackage?.modelEditorUi?.previewLayerRole;
  const scenes=sessionContext.activeApplicationPackage?.graphicsConsole?.scenes||{};
  const activeScene=scenes[sessionContext.activeGraphicsSceneId];
  const layer=sessionContext.graphicsLayerForRole(activeScene,role)
    ||Object.values(scenes).map(scene=>sessionContext.graphicsLayerForRole(scene,role)).find(Boolean);
  const control=layer?.control;
  if(!control)return;
  sessionContext.graphicsControlState.set(control,true);
  const checkbox=[...document.querySelectorAll('[data-graphics-visibility]')]
    .find(input=>input.dataset.graphicsVisibility===control);
  if(checkbox)checkbox.checked=true;
}

export function showDefaultGraphicsScene(sessionContext){sessionContext.schemaGraphicsContextHost.hidden=true;sessionContext.$('#graphics-selection-context').hidden=true;sessionContext.showGraphicsForSelection([],null)}

export function showGeometryView(sessionContext, scene=sessionContext.graphicsSceneForPath([],null).scene) {
  sessionContext.resultRenderSequence++; sessionContext.activeResultActionId=null;sessionContext.lastSweepRender=null;sessionContext.fieldPlotState=null;sessionContext.fieldPlotLoadStatus=null;const widget=scene?.surface?.widget;if(!widget||!sessionContext.activeApplicationGraphicsWidgets[widget])throw new Error('The active application package has no default Graphics widget.');sessionContext.configureGraphicsWidget(widget,scene);sessionContext.$('#geometry-view').hidden=false;sessionContext.$('#geometry-note').hidden=false;sessionContext.$('#results-view').hidden=true;sessionContext.$('#results-note').hidden=true;sessionContext.$('#geometry-note').textContent=sessionContext.profileCopy('fieldOverlayNote','Drag to rotate · wheel to zoom · use the view axes to orient the model.');sessionContext.renderFieldSettings();
  sessionContext.$('#preview-summary').textContent=sessionContext.profileCopy('geometryPreviewSummary','Model geometry · drag to rotate');sessionContext.drawPreview();
}

export function renderSweepTable(sessionContext, action,entries,currentModel){
  disposeGraphicsViews(sessionContext);
  const host=sessionContext.$('#result-data-table');
  const scene=sessionContext.activeApplicationPackage?.graphicsConsole?.scenes?.[sessionContext.activeGraphicsSceneId];
  const tableTab=sessionContext.graphicsTabForRole(scene,'table');
  const tableRenderer=sessionContext.activeApplicationGraphicsWidgets[tableTab?.widget]?.render;
  const mount=mountPlotTableSections({host,entries,TableComponent:sessionContext.activeApplicationGraphicsWidgets[tableTab?.widget]?.Component,
    columnsForEntry:(entry)=>sessionContext.activeApplicationPackage.resultPresentation.tableColumns(action,entry,currentModel),
    titleForEntry:(entry)=>sessionContext.activeApplicationPackage.resultPresentation.tableSectionTitle(entry),
    resizeKeyForEntry:(entry,index)=>`result-data:${currentModel.metadata.id}:${action.id}:${entry.dataset.id||index}`});
  registerGraphicsView(sessionContext,host,mount,'table-sections');
}

export async function restoreApplicationPreview(sessionContext, loadSequence){
  const restore=sessionContext.activeApplicationPackage?.restorePreview;
  if(typeof restore!=='function'||sessionContext.modelRepairMode)return;
  const requestedModel=sessionContext.model,componentId=sessionContext.activeComponentId(),targetFolder=sessionContext.loadedModelFolder,targetFile=sessionContext.loadedModelFile;
  await restore({
    model:requestedModel,componentId,folder:targetFolder,file:targetFile,loadSequence,
    ui:sessionContext.activeApplicationPackage.modelEditorUi,hasEndpoint:(name)=>Boolean(sessionContext.activeApplicationPackage.editorApi?.[name]),
    apiContract:(name)=>sessionContext.activeApplicationPackage.editorApiContracts?.[name]||null,runsDirectory:sessionContext.fullmetaRunsDirectory,
    isCurrent:()=>loadSequence===sessionContext.modelLoadSequence&&sessionContext.model===requestedModel&&sessionContext.loadedModelFolder===targetFolder&&sessionContext.loadedModelFile===targetFile,
    isCurrentComponent:()=>loadSequence===sessionContext.modelLoadSequence&&sessionContext.model===requestedModel&&sessionContext.activeComponentId()===componentId,
    valueAtRole:sessionContext.modelValueAtRole,compatibilityReady:sessionContext.serverCompatibilityReady,
    serverCompatible:()=>sessionContext.serverCompatibility==='compatible',operationBusy:()=>sessionContext.operationProgress.isBusy(),
    createOperationId: sessionContext.createOperationId,startOperation:sessionContext.startOperationKind,beginProgress:sessionContext.beginOperationProgress,
    updateRunbar:sessionContext.updatePreviewRunbar,requestJson: sessionContext.requestJson,endpoint:sessionContext.declaredActionEndpoint,
    stopRequested:sessionContext.operationStopRequested,copy:sessionContext.modelEditorWorkflowCopy,compiledGeometry:()=>sessionContext.compiledGeo,
    showMesh:(mesh,id,snapshot,geometryFile)=>{sessionContext.compiledGeo=geometryFile;sessionContext.previewMesh=mesh;sessionContext.previewMeshComponentId=id;sessionContext.previewMeshModelSnapshot=JSON.stringify(snapshot);sessionContext.enablePreviewLayer();sessionContext.drawPreview();},
    reportSummary:sessionContext.previewReportSummary,reportTooltip:sessionContext.previewReportTooltip,setStatus: sessionContext.setStatus,
    finishCancelableOperation: sessionContext.finishCancelableOperation,finishOperation:sessionContext.finishOperationKind,finishProgress:sessionContext.finishOperationProgress,
    clearProgress:sessionContext.clearOperationProgress,updateWorkflowPanels: sessionContext.updateWorkflowPanels,
  });
}

export async function exitEditor(sessionContext){
  if(sessionContext.hasUnsavedEditorChanges()){
    const label=sessionContext.model?.metadata?.name||sessionContext.loadedModelFile||'the open model';
    const choice=await sessionContext.requestUnsavedChangesChoice(`Save changes to ${label} before leaving the editor?`);
    if(choice==='cancel')return;
    if(choice==='save'){
      try{sessionContext.commitVisibleEditorState();await sessionContext.saveModel({allowSelectionMismatch:true})}
      catch(error){sessionContext.setStatus(`Could not save ${label}; leaving the editor was canceled. ${error.message}`,'error');return}
    }
  }
  sessionContext.allowConfirmedEditorExit=true;
  window.location.assign('/');
}

export function setTab(sessionContext) { sessionContext.currentTab='settings';sessionContext.$('#settings-view').classList.remove('hidden');sessionContext.fullJson.classList.add('hidden');sessionContext.fullJson.setAttribute('aria-hidden','true');sessionContext.fullJson.tabIndex=-1;sessionContext.updateApplySettingsVisibility();sessionContext.updateSelectionActionVisibility();sessionContext.$('#selection-title').textContent=(sessionContext.activeApplicationPackage?.kind==='schemaDocument'?sessionContext.selectedLabel:sessionContext.selectedPath&&sessionContext.settingPanelActionTitle(sessionContext.valueAt(sessionContext.selectedPath),sessionContext.selectedPath))||sessionContext.selectedLabel||sessionContext.model?.metadata?.name||'Settings';sessionContext.updateWorkflowPanels();sessionContext.updateModelEditState(); }
