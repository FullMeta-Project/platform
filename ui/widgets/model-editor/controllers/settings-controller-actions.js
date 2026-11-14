import React from '../../shared/react/react-runtime.js';
import {mountSettingsHeader} from '../settings-header.js';
import {renderOwnedView,joinView,retainOwnedNodes} from '../../../runtime/owned-view.js';
import {SchemaField,SchemaObject,SchemaStructure} from '../schema-form.js';
import {RowMoveControls} from '../../shared/react/collection-controls.js';
export function hasSettingsDraft(sessionContext){return sessionContext.activeApplicationPackage?.kind==='schemaDocument'||sessionContext.selectedPath?.length?sessionContext.settingsDraft!==undefined:Boolean(sessionContext.settingsDraft)}

export function modelWithEditorSettingsDraft(sessionContext, source,path,draft){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')return sessionContext.modelWithSettingsItemDraft(source,path,draft);
  if(!Array.isArray(path))throw new Error('Choose a JSON tree item before editing its settings.');
  if(!path.length)return sessionContext.cloneJson(draft);
  const candidate=sessionContext.cloneJson(source),parent=path.slice(0,-1).reduce((value,key)=>value?.[key],candidate);
  if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,path.at(-1)))throw new Error('The selected JSON path no longer exists.');
  parent[path.at(-1)]=sessionContext.cloneJson(draft);
  return candidate;
}

export function editorSettingsDraftIsValid(sessionContext, source,path,draft){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')return sessionContext.modelWithSchemaValidSettingsItem(source,path,draft);
  const candidate=sessionContext.modelWithEditorSettingsDraft(source,path,draft),errors=sessionContext.validateFullMetaModelStructure(candidate);
  if(errors.length)throw new Error(errors[0]);
  return candidate;
}

export function fitSettingsColumnsToPane(sessionContext, table,widths){
  if(!table.classList.contains('settings-table')||table.classList.contains('definition-table'))return widths;
  const pane=table.parentElement;if(!pane)return widths;
  const paneStyle=getComputedStyle(pane),available=pane.clientWidth-parseFloat(paneStyle.paddingLeft||'0')-parseFloat(paneStyle.paddingRight||'0');
  const total=widths.reduce((sum,width)=>sum+width,0),minimum=sessionContext.resizeMinColumnWidth*widths.length;
  if(!(available>0)||total<=available||available<minimum)return widths;
  const scale=available/total,fit=widths.map(width=>Math.max(sessionContext.resizeMinColumnWidth,Math.floor(width*scale)));
  let excess=fit.reduce((sum,width)=>sum+width,0)-available;
  while(excess>0){
    const index=fit.reduce((best,width,current)=>width>fit[best]?current:best,0);
    if(fit[index]<=sessionContext.resizeMinColumnWidth)break;
    const reduction=Math.min(excess,fit[index]-sessionContext.resizeMinColumnWidth);fit[index]-=reduction;excess-=reduction;
  }
  return fit;
}

export function updateApplySettingsVisibility(sessionContext){
  const button=sessionContext.$('#apply-settings');
  if(!button)return;
  const itemPending=Boolean(sessionContext.selectedPath&&sessionContext.hasSettingsDraft()&&sessionContext.settingsDraftDirty);
  button.textContent='Apply item';
  button.classList.toggle('hidden',!(sessionContext.currentTab==='settings'&&!sessionContext.selectedCollection&&itemPending));
}

export function initializeSettingsSurface(sessionContext){
  if(sessionContext.settingsSurface)return;
  const panel=sessionContext.$('.panel.editor');if(!panel)return;
  const heading=panel.querySelector(':scope > .editor-head');
  const title=heading?.querySelector('#selection-title')?.textContent||'Settings';
  sessionContext.settingsSurfaceContent=panel;
  retainOwnedNodes(sessionContext.settingsTable.tBodies[0],[sessionContext.schemaGraphicsHost,sessionContext.schemaGlobalUiHost]);
  const mount=mountSettingsHeader(heading,{title,draft:'saved'});
  sessionContext.settingsSurface={update({title,state}){panel.dataset.draftState=state?.draft||'saved';mount.update({title,draft:state?.draft||'saved'});},dispose:()=>mount.dispose()};
}

export function applyCurrentSettingsDraft(sessionContext, {refresh=true,announce=false}={}){
  const relatedPathsAtCommit=new Set(sessionContext.relatedFieldsDraftPaths||[]);
  const invalid=[...sessionContext.rawFieldDrafts.values()].find(draft=>draft.error&&sessionContext.samePath(draft.selection,sessionContext.selectedPath));
  if(invalid)throw new Error(invalid.error);
  if(sessionContext.currentTab!=='settings'||!sessionContext.selectedPath||!sessionContext.hasSettingsDraft())return false;
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'){
    for(const input of sessionContext.settingsTable.querySelectorAll('[data-schema-action-facing]')){
      const error=sessionContext.schemaActionFacingError(input);
      if(error){input.focus();sessionContext.setStatus(error,'error');throw new Error(error);}
    }
    for(const input of sessionContext.settingsTable.querySelectorAll('[data-setting-type="number"]')){
      const error=sessionContext.schemaDocumentNumericFieldError(input);
      if(error){input.focus();sessionContext.setStatus(error,'error');throw new Error(error);}
    }
    for(const input of sessionContext.settingsTable.querySelectorAll('[data-setting-type="json-value"],[data-setting-type="json-array"]')){
      let parsed;
      try{parsed=JSON.parse(input.value)}catch{
        const error=`${input.getAttribute('aria-label')||'Value'} must be valid JSON.`;
        input.focus();sessionContext.setStatus(error,'error');throw new Error(error);
      }
      if(input.dataset.settingType==='json-array'&&!Array.isArray(parsed)){
        const error=`${input.getAttribute('aria-label')||'Value'} must be a JSON array.`;
        input.focus();sessionContext.setStatus(error,'error');throw new Error(error);
      }
    }
  }
  sessionContext.flushSchemaDraftEditors();
  if(!sessionContext.settingsDraftDirty)return false;
  if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'&&sessionContext.schemaValueCompatibilityApplies(sessionContext.settingsDraft,sessionContext.selectedPath)){
    try{sessionContext.validateSchemaValueDeclarationCompatibility(sessionContext.selectedDocumentValue(),sessionContext.settingsDraft)}
    catch(error){sessionContext.setStatus(`Could not apply ${sessionContext.selectedLabel||'value control'}. ${error.message}`,'error');throw error;}
  }
  const label=sessionContext.selectedLabel||'current item',previousItem=sessionContext.valueAt(sessionContext.selectedPath);
  const previewAffected=sessionContext.hasAnyEditorRole('previewInvalidationRoles',sessionContext.selectedPath);
  try{
    const itemKeyPolicy=sessionContext.resolveModelEditorSchema(sessionContext.modelEditorSchemaForPath(sessionContext.model,sessionContext.selectedPath))?.['x-fullmeta-edit']?.objectKeyFrom;
    const nextItemKey=typeof itemKeyPolicy==='string'&&typeof sessionContext.settingsDraft?.[itemKeyPolicy]==='string'
      ?sessionContext.settingsDraft[itemKeyPolicy]:null;
    const candidate=sessionContext.modelWithEditorSettingsDraft(sessionContext.model,sessionContext.selectedPath,sessionContext.cloneJson(sessionContext.settingsDraft));
    if(sessionContext.relatedFieldsDraft){
      for(const encodedPath of sessionContext.relatedFieldsDraftPaths){
        const path=JSON.parse(encodedPath),value=path.reduce((node,key)=>node?.[key],sessionContext.relatedFieldsDraft);
        let target=candidate;
        for(const key of path.slice(0,-1)){
          if(!target||typeof target!=='object'||!Object.hasOwn(target,key))throw new Error(`Related field ${path.join('.')} is no longer available.`);
          target=target[key];
        }
        if(!target||typeof target!=='object'||!Object.hasOwn(target,path.at(-1)))throw new Error(`Related field ${path.join('.')} is no longer available.`);
        target[path.at(-1)]=sessionContext.cloneJson(value);
      }
    }
    if(sessionContext.activeApplicationPackage?.kind==='schemaDocument'){
      const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate);
      if(generatedIssue)throw new Error(generatedIssue);
    }
    const errors=sessionContext.validateFullMetaModelWithRules(candidate);
    if(errors.length){const error=new Error(errors[0]);error.validationErrors=errors;throw error;}
    sessionContext.model=candidate;
    for(const [key,draft] of sessionContext.rawFieldDrafts){
      if(sessionContext.samePath(draft.selection,sessionContext.selectedPath)&&relatedPathsAtCommit.has(JSON.stringify(draft.path)))sessionContext.rawFieldDrafts.delete(key);
    }
    sessionContext.relatedFieldsDraft=null;sessionContext.relatedFieldsDraftPaths.clear();
    if(nextItemKey&&typeof sessionContext.selectedPath.at(-1)==='string'&&nextItemKey!==sessionContext.selectedPath.at(-1)){
      sessionContext.selectedPath=[...sessionContext.selectedPath.slice(0,-1),nextItemKey];
    }
  }catch(error){const issues=error.validationErrors||[error.message];sessionContext.$('#resolved-values').textContent=`Settings were not applied because model validation found issue(s):\n${issues.slice(0,80).join('\n')}`;sessionContext.setStatus(`Could not apply ${label}. ${issues[0]}`,'error');sessionContext.updateModelEditState();throw error;}
  sessionContext.settingsDraftDirty=false;
  sessionContext.refreshSelectedSchemaDeclarationLabel();
  if(previewAffected)sessionContext.invalidatePreviewArtifacts();sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);sessionContext.jsonDraftDirty=false;
  sessionContext.updateApplySettingsVisibility();
  if(refresh)sessionContext.renderModel();
  if(sessionContext.isResultPath(sessionContext.selectedPath)){
    const action=sessionContext.valueAt(sessionContext.selectedPath);
    if(sessionContext.isTabularResultAction(action)&&sessionContext.lastSweepRender?.action?.id===action.id)sessionContext.drawSweepResult(action,sessionContext.lastSweepRender.entries,sessionContext.model);
    else if(sessionContext.isFieldResultAction(action)&&JSON.stringify(previousItem?.filters)!==JSON.stringify(action.filters)){
      sessionContext.resultSelections[action.id]=sessionContext.activeApplicationPackage.resultPresentation.selectionAfterFilterChange(sessionContext.resultSelections[action.id]);
      sessionContext.loadResultAction(action).catch((error)=>sessionContext.showResultMessage(error.message,'error'));
    }
  }
  sessionContext.updateModelEditState();
  if(announce)sessionContext.setStatus(`Applied edits to ${label}. Save to keep the change.`,'good');
  return true;
}

export function updateFieldSummary(sessionContext, {overview=false}={}){
  const panel=sessionContext.applicationExtension('fieldSummary');
  if(!panel)return;
  if(!panel)return;
  if(!overview||!sessionContext.model||!sessionContext.activeApplicationPackage?.renderFieldSummary){panel.hidden=true;renderOwnedView(panel,null);return;}
  renderOwnedView(panel,sessionContext.activeApplicationPackage.renderFieldSummary({
    model: sessionContext.model,profile:sessionContext.activeScenario(),dimension:sessionContext.activeScenarioDimension(),scenarioMetadata: sessionContext.scenarioMetadata,
    editorOptions:sessionContext.editorOptions(),copy:sessionContext.activeApplicationPackage.modelEditorUi.fieldSummary,
    profileCopy: sessionContext.profileCopy,escapeHtml:sessionContext.esc,
  }));
  panel.hidden=false;
}

export function renderFieldSettings(sessionContext){
  const renderer=sessionContext.activeApplicationPackage?.renderResultSettings;
  if(!renderer){const host=sessionContext.applicationExtension('resultSettings');if(host){host.hidden=true;host.replaceChildren()}return;}
  renderer({$: sessionContext.$,isResultPath: sessionContext.isResultPath,selectedPath: sessionContext.selectedPath,valueAt: sessionContext.valueAt,currentTab: sessionContext.currentTab,isFieldResultAction: sessionContext.isFieldResultAction,activeUiProfile: sessionContext.activeUiProfile,formatFieldFrequency: sessionContext.formatFieldFrequency,model: sessionContext.model,fieldPlotState: sessionContext.fieldPlotState,fieldPlotLoadStatus: sessionContext.fieldPlotLoadStatus,jsonDraftDirty: sessionContext.jsonDraftDirty,modelEditorUi:sessionContext.activeApplicationPackage.modelEditorUi,dimension:sessionContext.activeScenarioDimension(),profileCopy: sessionContext.profileCopy,applicationResultAdapter: sessionContext.applicationResultAdapter,modelEditorSchemaForPath: sessionContext.modelEditorSchemaForPath,compatibleUnitsFor: sessionContext.compatibleUnitsFor,modelUnitChoices: sessionContext.modelUnitChoices,esc: sessionContext.esc,applyProfileAttributes: sessionContext.applyProfileAttributes,applyProfileVisibility: sessionContext.applyProfileVisibility,setStatus: sessionContext.setStatus,updateFieldPlotRecipe: sessionContext.updateFieldPlotRecipe,drawPreview: sessionContext.drawPreview,loadResultAction: sessionContext.loadResultAction,showResultMessage: sessionContext.showResultMessage,updateFieldCutPlanePosition: sessionContext.updateFieldCutPlanePosition,ensureSelectedResultActionLoad: sessionContext.ensureSelectedResultActionLoad,fieldPointLabel: sessionContext.fieldPointLabel,copy:sessionContext.activeApplicationPackage.modelEditorUi.fieldSettingsCopy,resetCamera:sessionContext.resetPreviewCamera,rerender:sessionContext.renderFieldSettings});
}

export function definitionLabel(sessionContext, definition){
  return String(definition?.description||definition?.symbol||'Unnamed definition').trim()||'Unnamed definition';
}

export function definitionControlLabel(sessionContext, definition){
  return String(definition?.symbol??'').trim()||sessionContext.definitionLabel(definition);
}

export function definitionCollectionConfig(sessionContext, kind){return sessionContext.activeApplicationPackage?.modelEditorUi?.definitionCollections?.[kind]||{tableLabel:kind,emptyLabel:kind,addLabel:'item',symbolRole:kind,reservedSymbols:'expression'}}

export function definitionCollectionPath(sessionContext, kind){const path=sessionContext.editorRolePath(sessionContext.definitionCollectionConfig(kind).symbolRole);if(!path.length)throw new Error(`The active application has no path for definition collection ${kind}.`);return path}

export function definitionCollectionKindForPath(sessionContext, path){return Object.keys(sessionContext.activeApplicationPackage?.modelEditorUi?.definitionCollections||{}).find(kind=>sessionContext.samePath(sessionContext.definitionCollectionPath(kind),path))||null}

export function definitionCollectionLabel(sessionContext, kind){
  const declaration=sessionContext.modelEditorSchemaForPath(sessionContext.model,sessionContext.definitionCollectionPath(kind),{resolveVariant:false});
  return declaration?.title||sessionContext.resolveModelEditorSchema(declaration)?.title||kind;
}

export function refreshDefinitionRow(sessionContext, index,definition){
  const input=sessionContext.settingsTable.querySelector(`[data-definition-index="${index}"]`),row=input?.closest('tr');
  if(!row)return;
  const label=sessionContext.definitionControlLabel(definition);
  for(const control of row.querySelectorAll('[data-definition-field]')){
    const field=control.dataset.definitionField;
    control.setAttribute('aria-label',`${label} ${field==='unit'?'unit':field}`);
  }
  row.querySelector('[data-definition-remove]')?.setAttribute('aria-label',`Delete ${label}`);
  for(const button of row.querySelectorAll('[data-row-move]')){const description=`Move ${label} ${button.dataset.rowMove}`;button.setAttribute('aria-label',description);button.title=description;}
  const valueCell=row.querySelector('.definition-value');
  if((valueCell&&sessionContext.definitionCollectionConfig(sessionContext.selectedCollection).showResolvedValue)){
    try{const resolved=sessionContext.resolveModelParameters(sessionContext.modelValueAtRole(sessionContext.definitionCollectionConfig(sessionContext.selectedCollection).symbolRole)),si=resolved?.[definition.symbol]?.value,scale=sessionContext.getUnit(definition.unit).scale;valueCell.textContent=Number.isFinite(si)?Number(si/scale).toPrecision(6):'—';valueCell.title='';}
    catch(error){valueCell.textContent='—';valueCell.title=error.message;}
  }
}

export function setDefinitionInputError(sessionContext, input,message=''){
  if(!input)return;
  if(message){input.setAttribute('aria-invalid','true');input.title=message;}
  else{input.removeAttribute('aria-invalid');input.removeAttribute('title');}
}

export function commitDefinitionInput(sessionContext, definitionInput){
  if(!definitionInput||!sessionContext.selectedCollection)return false;
  const list=sessionContext.valueAt(sessionContext.definitionCollectionPath(sessionContext.selectedCollection)),definitionIndex=Number(definitionInput.dataset.definitionIndex),field=definitionInput.dataset.definitionField;
  let definition=list[definitionIndex];
  if(!definition)return false;
  const value=definitionInput.value.trim();
  if(value===definitionInput.dataset.definitionCommittedValue)return false;
  if(field==='symbol'){
    const reserved=sessionContext.definitionCollectionConfig(sessionContext.selectedCollection).reservedSymbols==='parameter'?sessionContext.reservedParameterSymbolsForModel(sessionContext.model):sessionContext.reservedExpressionSymbolsForModel(sessionContext.model);
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)||reserved.has(value)){const message=`The symbol “${value}” is invalid or reserved for a built-in expression value.`;sessionContext.setDefinitionInputError(definitionInput,message);sessionContext.setStatus(message,'error');return false;}
    if(['parameter','globalVariable','pointwiseVariable'].flatMap((role)=>sessionContext.modelValueAtRole(role)||[]).some((entry)=>entry!==definition&&entry.symbol===value)){const message=`The symbol ${value} is already in use.`;sessionContext.setDefinitionInputError(definitionInput,message);sessionContext.setStatus(message,'error');return false;}
    if(value!==definition.symbol){
      let candidate;
      try{candidate=sessionContext.modelWithRenamedDefinitionSymbol(sessionContext.model,sessionContext.definitionCollectionPath(sessionContext.selectedCollection),definitionIndex,value);}
      catch(error){const errors=error.validationErrors||[error.message],message=`Cannot rename ${definition.symbol}. ${errors.slice(0,3).join(' ')}`;sessionContext.setDefinitionInputError(definitionInput,message);sessionContext.setStatus(message,'error');return false;}
      sessionContext.model=candidate;definition=sessionContext.valueAt(sessionContext.definitionCollectionPath(sessionContext.selectedCollection))[definitionIndex];
    }
  }else{
    definition[field]=value;
  }
  definitionInput.dataset.definitionCommittedValue=value;
  sessionContext.setDefinitionInputError(definitionInput);
  if(sessionContext.definitionCollectionConfig(sessionContext.selectedCollection).invalidatePreview)sessionContext.invalidatePreviewArtifacts();
  sessionContext.refreshDefinitionRow(definitionIndex,definition);
  sessionContext.renderTree();sessionContext.drawPreview();sessionContext.reportDefinitionChange(definition);
  return true;
}

export function commitSettingsInput(sessionContext, input){
  if(!input||!sessionContext.hasSettingsDraft())return false;
  const path=JSON.parse(input.dataset.settingPath),type=input.dataset.settingType;
  if(!input.dataset.settingSourcePath&&!sessionContext.editedSettingsInputs.has(input)&&path.reduce((value,key)=>value?.[key],sessionContext.settingsDraft)===undefined){
    const parentPath=path.slice(0,-1),parent=parentPath.reduce((value,key)=>value?.[key],sessionContext.settingsDraft);
    const parentSchema=path.length&&parent&&typeof parent==='object'&&!Array.isArray(parent)
      ?sessionContext.resolveModelEditorSchema(sessionContext.selectedDocumentSchema([...(sessionContext.selectedPath||[]),...parentPath])):null;
    if(!parentSchema?.required?.includes(path.at(-1)))return false;
  }
  const actionError=sessionContext.schemaActionFacingError(input);
  if(actionError){sessionContext.setStatus(actionError,'error');return false;}
  if(input.dataset.settingSourcePath){
    if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||type!=='string')return false;
    try{
      if(sessionContext.jsonDraftDirty)throw new Error('Apply the current JSON draft before editing this schema action.');
      const sourcePath=JSON.parse(input.dataset.settingSourcePath);
      if(!Array.isArray(sourcePath)||!Array.isArray(path)||!path.length)throw new Error('The action source is unavailable.');
      sessionContext.applyCurrentSettingsDraft({refresh:false});
      const sourceDocument=sessionContext.model;
      const sourceValue=sourcePath.reduce((value,key)=>value?.[key],sourceDocument);
      if(!sessionContext.isRecord(sourceValue))throw new Error('The action source no longer exists.');
      const next=sessionContext.cloneJson(sourceValue);
      let target=next;
      for(const key of path.slice(0,-1)){
        if(!sessionContext.isRecord(target[key])&&!Array.isArray(target[key]))throw new Error('The action field no longer exists.');
        target=target[key];
      }
      const key=path.at(-1);
      if(target[key]===input.value)return false;
      target[key]=input.value;
      const candidate=sessionContext.modelWithEditorSettingsDraft(sessionContext.model,sourcePath,next);
      const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate);
      if(generatedIssue)throw new Error(generatedIssue);
      const errors=sessionContext.validateFullMetaModelWithRules(candidate);
      if(errors.length)throw new Error(errors[0]);
      sessionContext.model=candidate;
      sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);sessionContext.jsonDraftDirty=false;
      if(path.at(-1)==='label')input.closest('.schema-focused-action')?.querySelector('strong')?.replaceChildren(document.createTextNode(input.value));
      sessionContext.renderTree();sessionContext.updateModelEditState();sessionContext.syncModelActionAvailability();
      sessionContext.setStatus(`Updated ${input.getAttribute('aria-label')||'item action'}. Save to keep the schema change.`,'good');
      return true;
    }catch(error){sessionContext.setStatus(error.message,'error');return false;}
  }
  const numericError=sessionContext.schemaDocumentNumericFieldError(input);
  if(numericError){sessionContext.setStatus(numericError,'error');return false;}
  if(path.length===0&&sessionContext.selectedPath?.length){
    let next;
    if(type==='boolean')next=input.checked;
    else if(type==='number'){
      next=Number(input.value);
      if(!Number.isFinite(next)){sessionContext.setStatus(`${sessionContext.selectedLabel||'Value'} must be a finite number.`,'error');return false;}
    }else if(type==='json-array'||type==='json-value'){
      try{next=JSON.parse(input.value)}catch{sessionContext.setStatus(`${sessionContext.selectedLabel||'Value'} must be valid JSON.`,'error');return false;}
      if(type==='json-array'&&!Array.isArray(next)){sessionContext.setStatus(`${sessionContext.selectedLabel||'Value'} must be a JSON array.`,'error');return false;}
    }else if(type==='array-string-select')next=Array.from(input.selectedOptions,option=>option.value);
    else next=input.value;
    if(JSON.stringify(sessionContext.settingsDraft)===JSON.stringify(next))return false;
    sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;sessionContext.syncModelActionAvailability();
    sessionContext.setStatus(`Updated ${sessionContext.selectedLabel||'value'}. Apply item or continue to another action to commit it to the JSON document.`);
    return true;
  }
  let target=sessionContext.settingsDraft;
  for(const [index,key] of path.slice(0,-1).entries()){
    if(target[key]===undefined){
      const schema=sessionContext.resolveModelEditorSchema(sessionContext.selectedDocumentSchema([...(sessionContext.selectedPath||[]),...path.slice(0,index+1)]))||{};
      target[key]=Object.hasOwn(schema,'default')?sessionContext.cloneJson(schema.default):typeof path[index+1]==='number'?[]:{};
    }
    target=target[key];
  }
  const key=path.at(-1),removeOptional=(type==='number'&&input.dataset.settingOptional==='true'&&input.value.trim()==='')
    ||(type==='optional-boolean'&&input.value==='')
    ||(type==='string'&&input.dataset.settingOptional==='true'&&input.value.trim()==='');let next;
  if(type==='boolean')next=input.checked;
  else if(type==='optional-boolean')next=input.value==='true';
  else if(type==='number'){
    if(!removeOptional){
      next=Number(input.value);
      if(!Number.isFinite(next)){sessionContext.setStatus(`${sessionContext.pathLabel(path)} must be a finite number.`,'error');return false;}
    }
  }else if(type==='json-value'){
    try{next=JSON.parse(input.value)}catch{sessionContext.setStatus(`${sessionContext.pathLabel(path)} must be valid JSON.`,'error');return false;}
  }else if(type==='array-number'||type==='array-string'){
    const values=input.value.split(',').map((entry)=>entry.trim()).filter(Boolean);
    next=type==='array-number'?values.map(Number):values;
    if(type==='array-number'&&next.some((entry)=>!Number.isFinite(entry))){sessionContext.setStatus(`${sessionContext.pathLabel(path)} must contain only numbers.`,'error');return false;}
  }else if(type==='array-string-select')next=Array.from(input.selectedOptions,(option)=>option.value);
  else next=input.value;
  if(removeOptional){if(!Object.hasOwn(target,key))return false;delete target[key];}
  else{
    if(JSON.stringify(target[key])===JSON.stringify(next))return false;
    target[key]=next;
  }
  const change=sessionContext.activeApplicationPackage?.settingsFieldChange?.({draft:sessionContext.settingsDraft,path,value:next,model: sessionContext.model,selectedPath: sessionContext.selectedPath,ui:sessionContext.activeApplicationPackage.modelEditorUi})||{};
  sessionContext.settingsDraftDirty=true;
  if(sessionContext.schemaStructureDialogState&&path.length===1&&path[0]==='$ref')sessionContext.syncSchemaStructureDialogHeader();
  if(input.dataset.schemaActionFacing&&path.at(-1)==='label')input.closest('.schema-focused-action')?.querySelector('strong')?.replaceChildren(document.createTextNode(input.value));
  if(change.redrawPreview)sessionContext.drawPreview();
  if(change.refreshSettings)sessionContext.renderSettingsTable();
  sessionContext.syncModelActionAvailability();
  sessionContext.setStatus(change.status||`Updated ${sessionContext.pathLabel(path)} for ${sessionContext.selectedLabel}. Apply item or continue to another action to commit it to the model JSON.`,change.statusKind);
  return true;
}

export function applySettingsDraftAfterFieldBlur(sessionContext){
  if(!sessionContext.settingsDraftDirty)return false;
  try{
    const applied=sessionContext.applyCurrentSettingsDraft({refresh:false,announce:true});
    if(!applied)return false;
    sessionContext.renderTree();
    sessionContext.drawPreview();
    sessionContext.updateWorkflowPanels();
    sessionContext.syncModelActionAvailability();
    return true;
  }catch{
    // Keep invalid or temporarily incomplete settings in the editor so the user can finish them.
    return false;
  }
}

export function reportDefinitionChange(sessionContext, definition){
  const errors=sessionContext.validateFullMetaModel(sessionContext.model);
  sessionContext.syncModelActionAvailability();
  if(errors.length){
    sessionContext.$('#resolved-values').textContent=`Model JSON has ${errors.length} issue(s):\n${errors.slice(0,80).join('\n')}`;
    sessionContext.setStatus(`Updated ${sessionContext.definitionLabel(definition)}, but the model needs correction. ${errors[0]}`,'error');
  }else{
    const details=sessionContext.$('#resolved-values').textContent;
    if(details.startsWith('Model JSON has ')||details.startsWith('Settings were not applied'))sessionContext.$('#resolved-values').textContent='Definition expressions and model references are valid.';
    const saveNeeded=sessionContext.hasUnsavedEditorChanges();
    sessionContext.setStatus(saveNeeded?`Updated ${sessionContext.definitionLabel(definition)}. Save to keep the change.`:`Updated ${sessionContext.definitionLabel(definition)}. The model matches the saved model.`,'good');
  }
}

export function defaultValueForOptionalField(sessionContext, path,schemaNode){
  const schema=sessionContext.resolveModelEditorSchema(schemaNode)||{},vectorUi=schema['x-fullmeta-ui-quantityVector'];
  if(Object.hasOwn(schema,'default'))return sessionContext.cloneJson(schema.default);
  // An absent numeric value needs an editable, invalid draft until the user
  // supplies a number. Do not invent a value or seed it with an object.
  if(schema.type==='number'||schema.type==='integer')return null;
  if(typeof vectorUi?.componentSource==='string'){
    const component=sessionContext.modelComponent();
    const descriptors=sessionContext.activeApplicationPackage?.quantityVectorComponents?.({
      source:vectorUi.componentSource,path,model: sessionContext.model,component,selectedPath: sessionContext.selectedPath,
    })||[];
    return sessionContext.initialQuantityVectorValue(descriptors);
  }
  return{};
}

export function restoreMovedRowFocus(sessionContext, attributes,direction){
  const buttons=Array.from(sessionContext.settingsTable.querySelectorAll('[data-row-move]'));
  const candidates=buttons.filter((button)=>Object.entries(attributes).every(([key,value])=>button.dataset[key]===String(value)));
  const focus=candidates.find((button)=>button.dataset.rowMove===direction&&!button.disabled)||candidates[0]?.closest('.row-move-controls');
  focus?.focus({preventScroll:true});
}

export function moveSettingsTableRow(sessionContext, button){
  if(button.disabled)return;
  const direction=button.dataset.rowMove,offset=direction==='up'?-1:direction==='down'?1:0;
  if(!offset)return;
  try{
    if(!sessionContext.commitInputsBeforeRowMove())return;
    let schemaModel=sessionContext.model;
    if(!sessionContext.selectedCollection&&sessionContext.settingsDraft&&sessionContext.selectedPath?.length){
      // Resolve variant restrictions against the visible draft without committing it.
      schemaModel=sessionContext.cloneJson(sessionContext.model);
      const parent=sessionContext.selectedPath.slice(0,-1).reduce((value,key)=>value?.[key],schemaModel);
      if(!parent)return;
      parent[sessionContext.selectedPath.at(-1)]=sessionContext.settingsDraft;
    }
    if(button.dataset.schemaWidgetAction==='move'&&sessionContext.settingsDraft){
      const context=sessionContext.schemaFieldContext(sessionContext.activeApplicationWidgetRenderers);
      context.schemaAtPath=(path,options)=>sessionContext.modelEditorSchemaForPath(schemaModel,[...(sessionContext.selectedPath||[]),...(path||[])],options);
      const result=sessionContext.applySchemaWidgetAction(button,sessionContext.settingsDraft,context);
      if(!result.changed){if(result.error)sessionContext.setStatus(result.error,'error');return;}
      sessionContext.settingsDraftDirty=true;sessionContext.renderSettingsTable();sessionContext.syncModelActionAvailability();
      sessionContext.restoreMovedRowFocus({schemaWidgetPath:button.dataset.schemaWidgetPath,schemaWidgetRow:result.movedIndex},direction);
      sessionContext.setStatus(result.message,'good');return;
    }
    const path=JSON.parse(button.dataset.rowMovePath||'null'),index=Number(button.dataset.rowMoveIndex),scope=button.dataset.rowMoveScope;
    if(!Array.isArray(path)||!Number.isInteger(index)||!['model','draft'].includes(scope))return;
    const schema=sessionContext.modelEditorSchemaForPath(schemaModel,[...(scope==='draft'?sessionContext.selectedPath||[]:[]),...path]);
    if(!sessionContext.rowReorderingAllowed(schema||{}))return;
    const candidate=scope==='model'?sessionContext.cloneJson(sessionContext.model):sessionContext.settingsDraft;
    const rows=path.reduce((value,key)=>value?.[key],candidate);
    if(!sessionContext.moveArrayRow(rows,index,direction))return;
    if(scope==='model'){sessionContext.model=candidate;sessionContext.renderModel();}
    else{sessionContext.settingsDraftDirty=true;sessionContext.renderSettingsTable();}
    sessionContext.syncModelActionAvailability();sessionContext.updateModelEditState();
    sessionContext.restoreMovedRowFocus({rowMoveScope:scope,rowMovePath:JSON.stringify(path),rowMoveIndex:index+offset},direction);
    sessionContext.setStatus(scope==='model'?'Moved the row. Save to keep the change.':'Moved the row. Apply item or continue to another action to commit it.','good');
  }catch(error){sessionContext.setStatus(error.message,'error');}
}

export function selectDefinitionCollection(sessionContext, kind,button) {
  try{sessionContext.applyCurrentSettingsDraft({refresh:false,announce:true});}catch{return;}
  const previousComponentId=sessionContext.activeComponentId();
  sessionContext.selectedPath=null;sessionContext.selectedCollection=kind;sessionContext.selectedLabel=sessionContext.definitionCollectionLabel(kind);sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;sessionContext.renderTree();
  sessionContext.clearPreviewForComponentChange(previousComponentId,sessionContext.activeComponentId());
  sessionContext.$('#selection-title').textContent=sessionContext.selectedLabel;sessionContext.$('#selection-path').textContent=`${sessionContext.definitionCollectionPath(kind).slice(0,-1).join(' › ')} › ${sessionContext.selectedLabel}`;
  sessionContext.$('#editor-note').textContent=sessionContext.modelEditorCollectionNote(kind);
  sessionContext.updateSelectionActionVisibility();sessionContext.updateWorkflowPanels();sessionContext.settingsTable.parentElement.scrollLeft=0;sessionContext.renderSettingsTable();sessionContext.$('#apply-settings').classList.add('hidden');sessionContext.showDefaultGraphicsScene();
}

export function settingsInsertionTarget(sessionContext, insertion){
  const childPath=insertion.settingsPath;
  if(!Array.isArray(childPath)||!childPath.length||typeof childPath.at(-1)!=='string'){
    throw new Error('The new item needs an object property path.');
  }
  const parentPath=childPath.slice(0,-1),childKey=childPath.at(-1),parent=sessionContext.valueAt(parentPath);
  if(!parent||typeof parent!=='object'||Array.isArray(parent))throw new Error(`Cannot add ${childKey}: its parent item no longer exists.`);
  if(Object.hasOwn(parent,childKey))throw new Error(`Cannot add ${childKey}: that property already exists.`);
  return{childPath,parentPath,childKey,parent};
}

export function syncResultSettingsDraft(sessionContext, action){if(sessionContext.isResultPath(sessionContext.selectedPath)&&sessionContext.valueAt(sessionContext.selectedPath)?.id===action.id){sessionContext.settingsDraft=sessionContext.cloneJson(action);sessionContext.settingsDraftDirty=false;if(!sessionContext.jsonDraftDirty)sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);sessionContext.renderSettingsTable()}sessionContext.updateModelEditState();sessionContext.syncModelActionAvailability()}

export function updateFieldPlotRecipe(sessionContext, actionId,changes){
  if(sessionContext.jsonDraftDirty)throw new Error('Apply the current settings before changing the field plot settings.');
  const action=(sessionContext.modelValueAtRole('result')||[]).find((entry)=>entry.id===actionId);
  if(!action)throw new Error(sessionContext.modelEditorWorkflowCopy('fieldPlotMissing'));
  const updated=sessionContext.modelWithResultActionSettings(sessionContext.model,actionId,action.type,changes);
  sessionContext.model=updated.model;sessionContext.syncResultSettingsDraft(updated.action);return updated.action;
}

export function updateFieldCutPlanePosition(sessionContext, actionId,axis,position){
  const action=(sessionContext.modelValueAtRole('result')||[]).find((entry)=>entry.id===actionId),state=sessionContext.fieldPlotState?.actionId===actionId?sessionContext.fieldPlotState:null;
  if(!action||!state||state.data.dimension!==3)throw new Error('The selected 3D field plot is no longer available.');
  const {cutPlanePositions,cutPlanes,slices}=sessionContext.activeApplicationPackage.resultPresentation.cutPlaneChange({
    action,state,axis,position,parameters:sessionContext.modelValueAtRole('parameter')||[],
  });
  const updated=sessionContext.updateFieldPlotRecipe(actionId,{cutPlanePositions});
  state.action=updated;state.cutPlanes=cutPlanes;Object.assign(state,slices);
  sessionContext.drawPreview();sessionContext.renderFieldSettings();sessionContext.setStatus(`Updated the ${axis.toUpperCase()} cut plane. Save to keep the change.`,'good');
  return updated;
}
