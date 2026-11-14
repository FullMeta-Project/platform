import {SchemaStructureInspection} from '../structure-inspection.js';
import React from '../../shared/react/react-runtime.js';
import {renderOwnedView,joinView} from '../../../runtime/owned-view.js';
import {SchemaField,SchemaObject,SchemaStructure} from '../schema-form.js';
import {isGeneratedIdentityPath} from '../../../runtime/field-commands.js';
import {RowMoveControls} from '../../shared/react/collection-controls.js';
import {SchemaToolButtons,SchemaAuthoringPreview,SchemaTduvMetrics,renderSchemaOptionList} from '../schema-session-views.js';
export function validateBulkSchemaCandidate(sessionContext, candidate,{allowGeneratedSubtrees=[]}={}){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document first.');
  sessionContext.assertDeclarativeDocument(candidate);
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate,{allowGeneratedSubtrees});
  if(generatedIssue)throw new Error(generatedIssue);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The schema is not ready to apply: ${errors[0]}`);
}

export function applyBulkSchemaCandidate(sessionContext, candidate,message,options={}){
  sessionContext.validateBulkSchemaCandidate(candidate,options);
  sessionContext.model=candidate;sessionContext.renderModel();sessionContext.syncModelActionAvailability();sessionContext.setStatus(message,'good');
}

export function validateGeneratedOverlayCandidate(sessionContext, candidate,edits){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document first.');
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const expected=sessionContext.schemaWithGeneratedFieldOverlays(sessionContext.model,edits).document;
  if(JSON.stringify(candidate)!==JSON.stringify(expected))throw new Error('The generated overlay preview is out of date. Reopen it.');
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The schema is not ready to apply: ${errors[0]}`);
}

export function validateFactoredSchemaCandidate(sessionContext, candidate,parameters){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document first.');
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  // This guided operation is allowed to move generated ownership only when
  // the entire result exactly matches its deterministic transformation.
  const expected=sessionContext.schemaWithFactoredDefinition(sessionContext.model,parameters,sessionContext.schemaGeneratedOwnerAtPath).document;
  if(JSON.stringify(candidate)!==JSON.stringify(expected))throw new Error('The factoring preview is out of date. Reopen it.');
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The schema is not ready to apply: ${errors[0]}`);
}

export function schemaAuthoringTools(sessionContext){
  const presentation=sessionContext.activeApplicationPackage?.schemaEditorPresentation;
  // A new interpreter can author its tool table through the generic contract editor.
  const declared=presentation?.tools?.length?presentation:{...presentation,tools:[{id:'bulk-contracts',label:'Root contracts',group:'Root contracts'}]};
  return sessionContext.declaredSchemaAuthoringTools(declared,{
    widgetCatalog:sessionContext.activeApplicationPackage?.authoringWidgetCatalog,commands:sessionContext.schemaAuthoringCommands,
  });
}

export async function openSchemaAuthoringTool(sessionContext, id,path=[]){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document before using its authoring tools.');
  const declaration=sessionContext.schemaAuthoringTools().find(tool=>tool.id===id);
  if(!declaration)throw new Error('This authoring tool is not declared by the interpreting schema.');
  await sessionContext.schemaAuthoringCommands[id](path);
  sessionContext.activeAuthoringTool={id,path:[...path]};
  const dialog=sessionContext.schemaDialogControllers?.[id]?.dialog||[...document.querySelectorAll('dialog[open]')].at(-1);
  if(dialog){dialog.dataset.authoringTool=id;dialog.dataset.authoringPath=JSON.stringify(path);}
}

export function visibleSchemaAuthoringTools(sessionContext){
  const tools=sessionContext.schemaAuthoringTools();
  return tools.some(tool=>tool.id==='bulk-schema-authoring')
    ?tools.filter(tool=>!['bulk-constraints','nested-structure'].includes(tool.id)):tools;
}

export function renderSchemaAuthoringToolButtons(sessionContext){
  renderOwnedView(sessionContext.bulkButtons,React.createElement(SchemaToolButtons,{tools:sessionContext.visibleSchemaAuthoringTools(),onTool:id=>{
    try{const path=sessionContext.schemaAuthoringDialogState?.target?.itemPath||[];sessionContext.closeSchemaAuthoringDialog();void sessionContext.openSchemaAuthoringTool(id,path).catch(error=>sessionContext.setStatus(error.message,'error'));}
    catch(error){sessionContext.setStatus(error.message,'error')}
  }}));
}

export function resolveSchemaWidgetPresentation(sessionContext, value, profiles) {
  if (!sessionContext.isRecord(value) || !sessionContext.isRecord(profiles)) return null;
  const behavior = sessionContext.fieldUiBehavior(value);
  const view = sessionContext.legacyFieldUiView(value);
  let widget = behavior?.payload?.widget?.type || sessionContext.schemaWidget(view);
  let profile = widget && sessionContext.isRecord(profiles[widget]) ? profiles[widget] : null;
  if (!profile) {
    const entries = Object.entries(profiles).filter(([, candidate]) => sessionContext.isRecord(candidate)
      && typeof candidate.annotation === 'string' && sessionContext.isRecord(view[candidate.annotation]));
    if (entries.length === 1) [widget, profile] = entries[0];
    else return null;
  }
  const annotation = behavior?.payload?.widget?.settings || view[profile?.annotation];
  if (!profile || !sessionContext.isRecord(annotation)) return null;
  if (Array.isArray(profile.requiresAny) && !profile.requiresAny.some(key => {
    const candidate = annotation[key];
    return Array.isArray(candidate) ? candidate.length > 0
      : typeof candidate === 'string' ? candidate.trim().length > 0
      : candidate !== undefined && candidate !== null && candidate !== false;
  })) return null;
  if (profile.requiresEmptyUiGroup === true) {
    const ui = behavior?.payload?.presentation || view['x-fullmeta-ui'];
    // A tree icon is independent of the field's widget authoring controls.
    if (ui !== undefined && (!sessionContext.isRecord(ui) || Object.keys(ui).some(key => key !== 'icon'))) return null;
  }
  return { widget, profile };
}

export function schemaUiWidgetOptions(sessionContext, catalog, profiles) {
  if (sessionContext.activeApplicationPackage?.widgetCatalog) return sessionContext.activeApplicationPackage.widgetCatalog.widgets
    .filter(widget=>widget.category==='field')
    .map(widget=>({widget:widget.id,label:`${widget.label} · ${widget.catalogLabel}${profiles?.[widget.id]?'':' · structured settings'}`,profile:profiles?.[widget.id]}));
  if (!sessionContext.isRecord(profiles) || !Array.isArray(catalog?.types)) return [];
  const labels = new Map();
  for (const type of catalog.types) {
    const widget = typeof type?.widget === 'string' ? type.widget
      : Array.isArray(type?.widgets) && type.widgets.length === 1 ? type.widgets[0] : null;
    if (widget && typeof type?.label === 'string') labels.set(widget, type.label);
  }
  return Object.entries(profiles)
    .filter(([, profile]) => sessionContext.isRecord(profile) && profile.editor === 'annotation')
    .map(([widget, profile]) => ({ widget, profile, label: labels.get(widget) || profile.authoring?.label || widget }))
    .filter(option => labels.has(option.widget));
}

export function schemaUiWidgetContexts(sessionContext, {options,document,file,path,fieldName}) {
  return Object.fromEntries(options.map(({widget,profile})=>{
    let context=profile?.context==='schemaWidget'
      ?sessionContext.schemaWidgetDesignContext({document,path,file}):null;
    context={...(context||{}),
      schemaVariantCopy:sessionContext.activeApplicationPackage?.schemaVariantCopy?.[widget],
      schemaVariants:source=>sessionContext.activeApplicationPackage?.schemaVariantProviders?.[widget]?.(
        source,sessionContext.activeApplicationPackage.schemaSourceFiles(sessionContext.model),fieldName)??[],
      applySchemaVariant:(variant,rowValues)=>sessionContext.applySchemaComponentVariant(variant,rowValues,widget,profile),
      saveSchemaVariant:variant=>sessionContext.saveSchemaComponentVariant(variant,widget,profile),
    };
    return [widget,context];
  }));
}

export function schemaValidationPointerPath(sessionContext, pointer) {
  const parts=sessionContext.validationRulePointerParts(pointer);
  let value=sessionContext.model;
  return parts.map(part=>{
    const key=Array.isArray(value)&&/^(0|[1-9]\d*)$/.test(part)?Number(part):part;
    value=value?.[key];
    return key;
  });
}

export function schemaValidationRulesForField(sessionContext, binding, sources) {
  const pathMatches = (path) => Array.isArray(path) && path.length >= binding.length
    && binding.every((part, index) => part === '*' || String(path[index]) === String(part) || String(path[index]) === '*');
  return sessionContext.validationProgramDesigner.rulesForBinding(binding, sources)
    .filter(rule => (rule.readPaths || []).some(pathMatches));
}

export function applySchemaUiAnnotation(sessionContext, {entry,schema,title,jsonKey}){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||entry?.file!==sessionContext.activeApplicationPackage.rootDocumentFile){
    throw new Error('This UI annotation is not in the open schema document.');
  }
  if(!Array.isArray(entry.path))throw new Error('The schema property path is unavailable.');
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const uiAnnotationChanged=JSON.stringify(schema)!==JSON.stringify(entry.schema);
  const titleChanged=(typeof title==='string'?title.trim():'')
    !==(typeof entry.schema.title==='string'?entry.schema.title:'');
  if(typeof jsonKey!=='string'||!jsonKey.trim())throw new Error('Enter a JSON key.');
  const nextKey=jsonKey;
  const oldKey=entry.propertyName||entry.path.at(-1);
  let candidate=sessionContext.modelWithEditorSettingsDraft(sessionContext.model,entry.path,schema);
  let nextPath=[...entry.path];
  if(nextKey!==oldKey){
    if(entry.path.at(-2)!=='properties')throw new Error('This JSON key cannot be renamed from the property panel.');
    const parentPath=entry.path.slice(0,-2);
    const parent=parentPath.reduce((value,key)=>value?.[key],candidate);
    if(!sessionContext.isRecord(parent?.properties)||!Object.hasOwn(parent.properties,oldKey))throw new Error('The schema property no longer exists.');
    if(Object.hasOwn(parent.properties,nextKey))throw new Error(`The JSON key ${nextKey} already exists.`);
    const properties=Object.fromEntries(Object.entries(parent.properties)
      .map(([key,value])=>[key===oldKey?nextKey:key,value]));
    const updatedParent=sessionContext.schemaWithEditedProperties(parent,properties,{action:'rename',from:oldKey,to:nextKey});
    candidate=sessionContext.modelWithEditorSettingsDraft(candidate,parentPath,updatedParent);
    nextPath=[...parentPath,'properties',nextKey];
  }
  const editedSchema=nextPath.reduce((value,key)=>value?.[key],candidate);
  if(!sessionContext.isRecord(editedSchema))throw new Error('The schema property could not be updated.');
  if(typeof title==='string'&&title.trim())editedSchema.title=title.trim();
  else delete editedSchema.title;
  const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate);
  if(generatedIssue)throw new Error(generatedIssue);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The edited UI annotation is invalid: ${errors[0]}`);
  sessionContext.model=candidate;
  sessionContext.renderModel();sessionContext.syncModelActionAvailability();
  const renamed=nextKey!==oldKey;
  const changes=[renamed?`Renamed JSON key ${oldKey} to ${nextKey}`:'',titleChanged?'updated title':'',uiAnnotationChanged?'updated UI annotations':'']
    .filter(Boolean).join('; ')||'Applied field changes';
  sessionContext.setStatus(`${changes} in ${entry.file}. Save to write the changes to disk.`,'good');
  return {schema:sessionContext.valueAt(nextPath),propertyName:nextKey,path:nextPath};
}

export function applySchemaValidationExpression(sessionContext, { rule, edits, entry }) {
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||rule.file!==sessionContext.activeApplicationPackage.rootDocumentFile){
    throw new Error('This validation rule is not in the open schema document.');
  }
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const preconditions=[{pointer:rule.pointer,value:rule.sourceRule},
    ...(rule.controls||[]).map(control=>({pointer:control.pointer,value:control.value}))];
  const candidate=sessionContext.documentWithValidationEdits(sessionContext.model,edits,{preconditions});
  const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate);
  if(generatedIssue)throw new Error(generatedIssue);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The edited schema is invalid: ${errors[0]}`);
  sessionContext.model=candidate;
  sessionContext.renderModel();sessionContext.syncModelActionAvailability();
  sessionContext.setStatus('Applied validation expression to the open schema. Save to keep the change.','good');
  const sources=sessionContext.activeApplicationPackage.schemaSourceFiles(sessionContext.model);
  const rules=entry.fieldOnly
    ?sessionContext.schemaValidationRulesForField(entry.binding,sources)
    :sessionContext.validationProgramDesigner.rulesForBinding(entry.binding,sources);
  return {rules};
}

export function openStructuredValidationRule(sessionContext, rule) {
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||rule.file!==sessionContext.activeApplicationPackage.rootDocumentFile)return false;
  const path=sessionContext.validationRulePointerParts(rule.pointer);
  return sessionContext.openSchemaStructureDialog({label:rule.message||rule.label||'Validation rule',path,projection:null},null);
}

export function applicationSchemaApi(sessionContext){return sessionContext.activeApplicationPackage?.modelEditorSchema||null}

export function modelEditorSchemaForPath(sessionContext, ...args){return sessionContext.applicationSchemaApi()?.modelEditorSchemaForPath(...args)??null}

export function modelEditorSchemaProperty(sessionContext, ...args){return sessionContext.applicationSchemaApi()?.modelEditorSchemaProperty(...args)??null}

export function modelEditorSchemaItem(sessionContext, ...args){return sessionContext.applicationSchemaApi()?.modelEditorSchemaItem(...args)??null}

export function resolveModelEditorSchema(sessionContext, ...args){const resolved=sessionContext.applicationSchemaApi()?.resolveModelEditorSchema(...args)??null;return sessionContext.isRecord(resolved)?sessionContext.legacyFieldUiView(resolved):resolved}

export function schemaAuthoringTargetForPropertyPath(sessionContext, text){
  const pathText=String(text||'').trim();
  if(pathText==='#')return {itemPath:[],schemaProjection:{binding:[]}};
  const binding=pathText.split('.').map(part=>part.trim());
  if(!binding.length||binding.some(part=>!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(part))){
    throw new Error('Enter a dotted schema property path such as model.physics or scenario.');
  }
  let path=[],declaration=sessionContext.model;
  const seen=new Set();
  const followReference=()=>{
    while(sessionContext.isRecord(declaration)&&typeof declaration.$ref==='string'){
      const reference=declaration.$ref;
      if(!reference.startsWith('#/'))throw new Error('The target path uses an external reference. Select a local declaration.');
      if(seen.has(reference))throw new Error('The target path contains a recursive reference.');
      seen.add(reference);
      path=reference.slice(2).split('/').map(part=>decodeURIComponent(part).replace(/~1/g,'/').replace(/~0/g,'~'));
      declaration=sessionContext.valueAt(path);
      if(!declaration)throw new Error(`The target reference ${reference} cannot be resolved.`);
    }
  };
  for(const key of binding){
    followReference();
    if(!sessionContext.isRecord(declaration?.properties)||!Object.hasOwn(declaration.properties,key)){
      throw new Error(`The target property ${key} does not exist at ${pathText}.`);
    }
    path=[...path,'properties',key];declaration=declaration.properties[key];
  }
  followReference();
  if(!sessionContext.isSchemaTreeDeclaration(sessionContext.model,path))throw new Error('The target property is not a schema declaration.');
  return {itemPath:path,schemaProjection:{binding}};
}

export function selectSchemaAuthoringTargetPath(sessionContext){
  const state=sessionContext.schemaAuthoringDialogState;if(!state)return;
  const pathText=sessionContext.$('#schema-authoring-target-path')?.value.trim()||'';
  try{
    const target=pathText?sessionContext.schemaAuthoringTargetForPropertyPath(pathText):state.originalTarget;
    const options=sessionContext.schemaAuthoringOptionsForTarget(target);
    if(!options.length)throw new Error('Choose an object or array declaration.');
    const previousOperation=sessionContext.$('#schema-authoring-operation')?.value;
    state.target=target;state.appliedTargetPath=pathText;state.preview=null;
    renderSchemaOptionList(sessionContext.$('#schema-authoring-operation'),options,previousOperation);
    sessionContext.renderSchemaAuthoringInputs();
    sessionContext.invalidateSchemaAuthoringPreview();
  }catch(error){
    sessionContext.$('#schema-authoring-status').textContent=error.message;
    sessionContext.$('#schema-authoring-status').hidden=false;
    sessionContext.$('#schema-authoring-apply').disabled=true;
  }
}

export function schemaAuthoringOptionsForTarget(sessionContext, target){
  const path=Array.isArray(target?.itemPath)?target.itemPath:[],selected=sessionContext.valueAt(path);
  const group=sessionContext.isRecord(selected)&&Array.isArray(selected.path)&&Array.isArray(selected.children)&&!selected.role;
  const declaration=sessionContext.isSchemaTreeDeclaration(sessionContext.model,path)?selected:null;
  const entries=[];
  if(group){
    entries.push(['bind-tree-group','Bind section to model path'],['display-group','Display group'],['object-node','Object node'],['collection','Collection'],['settings-field','Settings field']);
    if(sessionContext.activeApplicationPackage?.schemaEditorPresentation?.schemaPropertyTable===true)entries.push(['settings-fields','Settings fields (table)']);
    entries.push(['inspect-existing-structure','Inspect existing structure (tables)']);
    return entries;
  }
  if(!declaration)return entries;
  if(declaration.type==='array'){
    const options=[['collection-item-kind','Collection item kind'],['collection-item-kinds-table','Item kinds (tables)'],['shared-definition-collection','Reusable definition row'],['reusable-schema-definition','Reusable schema definition']];
    try{sessionContext.schemaSingleItemPolicy(sessionContext.model,path);options.unshift(['collection-item-policy','Single item storage']);}catch{}
    if(sessionContext.schemaCollectionTreePresentation(sessionContext.model,path,target?.schemaProjection?.binding||[]))options.unshift(['collection-tree-presentation','Collection tree presentation']);
    options.push(['repair-collection-actions','Repair collection actions'],['inspect-existing-structure','Inspect existing structure (tables)']);
    return options;
  }
  if(!declaration.type||declaration.type==='object'){
    if(!path.length&&sessionContext.projectIntegrationDefaults(sessionContext.model))entries.push(['project-integration','Project integration (tables)']);
    entries.push(['display-group','Display group'],['object-node','Object node'],['collection','Collection'],['settings-field','Settings field']);
    if(sessionContext.isRecord(declaration.properties)&&Object.keys(declaration.properties).length
      && Array.isArray(target?.schemaProjection?.binding)&&target.schemaProjection.binding.length){
      entries.push(['bind-existing-field-tree','Show existing field in tree']);
    }
    entries.push(['object-requirements','Object requirements']);
    if(sessionContext.isRecord(declaration.properties)&&Object.keys(declaration.properties).length){
      entries.push(['nest-existing-fields','Nest existing fields']);
    }
    entries.push(['collection-item-kinds-table','Object entry kinds (tables)']);
    entries.push(['reusable-schema-definition','Reusable schema definition']);
    if(sessionContext.activeApplicationPackage?.schemaEditorPresentation?.schemaPropertyTable===true)entries.push(['settings-fields','Settings fields (table)']);
    entries.push(['inspect-existing-structure','Inspect existing structure (tables)']);
  }
  return entries;
}

export function schemaInspectionTargetPath(sessionContext){
  const target=sessionContext.schemaAuthoringDialogState?.target;
  const path=target?.itemPath||[];
  const selected=sessionContext.valueAt(path);
  if(sessionContext.isRecord(selected)&&Array.isArray(selected.path)&&Array.isArray(selected.children)&&!selected.role){
    if(!selected.path.length)throw new Error('This display group has no model binding. Select a schema property with Target property path.');
    return sessionContext.schemaAuthoringTargetForPropertyPath(selected.path.join('.')).itemPath;
  }
  return path;
}

export function renderSchemaStructureInspection(sessionContext){
  const host=sessionContext.$('#schema-authoring-inputs');
  try{const path=sessionContext.schemaInspectionTargetPath(),directTarget=sessionContext.samePath(path,sessionContext.schemaAuthoringDialogState?.target?.itemPath||[]),sections=sessionContext.inspectSchemaStructure(sessionContext.model,path);sessionContext.$('#schema-authoring-preview-button').disabled=!directTarget;renderOwnedView(host,React.createElement(SchemaStructureInspection,{session:sessionContext,sections,directTarget}));}
  catch(error){renderOwnedView(host,React.createElement('p',{className:'schema-validation-dialog-status'},error.message));}
}

export function schemaInspectionEdits(sessionContext){
  const edits=[];
  for(const control of document.querySelectorAll('#schema-authoring-inputs [data-schema-inspection-edit]')){
    const column=control.dataset.inspectionColumn,path=JSON.parse(control.dataset.inspectionPath);
    const previous=control.dataset.inspectionInitial;
    if(control.type==='checkbox'){
      if(String(control.checked)!==previous)edits.push({path,column,value:control.checked});
      continue;
    }
    const text=control.value.trim();
    if(column==='defaultValue'||column==='choices'){
      const value=text?JSON.parse(text):undefined;
      if((text?JSON.stringify(value):'')!==previous)edits.push({path,column,value,remove:!text});
      continue;
    }
    if(text===previous)continue;
    edits.push({path,column,value:column==='referencePath'?text.split('.').map(part=>part.trim()):text});
  }
  return edits;
}

export function initializeSchemaAuthoringPreview(sessionContext){
  const preview=sessionContext.$('#schema-authoring-preview'),tree=sessionContext.$('#schema-authoring-tree'),code=sessionContext.$('#schema-authoring-code');
  if(!preview||!tree||!code)return;
  renderOwnedView(preview,React.createElement(SchemaAuthoringPreview,{getResult:()=>sessionContext.schemaAuthoringDialogState?.preview?.result}));
}

export function schemaAuthoringRelevantCode(sessionContext, result){
  const paths=[...new Set(result.changedPaths||[])]
    .filter(path=>typeof path==='string'&&path.startsWith('/')
      &&path!=='/x-fullmeta-ui-tree'&&path!=='/x-fullmeta-ui-generated');
  const parts=path=>path.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
  const lookup=path=>parts(path).reduce((value,key)=>value?.[key],result.document);
  const snippets=paths.map(path=>{
    const value=lookup(path);
    return value===undefined?null:`${path}\n${JSON.stringify(value,null,2)}`;
  }).filter(Boolean);
  return snippets.length?snippets.join('\n\n'):'This operation updates the project tree. Open its preview below to inspect the result.';
}

export function closeSchemaAuthoringDialog(sessionContext){
  const dialog=sessionContext.$('#schema-authoring-dialog');
  if(dialog?.open)dialog.close();
  sessionContext.schemaAuthoringDialogState=null;
  sessionContext.$('#schema-authoring-preview').hidden=true;
  sessionContext.$('#schema-authoring-apply').disabled=true;
}

export function openSchemaAuthoringDialog(sessionContext, target){
  sessionContext.renderSchemaAuthoringToolButtons();
  const options=sessionContext.schemaAuthoringOptionsForTarget(target);
  if(!options.length)throw new Error('Select an object, collection, or display group in the schema tree first.');
  const targetPath=(target?.schemaProjection?.binding||[]).every(part=>typeof part==='string'&&part!=='*')
    ?(target?.schemaProjection?.binding||[]).join('.'):'';
  sessionContext.schemaAuthoringDialogState={target,originalTarget:target,appliedTargetPath:targetPath,preview:null};
  sessionContext.$('#schema-authoring-target-path').value=targetPath;
  const select=sessionContext.$('#schema-authoring-operation');
  renderSchemaOptionList(select,options,options[0]?.[0]);
  sessionContext.$('#schema-authoring-status').hidden=true;
  sessionContext.$('#schema-authoring-preview').hidden=true;
  sessionContext.$('#schema-authoring-apply').disabled=true;
  sessionContext.renderSchemaAuthoringInputs();
  sessionContext.$('#schema-authoring-dialog').dataset.authoringTool='schema-authoring';sessionContext.$('#schema-authoring-dialog').dataset.authoringPath=JSON.stringify(target?.itemPath||[]);
  sessionContext.$('#schema-authoring-dialog').showModal();
  sessionContext.$('#schema-authoring-title-input')?.focus();
}

export function invalidateSchemaAuthoringPreview(sessionContext){
  if(!sessionContext.schemaAuthoringDialogState)return;
  sessionContext.schemaAuthoringDialogState.preview=null;
  sessionContext.$('#schema-authoring-preview').hidden=true;
  sessionContext.$('#schema-authoring-apply').disabled=true;
  sessionContext.$('#schema-authoring-status').hidden=true;
}

export function schemaAuthoringFormInput(sessionContext){
  const operation=sessionContext.$('#schema-authoring-operation').value;
  const value={operation,title:sessionContext.$('#schema-authoring-title-input')?.value||''};
  if(operation==='project-integration')value.setup=sessionContext.projectIntegrationFormInput(sessionContext.$('#schema-authoring-inputs'));
  if(operation==='bind-tree-group'){
    value.modelPath=sessionContext.$('#schema-authoring-model-path')?.value||'';
    value.sectionKind=sessionContext.$('#schema-authoring-section-kind')?.value||'';
  }
  if(['object-node','collection','settings-field','reusable-schema-definition','nest-existing-fields'].includes(operation))value.key=sessionContext.$('#schema-authoring-key')?.value||'';
  if(operation==='collection'||operation==='collection-tree-presentation'){
    value.showHeading=sessionContext.$('#schema-authoring-show-heading')?.checked===true;
    value.itemClass=sessionContext.$('#schema-authoring-item-class')?.value||'';
  }
  if(operation==='bind-existing-field-tree'){
    value.fieldKey=sessionContext.$('#schema-authoring-existing-field')?.value||'';
    value.treeRole=sessionContext.$('#schema-authoring-existing-tree-role')?.value||'optionalItem';
    value.itemClass=sessionContext.$('#schema-authoring-item-class')?.value||'';
    value.showHeading=sessionContext.$('#schema-authoring-show-heading')?.checked===true;
    value.visibleWhenOption=sessionContext.$('#schema-authoring-visible-option')?.value||'';
  }
  if(operation==='object-node'||operation==='collection-item-kind'||operation==='collection-item-kinds-table'){
    value.identityFields=['id','name'].filter(field=>sessionContext.$('#schema-authoring-identity-'+field)?.checked===true);
  }
  if(operation==='settings-field')value.shape=sessionContext.$('#schema-authoring-shape')?.value||'';
  if(operation==='object-requirements'){
    value.requiredKeys=[...document.querySelectorAll('#schema-authoring-required-keys [data-required-key]')]
      .filter(input=>input.checked).map(input=>input.dataset.requiredKey);
    value.closedObject=sessionContext.$('#schema-authoring-closed-object')?.checked===true;
  }
  if(operation==='nest-existing-fields'){
    value.sourceKeys=[...document.querySelectorAll('#schema-authoring-nest-keys [data-nest-key]')]
      .filter(input=>input.checked).map(input=>input.dataset.nestKey);
    value.nestedDefinitionKey=sessionContext.$('#schema-authoring-nested-definition')?.value.trim()||'';
    value.required=sessionContext.$('#schema-authoring-required')?.checked===true;
    value.closedObject=sessionContext.$('#schema-authoring-closed-object')?.checked===true;
    value.insertFirst=sessionContext.$('#schema-authoring-insert-first')?.checked===true;
  }
  if(operation==='settings-fields'||operation==='collection-item-kind'||operation==='collection-item-kinds-table'||operation==='shared-definition-collection'||(operation==='reusable-schema-definition'&&sessionContext.$('#schema-authoring-definition-kind')?.value==='object')){
    value.fields=[...document.querySelectorAll('[data-schema-authoring-field-row]')].map(row=>{
      const entry={kindToken:row.querySelector('[data-field-kind-token]')?.value.trim()||'',key:row.querySelector('[data-field-key]')?.value||'',title:row.querySelector('[data-field-title]')?.value||'',shape:row.querySelector('[data-field-shape]')?.value||'',referenceKey:row.querySelector('[data-field-reference-key]')?.value||'',itemCount:row.querySelector('[data-field-item-count]')?.value||'',choices:row.querySelector('[data-field-choices]')?.value||'',widget:row.querySelector('[data-field-widget]')?.value||'',itemWidget:row.querySelector('[data-field-item-widget]')?.value||'',componentLabels:row.querySelector('[data-field-component-labels]')?.value||'',required:row.querySelector('[data-field-required]')?.checked===true,hidden:row.querySelector('[data-field-hidden]')?.checked===true};
      const text=row.querySelector('[data-field-default]')?.value.trim()||'';
      if(text)entry.defaultValue=JSON.parse(text);
      const fixed=row.querySelector('[data-field-fixed]')?.value.trim()||'';
      if(fixed)entry.fixedValue=JSON.parse(fixed);
      return entry;
    }).filter(entry=>entry.kindToken||entry.key.trim()||entry.title.trim()||entry.defaultValue!==undefined||entry.fixedValue!==undefined);
  }
  if(operation==='object-node'||operation==='collection'||operation==='settings-field'||operation==='shared-definition-collection')value.required=sessionContext.$('#schema-authoring-required')?.checked===true;
  if(operation==='settings-field'){
    const fixed=sessionContext.$('#schema-authoring-fixed')?.value.trim()||'';
    if(fixed)value.fixedValue=JSON.parse(fixed);
    const text=sessionContext.$('#schema-authoring-default')?.value.trim()||'';
    if(text)value.defaultValue=JSON.parse(text);
  }
  if(operation==='collection-item-kind'){
    value.token=sessionContext.$('#schema-authoring-token')?.value||'';
    value.discriminator=sessionContext.$('#schema-authoring-store-discriminator')?.checked
      ?sessionContext.$('#schema-authoring-discriminator')?.value||'':'';
    value.variantKey=sessionContext.$('#schema-authoring-variant-key')?.value.trim()||'';
    value.unionKey=sessionContext.$('#schema-authoring-union-key')?.value.trim()||'';
    value.geometryDimension=sessionContext.$('#schema-authoring-geometry-dimension')?.value||'';
    value.geometryRole=sessionContext.$('#schema-authoring-geometry-group')?.checked?'group':'';
  }
  if(operation==='collection-item-policy'){
    value.storeDiscriminator=sessionContext.$('#schema-authoring-store-discriminator')?.checked===true;
    value.discriminator=sessionContext.$('#schema-authoring-discriminator')?.value||'';
    value.token=sessionContext.$('#schema-authoring-token')?.value||'';
  }
  if(operation==='collection-item-kinds-table'){
    value.discriminator=sessionContext.$('#schema-authoring-discriminator')?.value||'';
    value.unionKey=sessionContext.$('#schema-authoring-union-key')?.value||'';
    value.variants=[...document.querySelectorAll('[data-schema-authoring-kind-row]')].map(row=>({
      token:row.querySelector('[data-kind-token]')?.value.trim()||'',
      title:row.querySelector('[data-kind-title]')?.value.trim()||'',
      definitionKey:row.querySelector('[data-kind-key]')?.value.trim()||'',
    })).filter(row=>row.token||row.title||row.definitionKey);
  }
  if(operation==='shared-definition-collection')value.definitionKey=sessionContext.$('#schema-authoring-definition-key')?.value||'';
  if(operation==='reusable-schema-definition'){
    value.definitionKind=sessionContext.$('#schema-authoring-definition-kind')?.value||'object';
    value.definitionItemShape=sessionContext.$('#schema-authoring-definition-item-shape')?.value||'';
    value.definitionReferenceKey=sessionContext.$('#schema-authoring-definition-reference-key')?.value||'';
    value.definitionItemCount=sessionContext.$('#schema-authoring-definition-item-count')?.value||'';
    value.definitionChoices=sessionContext.$('#schema-authoring-definition-choices')?.value||'';
    value.definitionPattern=sessionContext.$('#schema-authoring-definition-pattern')?.value||'';
    value.definitionMinLength=sessionContext.$('#schema-authoring-definition-min-length')?.value||'';
    value.definitionMaxLength=sessionContext.$('#schema-authoring-definition-max-length')?.value||'';
    value.definitionMinimum=sessionContext.$('#schema-authoring-definition-minimum')?.value||'';
    value.definitionMaximum=sessionContext.$('#schema-authoring-definition-maximum')?.value||'';
    value.expressionNamespaces=sessionContext.$('#schema-authoring-expression-namespaces')?.value||'';
    value.memberKeys=(sessionContext.$('#schema-authoring-definition-members')?.value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  }
  return value;
}

export function schemaGeneratedPathsWithin(sessionContext, document,path=[]){
  const prefix=Array.isArray(path)?path:[];
  const paths=(document?.['x-fullmeta-ui-generated']?.fields||[])
    .filter(entry=>Array.isArray(entry?.path)&&prefix.length<=entry.path.length
      &&prefix.every((part,index)=>part===entry.path[index]))
    .map(entry=>entry.path.slice(prefix.length));
  if(prefix.length===0&&document?.['x-fullmeta-ui-generated'])paths.push(['x-fullmeta-ui-generated']);
  return paths;
}

export function schemaValidationProgramEntries(sessionContext, document){
  return sessionContext.fullMetaValidationProgramKeys(document);
}

export function schemaDocumentWithProgramValue(sessionContext, document,pointer,value){
  const path=sessionContext.validationRulePointerParts(pointer);
  if(!path.length||!(path[0]==='x-fullmeta-rules'||/^x-fullmeta-.*Validation$/.test(path[0])))
    throw new Error('Validation programs must be declared at the schema root.');
  const candidate=sessionContext.cloneJson(document);let parent=candidate;
  for(const key of path.slice(0,-1)){
    if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw new Error('The validation program changed after the editor opened. Reopen it before applying this change.');
    parent=parent[key];
  }
  const key=path.at(-1);
  if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw new Error('The validation program changed after the editor opened. Reopen it before applying this change.');
  parent[key]=sessionContext.cloneJson(value);return candidate;
}

export function applySchemaValidationProgramEdit(sessionContext, entry){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||entry?.file!==sessionContext.activeApplicationPackage.rootDocumentFile)
    throw new Error('This validation program is not in the open schema document.');
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const candidate=sessionContext.schemaDocumentWithProgramValue(sessionContext.model,entry.pointer,entry.value);
  const ownershipIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate);
  if(ownershipIssue)throw new Error(ownershipIssue);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(errors[0]);
  sessionContext.model=candidate;sessionContext.selectedPath=[];sessionContext.selectedCollection=null;sessionContext.selectedLabel='Document settings';
  sessionContext.settingsDraft=sessionContext.cloneJson(candidate);sessionContext.settingsDraftDirty=false;sessionContext.renderModel();
  sessionContext.setStatus('Applied validation program edit. Save the schema to keep it.','good');
}

export function addSchemaValidationProgram(sessionContext){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')return;
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue){sessionContext.setStatus(draftIssue,'error');return;}
  if(Object.hasOwn(sessionContext.model,'x-fullmeta-rules')){sessionContext.setStatus('The model validation program already exists. Select it below to add assertions and nested rules.','error');return;}
  const candidate=sessionContext.cloneJson(sessionContext.model);
  candidate['x-fullmeta-rules']={maximumErrors:80,rules:[]};
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length){sessionContext.setStatus(`Could not create a validation program. ${errors[0]}`,'error');return;}
  sessionContext.model=candidate;sessionContext.selectedPath=[];sessionContext.selectedCollection=null;sessionContext.selectedLabel='Document settings';
  sessionContext.settingsDraft=sessionContext.cloneJson(candidate);sessionContext.settingsDraftDirty=false;sessionContext.renderModel();
  sessionContext.setStatus('Added a root validation program. Add an assertion, then select its expression to edit it in readable form. Save the schema to keep it.','good');
}

export function applySchemaAuthoringOperation(sessionContext){
  const state=sessionContext.schemaAuthoringDialogState,preview=state?.preview;
  if(!state||!preview)return;
  if(JSON.stringify(sessionContext.model)!==preview.base){
    sessionContext.$('#schema-authoring-status').textContent='The schema changed after this preview. Preview the operation again before applying it.';
    sessionContext.$('#schema-authoring-status').hidden=false;sessionContext.invalidateSchemaAuthoringPreview();return;
  }
  try{
    if(!sessionContext.performDeclaredTreeAction('schema.addChildItem',state.target,preview.input))throw new Error('No schema authoring handler is registered for this operation.');
    if(preview.widgetCatalog)sessionContext.activeApplicationPackage.widgetCatalog=preview.widgetCatalog;
    sessionContext.closeSchemaAuthoringDialog();
  }catch(error){
    sessionContext.$('#schema-authoring-status').textContent=error.message;sessionContext.$('#schema-authoring-status').hidden=false;
  }
}

export function schemaChoiceSelectionKey(sessionContext){return JSON.stringify([sessionContext.openedDocumentPath(),sessionContext.selectedPath]);}

export function schemaChoiceApplies(sessionContext, value,path){
  if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(path))return false;
  return sessionContext.schemaDeclarationScope(path)==='schema';
}

export function flushSchemaChoiceEditor(sessionContext){
  if(!sessionContext.schemaChoiceEditor||!sessionContext.schemaChoiceChanged||sessionContext.schemaChoiceKey!==sessionContext.schemaChoiceSelectionKey())return;
  const next=sessionContext.schemaChoiceEditor.commit(sessionContext.settingsDraft);
  if(!sessionContext.sameJsonModel(next,sessionContext.settingsDraft)){sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;}
  sessionContext.schemaChoiceChanged=false;sessionContext.schemaChoiceState=null;
}

export function schemaValueCompatibilityApplies(sessionContext, value,path){
  if(!sessionContext.schemaChoiceApplies(value,path))return false;
  const presentation=sessionContext.resolveSchemaWidgetPresentation(value,sessionContext.activeApplicationPackage?.schemaEditorPresentation?.widgets);
  return presentation?.profile?.authoring?.declarationValidator==='schemaValue';
}

export function flushSchemaAnnotationEditor(sessionContext){
  if(!sessionContext.schemaAnnotationEditor||!sessionContext.schemaAnnotationChanged||sessionContext.schemaAnnotationKey!==sessionContext.schemaChoiceSelectionKey())return;
  const next=sessionContext.schemaAnnotationEditor.commit(sessionContext.settingsDraft);
  if(!sessionContext.sameJsonModel(next,sessionContext.settingsDraft)){sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;}
  sessionContext.schemaAnnotationChanged=false;sessionContext.schemaAnnotationState=null;
}

export function flushSchemaUiEditor(sessionContext){
  if(!sessionContext.schemaUiEditor||!sessionContext.schemaUiChanged||sessionContext.schemaUiKey!==sessionContext.schemaChoiceSelectionKey())return;
  const next=sessionContext.schemaUiEditor.commit(sessionContext.settingsDraft);
  if(!sessionContext.sameJsonModel(next,sessionContext.settingsDraft)){sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;}
  sessionContext.schemaUiChanged=false;sessionContext.schemaUiState=null;
}

export function flushSchemaGraphicsEditor(sessionContext){
  if(!sessionContext.schemaGraphicsEditor||!sessionContext.schemaGraphicsChanged||sessionContext.schemaGraphicsKey!==sessionContext.schemaChoiceSelectionKey())return;
  const next=sessionContext.schemaGraphicsEditor.commit(sessionContext.settingsDraft);
  if(!sessionContext.sameJsonModel(next,sessionContext.settingsDraft)){sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;}
  sessionContext.schemaGraphicsChanged=false;sessionContext.schemaGraphicsState=null;
}

export function flushSchemaGlobalUiEditor(sessionContext){
  if(!sessionContext.schemaGlobalUiEditor||sessionContext.schemaGlobalUiKey!==sessionContext.schemaChoiceSelectionKey())return;
  const next=sessionContext.schemaGlobalUiEditor.commit(sessionContext.settingsDraft);
  if(!sessionContext.sameJsonModel(next,sessionContext.settingsDraft)){sessionContext.settingsDraft=next;sessionContext.settingsDraftDirty=true;}
}

export function flushSchemaDraftEditors(sessionContext){
  sessionContext.flushSchemaAnnotationEditor();
  sessionContext.flushSchemaUiEditor();
  sessionContext.flushSchemaGraphicsEditor();
  sessionContext.flushSchemaGlobalUiEditor();
  sessionContext.flushSchemaChoiceEditor();
}

export function refreshSelectedSchemaDeclarationLabel(sessionContext){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')return;
  const declaration=sessionContext.selectedDocumentValue();
  if(!sessionContext.isRecord(declaration))return;
  if(!Array.isArray(sessionContext.selectedPath) || (sessionContext.selectedPath.length>0&&sessionContext.schemaDeclarationScope(sessionContext.selectedPath)!=='schema'
    &&!sessionContext.selectedSchemaProjection?.binding?.includes('*')
    &&!sessionContext.samePath(sessionContext.selectedSchemaProjection?.path,sessionContext.selectedPath)
    &&!sessionContext.schemaTreeButtonForSelection(sessionContext.selectedPath)))return;
  sessionContext.selectedLabel=sessionContext.effectiveSchemaTreeLabel(declaration,sessionContext.selectedPath.at(-1));
  sessionContext.$('#selection-title').textContent=sessionContext.selectedLabel;
}

export function schemaDocumentNumericFieldError(sessionContext, input){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||input?.dataset?.settingType!=='number')return null;
  const text=input.value.trim(),optional=input.dataset.settingOptional==='true';
  if(optional&&text==='')return null;
  if(input.validity?.badInput||text===''||!Number.isFinite(Number(text))){
    return `${input.getAttribute('aria-label')||'Value'} must be a finite number.`;
  }
  if(input.dataset.settingNonnegativeInteger==='true'&&(!Number.isInteger(Number(text))||Number(text)<0)){
    return `${input.getAttribute('aria-label')||'Value'} must be a non-negative integer.`;
  }
  const bound=input.dataset.settingArrayBound;
  if(bound&&sessionContext.settingsDraft){
    const otherKey=bound==='minItems'?'maxItems':'minItems',other=sessionContext.settingsDraft[otherKey],current=Number(text);
    if(Number.isInteger(other)&&(bound==='minItems'?current>other:other>current)){
      return bound==='minItems'?'Minimum items cannot exceed maximum items.':'Maximum items cannot be less than minimum items.';
    }
  }
  return null;
}

export function schemaActionFacingError(sessionContext, input){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument'||!input?.hasAttribute('data-schema-action-facing'))return null;
  if(input.value.trim()){
    input.removeAttribute('aria-invalid');
    return null;
  }
  input.setAttribute('aria-invalid','true');
  return `${input.getAttribute('aria-label')||'Item action field'} cannot be blank.`;
}

export function schemaArrayItemStructureLabel(sessionContext, schema){
  if(Array.isArray(schema?.prefixItems))return `${schema.prefixItems.length} positional item schemas`;
  const item=schema?.items;
  if(item===undefined)return 'No item schema declared';
  if(item===false)return 'Items are not allowed';
  if(item===true)return 'Any JSON value';
  if(item&&typeof item==='object'&&!Array.isArray(item)){
    if(typeof item.$ref==='string')return `Reference · ${item.$ref.split('/').at(-1).replace(/~1/g,'/').replace(/~0/g,'~')}`;
    if(item.type==='object'&&item.properties&&typeof item.properties==='object'){
      const count=Object.keys(item.properties).length;
      return `Object · ${count} propert${count===1?'y':'ies'}`;
    }
    return `${item.type||'Schema'} item declaration`;
  }
  return 'Item declaration';
}

export function selectedDocumentSchema(sessionContext, path=sessionContext.selectedPath,options){
  return sessionContext.modelEditorSchemaForPath(sessionContext.model,path,options);
}

export function schemaVariantStatus(sessionContext, widget,profile,key,values={}){
  const overrideKey=profile?.authoring?.variantEditor?.copyKeys?.[key]||key;
  const template=sessionContext.activeApplicationPackage?.schemaVariantCopy?.[widget]?.[overrideKey]
    ||profile?.authoring?.messages?.[key]||'';
  return Object.entries(values).reduce((message,[name,value])=>message.replaceAll(`{${name}}`,String(value??'')),template);
}

export function applySchemaComponentVariant(sessionContext, variant,rowValues,widget,profile){
  sessionContext.applyCurrentSettingsDraft({refresh:false});
  const source=sessionContext.componentVariantSource(variant);
  const configuration=profile?.authoring?.variantEditor;
  const next=sessionContext.fieldWithVariantRowValues(source.value,variant,rowValues,configuration);
  const candidate=sessionContext.modelWithEditorSettingsDraft(sessionContext.model,source.path,next);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`Could not apply component defaults. ${errors[0]}`);
  sessionContext.model=candidate;
  sessionContext.renderModel();sessionContext.showSchemaGraphicsContext();sessionContext.syncModelActionAvailability();
  const label=(configuration?.variantLabelPath||[]).reduce((value,key)=>value?.[key],variant)||'';
  sessionContext.setStatus(sessionContext.schemaVariantStatus(widget,profile,'appliedStatus',{file:source.file,label})
    ||`Applied field defaults in ${source.file}. Save to keep the change.`,'good');
}

export async function saveSchemaComponentVariant(sessionContext, variant,widget,profile){
  sessionContext.applyCurrentSettingsDraft({refresh:false});
  sessionContext.componentVariantSource(variant);
  await sessionContext.saveModel();
}

export function resolveUiProfileSchemaReference(sessionContext, schema,rootSchema){
  if(typeof schema?.$ref!=='string')return schema;
  const {$ref,...siblings}=schema;
  if(!$ref.startsWith('#/'))throw new Error(`unsupported reference ${$ref}`);
  const target=$ref.slice(2).split('/').map((part)=>part.replace(/~1/g,'/').replace(/~0/g,'~')).reduce((value,key)=>value?.[key],rootSchema);
  if(target===null||typeof target!=='object'||Array.isArray(target))throw new Error(`unresolved reference ${$ref}`);
  return{...target,...siblings};
}

export function validateUiProfileSchema(sessionContext, value,schema,path='#',rootSchema=sessionContext.uiProfileSchema){
  try{schema=sessionContext.resolveUiProfileSchemaReference(schema,rootSchema)}catch(error){return[`${path} has ${error.message}.`]}
  const errors=[],isObject=(item)=>item!==null&&typeof item==='object'&&!Array.isArray(item),schemaObject=isObject(schema);
  if(!schemaObject)return[`${path} has an invalid UI profile schema definition.`];
  for(const keyword of Object.keys(schema))if(!sessionContext.uiProfileSchemaValidationKeywords.has(keyword)&&!sessionContext.uiProfileSchemaAnnotations.has(keyword))errors.push(`${path}/${keyword} uses an unsupported UI profile schema keyword.`);
  const expectedType=schema.type,typeMatches={object:isObject(value),array:Array.isArray(value),string:typeof value==='string',number:typeof value==='number'&&Number.isFinite(value),integer:Number.isInteger(value),boolean:typeof value==='boolean',null:value===null};
  if(expectedType&&typeMatches[expectedType]!==true){errors.push(`${path} must be ${expectedType}.`);return errors;}
  if(Object.hasOwn(schema,'const')&&sessionContext.stableJsonString(value)!==sessionContext.stableJsonString(schema.const))errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`);
  if(Array.isArray(schema.enum)&&!schema.enum.some((entry)=>sessionContext.stableJsonString(value)===sessionContext.stableJsonString(entry)))errors.push(`${path} must be one of ${schema.enum.map((entry)=>JSON.stringify(entry)).join(', ')}.`);
  if(typeof value==='string'){
    const length=Array.from(value).length;
    if(Number.isInteger(schema.minLength)&&length<schema.minLength)errors.push(`${path} must contain at least ${schema.minLength} character(s).`);
    if(Number.isInteger(schema.maxLength)&&length>schema.maxLength)errors.push(`${path} must contain at most ${schema.maxLength} character(s).`);
    if(typeof schema.pattern==='string'&&!new RegExp(schema.pattern).test(value))errors.push(`${path} does not match ${schema.pattern}.`);
  }
  if(typeof value==='number'&&Number.isFinite(value)){
    if(Number.isFinite(schema.minimum)&&value<schema.minimum)errors.push(`${path} must be at least ${schema.minimum}.`);
    if(Number.isFinite(schema.maximum)&&value>schema.maximum)errors.push(`${path} must be at most ${schema.maximum}.`);
    if(Number.isFinite(schema.exclusiveMinimum)&&value<=schema.exclusiveMinimum)errors.push(`${path} must be greater than ${schema.exclusiveMinimum}.`);
    if(Number.isFinite(schema.exclusiveMaximum)&&value>=schema.exclusiveMaximum)errors.push(`${path} must be less than ${schema.exclusiveMaximum}.`);
  }
  if(Array.isArray(value)){
    if(Number.isInteger(schema.minItems)&&value.length<schema.minItems)errors.push(`${path} must contain at least ${schema.minItems} item(s).`);
    if(Number.isInteger(schema.maxItems)&&value.length>schema.maxItems)errors.push(`${path} must contain at most ${schema.maxItems} item(s).`);
    if(schema.uniqueItems===true&&new Set(value.map(sessionContext.stableJsonString)).size!==value.length)errors.push(`${path} must contain unique items.`);
    const prefixItems=Array.isArray(schema.prefixItems)?schema.prefixItems:[];
    value.forEach((item,index)=>{
      const itemSchema=index<prefixItems.length?prefixItems[index]:schema.items;
      if(itemSchema===false)errors.push(`${path}[${index}] is not allowed.`);
      else if(isObject(itemSchema))errors.push(...sessionContext.validateUiProfileSchema(item,itemSchema,`${path}[${index}]`,rootSchema));
    });
  }
  if(isObject(value)){
    for(const key of schema.required||[])if(!Object.hasOwn(value,key))errors.push(`${path}/${key} is required.`);
    for(const [key,propertySchema] of Object.entries(schema.properties||{}))if(Object.hasOwn(value,key))errors.push(...sessionContext.validateUiProfileSchema(value[key],propertySchema,`${path}/${key}`,rootSchema));
    for(const [key,propertyValue] of Object.entries(value))if(!Object.hasOwn(schema.properties||{},key)){
      if(schema.additionalProperties===false)errors.push(`${path}/${key} is not allowed.`);
      else if(isObject(schema.additionalProperties))errors.push(...sessionContext.validateUiProfileSchema(propertyValue,schema.additionalProperties,`${path}/${key}`,rootSchema));
    }
  }
  return errors;
}

export function schemaFieldContext(sessionContext, widgetRenderers={},changeActions={}){
  const component=sessionContext.modelComponent();
  const documentSource=sessionContext.model;
  const componentPath=component?sessionContext.activeApplicationPackage?.modelEditorUi?.componentPath||[]:null;
  const resolveChoiceRecords=(source)=>{
    if(!source||typeof source!=='object')return[];
    let collection=null,collectionPath=[];
    if(source.scope==='root'||source.scope==='document'){
      collectionPath=source.path||[];collection=collectionPath.reduce((current,key)=>current?.[key],documentSource);
    }else if((source.scope==='model'||source.scope==='component')&&component){
      collectionPath=[...(componentPath||[]),...(source.path||[])];collection=(source.path||[]).reduce((current,key)=>current?.[key],component);
    }else if(source.scope==='engine'){
      collection=sessionContext.activeApplicationPackage?.engineChoiceRecords?.({source,model: sessionContext.model,settingsDraft: sessionContext.settingsDraft})||[];
    }else if(source.scope==='runtime'){
      const runtime={resultDatasets:sessionContext.resultTablesByAction.get(sessionContext.settingsDraft?.id)||[]};
      collection=(source.path||[]).reduce((current,key)=>current?.[key],runtime);
    }
    if(!Array.isArray(collection))return[];
    if(source.schemaFilter){
      const filter=source.schemaFilter;
      const match=(filter.valuePath||[]).reduce((current,key)=>current?.[key],sessionContext.model);
      const keys=filter.annotationKeys||[];
      if(!collectionPath.length||!keys.length||match===undefined)return[];
      return collection.filter((entry,index)=>{
        const entrySchema=sessionContext.resolveModelEditorSchema(sessionContext.modelEditorSchemaForPath(sessionContext.model,[...collectionPath,index]))||{};
        return keys.some(key=>{
          const declared=entrySchema[key];
          return Array.isArray(declared)?declared.includes(match):declared===match;
        });
      });
    }
    return collection;
  };
  return {
    onCommand:(command,event)=>{try{const result=sessionContext.onWidgetCommand(command,event);if(result?.then)return result.catch(error=>{sessionContext.setStatus(error.message,'error');return {valid:false,error:error.message};});return result;}catch(error){sessionContext.setStatus(error.message,'error');return {valid:false,error:error.message};}},
    readDraft:path=>sessionContext.rawFieldDrafts.get(JSON.stringify([sessionContext.selectedPath,path]))?.value,
    generatedIdentity:path=>sessionContext.activeApplicationPackage?.kind!=='schemaDocument'&&isGeneratedIdentityPath([...(sessionContext.selectedPath||[]),...path],{schemaAt:candidate=>sessionContext.modelEditorSchemaForPath(sessionContext.model,candidate),resolve:sessionContext.resolveModelEditorSchema}),
    rootValue:sessionContext.settingsDraft,
    relatedFieldsValue:sessionContext.relatedFieldsDraft||sessionContext.model,
    resolveSchema:sessionContext.resolveModelEditorSchema,
    schemaAtPath:(path,options)=>sessionContext.selectedDocumentSchema([...(sessionContext.selectedPath||[]),...(path||[])],options),
    documentSchemaAtPath:(path,options)=>sessionContext.selectedDocumentSchema(path,options),
    schemaProperty:sessionContext.modelEditorSchemaProperty,
    schemaItem:sessionContext.modelEditorSchemaItem,
    defaultUnits:sessionContext.modelUnitChoices,
    compatibleUnits:sessionContext.compatibleUnitsFor,
    unitChoices(schema,unitSchema){
      return sessionContext.activeApplicationPackage?.unitChoicesForSchema?.({schema,unitSchema,uiProfile:sessionContext.activeUiProfile,defaultUnits:sessionContext.modelUnitChoices})
        ??(Array.isArray(unitSchema?.enum)?unitSchema.enum:sessionContext.modelUnitChoices);
    },
    dynamicPropertySet(source,descriptorContext){
      const provider=sessionContext.activeApplicationDynamicPropertySets?.[source];
      return typeof provider==='function' ? provider({...descriptorContext,model: sessionContext.model,component,settingsDraft: sessionContext.settingsDraft}) : [];
    },
    widgetRenderers,
    widgetComponents:sessionContext.activeApplicationWidgetComponents,
    changeActions,
    choiceRecords:resolveChoiceRecords,
    stageSiblingMirror(path,value){
      const parts=(Array.isArray(path)?path:String(path||'').split('.')).map(String).filter(Boolean);
      const selectedPath=sessionContext.selectedPath;
      if(!parts.length||!Array.isArray(selectedPath)||!selectedPath.length)return false;
      const targetPath=[...selectedPath.slice(0,-1),...parts];
      if(!sessionContext.relatedFieldsDraft)sessionContext.relatedFieldsDraft=sessionContext.cloneJson(sessionContext.model);
      let parent=sessionContext.relatedFieldsDraft;
      for(const key of targetPath.slice(0,-1)){
        if(!parent||typeof parent!=='object'||Array.isArray(parent))return false;
        if(!Object.hasOwn(parent,key))parent[key]={};
        parent=parent[key];
      }
      if(!parent||typeof parent!=='object'||Array.isArray(parent))return false;
      parent[targetPath.at(-1)]=sessionContext.cloneJson(value);
      sessionContext.relatedFieldsDraftPaths.add(JSON.stringify(targetPath));
      return true;
    },
    tabularDataTables:resolveChoiceRecords,
    makeUniqueId:(base,reserved=[])=>sessionContext.uniqueModelId(sessionContext.model,base,reserved),
    choiceOptions(source){
      const records=resolveChoiceRecords(source),valueProperty=source?.valueProperty;
      return records.map((record)=>{
        if(record&&typeof record==='object'&&valueProperty){
          const value=record[valueProperty];
          return{value,label:sessionContext.formatChoiceLabel(source.labelTemplate,record)||String(value??'')};
        }
        return record;
      });
    },
    formatChoiceLabel: sessionContext.formatChoiceLabel,
    referenceOptions(reference,currentValue,fieldLabel,fieldUi={}){
      return sessionContext.activeApplicationPackage?.referenceOptions?.({
        reference,
        currentValue,
        fieldLabel,
        fieldUi,
        model: sessionContext.model,
        component,
        settingsDraft: sessionContext.settingsDraft,
        dimension:sessionContext.activeScenarioDimension(),
        formatChoiceLabel: sessionContext.formatChoiceLabel,
        formatItemLabel:sessionContext.referenceItemLabel,
        copyText:sessionContext.sharedUiCopy,
      }) ?? null;
    },
    quantityVectorComponents:(source,path)=>sessionContext.activeApplicationPackage?.quantityVectorComponents?.({
      source,path,model: sessionContext.model,component,selectedPath: sessionContext.selectedPath,
    })||[],
  };
}

export function settingsSchemaHasChoiceDependency(sessionContext, property){
  const schema=sessionContext.resolveModelEditorSchema(sessionContext.selectedDocumentSchema(sessionContext.selectedPath||[]))||{};
  return Object.values(schema.properties||{}).some((child)=>sessionContext.resolveModelEditorSchema(child)?.['x-fullmeta-ui']?.choicesBySiblingProperty===property);
}

export function schemaDocumentPointer(sessionContext, path){return `#${path.map(key=>`/${String(key).replace(/~/g,'~0').replace(/\//g,'~1')}`).join('')}`}

export function resetSchemaAuthoringEditors(sessionContext){
  sessionContext.schemaUiAnnotationEditor?.close();
  for(const editor of [sessionContext.schemaChoiceEditor,sessionContext.schemaAnnotationEditor,sessionContext.schemaUiEditor,sessionContext.schemaGraphicsEditor,sessionContext.schemaGlobalUiEditor])editor?.dispose?.();
  sessionContext.schemaChoiceEditor=null;sessionContext.schemaChoiceKey=null;sessionContext.schemaChoiceState=null;sessionContext.schemaChoiceChanged=false;
  sessionContext.schemaAnnotationEditor=null;sessionContext.schemaAnnotationKey=null;sessionContext.schemaAnnotationState=null;sessionContext.schemaAnnotationChanged=false;
  sessionContext.schemaUiEditor=null;sessionContext.schemaUiKey=null;sessionContext.schemaUiState=null;sessionContext.schemaUiChanged=false;
  sessionContext.schemaGraphicsEditor=null;sessionContext.schemaGraphicsKey=null;sessionContext.schemaGraphicsState=null;sessionContext.schemaGraphicsChanged=false;
  sessionContext.schemaGlobalUiEditor=null;sessionContext.schemaGlobalUiKey=null;
}

export function schemaLocalDefinitionDialogTarget(sessionContext, reference){
  if(typeof reference!=='string'||!reference.startsWith('#/$defs/'))return null;
  const path=sessionContext.jsonPointerPath(reference);
  if(!Array.isArray(path)||path.length<2||path[0]!=='$defs')return null;
  let declaration=sessionContext.model;
  for(const part of path){
    if(!sessionContext.isRecord(declaration)&&!Array.isArray(declaration))return null;
    if(!Object.hasOwn(declaration,part))return null;
    declaration=declaration[part];
  }
  if(!sessionContext.isRecord(declaration))return null;
  const key=String(path.at(-1));
  const label=typeof declaration.title==='string'&&declaration.title.trim()
    ?declaration.title.trim():key;
  return {label,path,projection:null};
}

export function syncSchemaStructureDialogHeader(sessionContext){
  if(!sessionContext.schemaStructureDialogState)return;
  sessionContext.$('#schema-open-title').textContent=sessionContext.selectedLabel||'Edit schema property';
  const location=`${sessionContext.activeApplicationPackage?.rootDocumentFile||'Schema document'}${sessionContext.schemaDocumentPointer(sessionContext.selectedPath||[])}`;
  sessionContext.$('#schema-open-description').textContent=`Edit ${location}. Apply and close to keep these edits in the open document; use Save to write them to disk.`;
  const guided=sessionContext.$('#schema-open-guided');
  if(guided)guided.hidden=sessionContext.activeApplicationPackage?.kind!=='schemaDocument'
    ||!sessionContext.schemaAuthoringOptionsForTarget({itemPath:sessionContext.selectedPath||[]}).length;
  const followReference=sessionContext.$('#schema-open-follow-reference');
  const referenceTarget=sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ?sessionContext.schemaLocalDefinitionDialogTarget(sessionContext.settingsDraft?.$ref):null;
  followReference.hidden=!referenceTarget;
  followReference.title=referenceTarget?`Open ${sessionContext.schemaDocumentPointer(referenceTarget.path)}`:'';
  const previous=sessionContext.schemaStructureDialogState.history?.at(-1);
  const back=sessionContext.$('#schema-open-back');
  back.hidden=!previous;
  back.textContent=previous?`Back to ${String(previous.label||'previous field').split(' · ').at(-1)}`:'Back';
  back.title=previous?`Back to ${previous.label}`:'';
}

export function currentSchemaStructureDialogTarget(sessionContext){
  if(!Array.isArray(sessionContext.selectedPath))return null;
  return {label:sessionContext.selectedLabel,path:sessionContext.selectedPath.slice(),projection:sessionContext.selectedSchemaProjection};
}

export function schemaStructureDialogTargetIsCurrent(sessionContext, target){
  return Array.isArray(sessionContext.selectedPath)&&sessionContext.samePath(sessionContext.selectedPath,target.path);
}

export function restoreSchemaStructureDialogParent(sessionContext, state){
  const parent=state.parent;
  if(Array.isArray(parent.path)){
    const button=sessionContext.schemaTreeButtonForSelection(parent.path,parent.projection);
    sessionContext.selectItem(parent.label,parent.path,button,parent.projection);
  }else sessionContext.showModelOverview();
  const openerPath=state.targetPath;
  const opener=[...sessionContext.settingsTable.querySelectorAll('[data-schema-structure-action="open"]')].find(button=>{
    try{return sessionContext.samePath([...parent.path||[],...JSON.parse(button.dataset.schemaStructurePath||'[]')],openerPath)}catch{return false}
  });
  if(opener?.isConnected)opener.focus();
}

export function finishSchemaStructureDialog(sessionContext, {apply=false}={}){
  const state=sessionContext.schemaStructureDialogState;if(!state)return false;
  if(apply){
    try{sessionContext.applyCurrentSettingsDraft({refresh:false,announce:false})}
    catch{return false;}
  }else{
    sessionContext.settingsDraftDirty=false;sessionContext.jsonDraftDirty=false;sessionContext.resetSchemaAuthoringEditors();
    sessionContext.model=sessionContext.cloneJson(state.snapshot.model);sessionContext.fullJson.value=JSON.stringify(sessionContext.model,null,2);
  }
  sessionContext.settingsDraftDirty=false;
  sessionContext.$('#schema-open-dialog').close(apply?'apply':'cancel');
  sessionContext.$('#settings-view').append(sessionContext.settingsTable);
  sessionContext.settingsTable.parentElement.scrollTop=0;
  sessionContext.schemaStructureDialogState=null;
  sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.selectedSchemaProjection=null;
  sessionContext.settingsDraft=undefined;sessionContext.settingsDraftDirty=false;sessionContext.renderTree();
  sessionContext.restoreSchemaStructureDialogParent(state);
  sessionContext.updateModelEditState();sessionContext.syncModelActionAvailability();
  if(apply)sessionContext.setStatus('Closed the schema property editor. Save to keep any schema changes.','good');
  else sessionContext.setStatus('Discarded changes made in the schema property dialog.');
  if(state.opener?.isConnected)state.opener.focus();
  return true;
}

export function navigateSchemaStructureDialog(sessionContext, target){
  sessionContext.selectItem(target.label,target.path,sessionContext.schemaTreeButtonForSelection(target.path,target.projection),target.projection);
  if(!sessionContext.schemaStructureDialogTargetIsCurrent(target))return false;
  sessionContext.syncSchemaStructureDialogHeader();
  const firstInput=sessionContext.settingsTable.querySelector('input:not([type="hidden"]), textarea, select, button[data-schema-structure-action]');
  firstInput?.focus();
  return true;
}

export function backSchemaStructureDialog(sessionContext){
  const history=sessionContext.schemaStructureDialogState?.history;
  if(!history?.length)return false;
  const previous=history.at(-1);
  if(!sessionContext.navigateSchemaStructureDialog(previous))return false;
  history.pop();
  sessionContext.syncSchemaStructureDialogHeader();
  return true;
}

export function openSchemaStructureDialog(sessionContext, target,opener){
  if(sessionContext.schemaStructureDialogState){
    if(sessionContext.schemaStructureDialogTargetIsCurrent(target))return true;
    const previous=sessionContext.currentSchemaStructureDialogTarget();
    if(!previous||!sessionContext.navigateSchemaStructureDialog(target))return false;
    sessionContext.schemaStructureDialogState.history.push(previous);
    sessionContext.syncSchemaStructureDialogHeader();
    return true;
  }
  const dialog=sessionContext.$('#schema-open-dialog'),host=sessionContext.$('#schema-open-table-host');
  if(!dialog||dialog.open)return false;
  const parent={path:Array.isArray(sessionContext.selectedPath)?sessionContext.selectedPath.slice():null,label:sessionContext.selectedLabel,projection:sessionContext.selectedSchemaProjection};
  let parentApplied=false;
  try{parentApplied=sessionContext.applyCurrentSettingsDraft({refresh:false,announce:false})}
  catch{return false;}
  if(parentApplied)sessionContext.renderTree();
  sessionContext.schemaStructureDialogState={parent,opener,targetPath:target.path.slice(),history:[],snapshot:{model:sessionContext.cloneJson(sessionContext.model)}};
  dialog.dataset.authoringTool='schema-structure';dialog.dataset.authoringPath=JSON.stringify(target.path);
  host.append(sessionContext.settingsTable);sessionContext.prepareResizableTables(sessionContext.settingsTable);
  dialog.showModal();
  if(!sessionContext.navigateSchemaStructureDialog(target)){
    sessionContext.finishSchemaStructureDialog({apply:false});
    sessionContext.setStatus('Could not open the selected schema declaration.','error');
    return false;
  }
  return true;
}

export function showSchemaGraphicsContext(sessionContext){
  const selection=sessionContext.selectedSchemaProjection;
  const widget=sessionContext.activeApplicationPackage?.schemaEditorPresentation?.documentWidgets
    ?.find(entry=>entry.widget==='graphicsConsole');
  const graphicsConsole=widget?sessionContext.documentValueAtPath(sessionContext.model,widget.path):null;
  const supported=sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    &&Array.isArray(selection?.binding)&&graphicsConsole&&typeof graphicsConsole==='object'
    &&!Array.isArray(graphicsConsole);
  sessionContext.schemaGraphicsContextHost.hidden=true;
  sessionContext.schemaGraphicsContextHost.replaceChildren();
  sessionContext.$('#graphics-selection-context').hidden=true;
  if(!supported)return;
  const context=sessionContext.mountSchemaGraphicsContext({
    container:sessionContext.schemaGraphicsContextHost,graphicsConsole,selection,
    schemaValue:sessionContext.hasSettingsDraft()?sessionContext.settingsDraft:sessionContext.selectedDocumentValue(),
  });
  sessionContext.schemaGraphicsContextHost.hidden=!context;
  if(context){sessionContext.schemaGraphicsContextHost.hidden=false;sessionContext.$('#graphics-selection-context').hidden=false;sessionContext.$('#graphics-widget-title').textContent='Graphics Console';sessionContext.$('#geometry-note').textContent='Select a tree item to see its Graphics response.';}
}

export function showSchemaGraphicsDesign(sessionContext, path,item){
  const widget=sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ?sessionContext.documentWidgetAtPath(sessionContext.activeApplicationPackage.schemaEditorPresentation?.documentWidgets||[],path):null;
  const supported=widget?.widget==='graphicsConsole'
    &&item&&typeof item==='object'&&!Array.isArray(item)
    &&item.schema==='fullmeta-graphics-console/1';
  const nextKey=supported?JSON.stringify([sessionContext.openedDocumentPath(),path]):null;
  if(sessionContext.schemaGraphicsEditor&&sessionContext.schemaGraphicsChanged&&sessionContext.schemaGraphicsKey===nextKey){
    sessionContext.schemaGraphicsState={format:'fullmeta-structured-value-draft/1',draft:sessionContext.schemaGraphicsEditor.draft()};
  }else if(sessionContext.schemaGraphicsKey!==nextKey){sessionContext.schemaGraphicsState=null;sessionContext.schemaGraphicsChanged=false;}
  sessionContext.schemaGraphicsEditor?.dispose?.();
  sessionContext.schemaGraphicsEditor=null;sessionContext.schemaGraphicsKey=nextKey;
  sessionContext.schemaGraphicsHost.hidden=!supported;
  if(!supported){sessionContext.schemaGraphicsHost.replaceChildren();return;}
  const rendererResource=widget.related.find(resource=>sessionContext.isRecord(sessionContext.documentValueAtPath(sessionContext.model,resource.path)?.widgets));
  const renderers=rendererResource?sessionContext.documentValueAtPath(sessionContext.model,rendererResource.path).widgets:{};
  sessionContext.schemaGraphicsEditor=sessionContext.mountGraphicsConsoleDesignEditor({
    container:sessionContext.schemaGraphicsHost,declaration:sessionContext.settingsDraft,file:sessionContext.openedDocumentPath(),
    widgets:Object.keys(renderers),renderers,state:sessionContext.schemaGraphicsState?.format?undefined:sessionContext.schemaGraphicsState,
    onRawDraftChange(){sessionContext.schemaGraphicsChanged=true;sessionContext.settingsDraftDirty=true;sessionContext.updateApplySettingsVisibility();sessionContext.updateModelEditState();},
    onDraftChange(next){
      sessionContext.settingsDraft=sessionContext.schemaGraphicsEditor.commit(sessionContext.settingsDraft);
      sessionContext.schemaGraphicsState=next;sessionContext.schemaGraphicsChanged=true;sessionContext.settingsDraftDirty=true;
      sessionContext.updateApplySettingsVisibility();sessionContext.syncModelActionAvailability();sessionContext.updateModelEditState();
      sessionContext.setStatus('Updated the Graphics console. Apply item and Save to keep the change.');
    },
    onInspectWidget(id){
      if(!Object.hasOwn(renderers,id)){sessionContext.setStatus(`The Graphics widget ${id} has no declaration in this document.`,'error');return;}
      sessionContext.openSchemaStructureDialog({label:id,path:[...rendererResource.path,'widgets',id],projection:null},sessionContext.schemaGraphicsHost);
    },
    onOpenSource(){
      const raw=sessionContext.settingsTable.querySelector('.schema-widget-advanced');
      if(raw){raw.open=true;raw.scrollIntoView({block:'nearest'});}
      sessionContext.setStatus('Other Graphics console settings are in Settings.');
    },
  });
  if(sessionContext.schemaGraphicsState?.format==='fullmeta-structured-value-draft/1')sessionContext.schemaGraphicsEditor.restore(sessionContext.schemaGraphicsState.draft);
}

export function showSchemaGlobalUiDesign(sessionContext, path,item){
  const widget=sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ?sessionContext.documentWidgetAtPath(sessionContext.activeApplicationPackage.schemaEditorPresentation?.documentWidgets||[],path):null;
  const supported=widget&&['graphicsInterfaces','structured'].includes(widget.widget)&&item!==undefined;
  const nextKey=supported?JSON.stringify([sessionContext.openedDocumentPath(),path]):null;
  const previousDraft=nextKey&&sessionContext.schemaGlobalUiKey===nextKey?sessionContext.schemaGlobalUiEditor?.draft?.():null;
  sessionContext.schemaGlobalUiEditor?.dispose?.();sessionContext.schemaGlobalUiEditor=null;
  sessionContext.schemaGlobalUiHost.hidden=!supported;
  if(!supported){sessionContext.schemaGlobalUiHost.replaceChildren();sessionContext.schemaGlobalUiEditor=null;sessionContext.schemaGlobalUiKey=null;return;}
  sessionContext.schemaGlobalUiKey=nextKey;
  const rawChanged=()=>{sessionContext.settingsDraftDirty=true;sessionContext.updateApplySettingsVisibility();sessionContext.updateModelEditState();};
  const onDraftChange=(next)=>{
    if(widget.widget==='graphicsInterfaces')sessionContext.settingsDraft=sessionContext.schemaGlobalUiEditor.commit(sessionContext.settingsDraft);
    else sessionContext.settingsDraft=sessionContext.cloneJson(next);
    sessionContext.settingsDraftDirty=true;
    sessionContext.updateApplySettingsVisibility();sessionContext.syncModelActionAvailability();sessionContext.updateModelEditState();
    sessionContext.setStatus(`Updated ${widget.label}. Apply item and Save to keep the change.`);
  };
  if(widget.widget==='graphicsInterfaces'){
    sessionContext.schemaGlobalUiEditor=sessionContext.mountGraphicsInterfacesDesignEditor({
      container:sessionContext.schemaGlobalUiHost,declaration:item,onDraftChange,onRawDraftChange:rawChanged,
    });
  }else{
    const editor=sessionContext.mountStructuredValueEditor({
      container:sessionContext.schemaGlobalUiHost,value:item,label:widget.label,
      onChange:next=>onDraftChange(next),onDraftChange:rawChanged,
    });
    sessionContext.schemaGlobalUiEditor={
      ...editor,
      snapshot:editor.snapshot,
      commit(){return editor.commit();},
    };
  }
  if(previousDraft)sessionContext.schemaGlobalUiEditor.restore(previousDraft);
}

const schemaInventoryCache = new WeakMap();

export function renderSchemaTduvOverview(sessionContext){
  const card=sessionContext.$('#schema-tduv-overview');
  const visible=sessionContext.activeApplicationPackage?.kind==='schemaDocument'&&!sessionContext.$('#geometry-view').hidden&&sessionContext.$('#results-view').hidden;
  card.hidden=!visible;
  if(!visible||!sessionContext.model)return;
  try{
    const document=sessionContext.model,label=sessionContext.openedDocumentPath()||'current schema';
    let cached=schemaInventoryCache.get(document);
    if(!cached||cached.label!==label){
      cached={label,counts:sessionContext.inspectSchemaDocument(document,label)};
      schemaInventoryCache.set(document,cached);
    }
    const counts=cached.counts;
    const summary=sessionContext.schemaStructureSummary(counts),host=sessionContext.$('#schema-tduv-counts');
    const metrics=[['T · tree nodes',summary.treeNodes],['D · field paths',summary.fieldPaths],['D · declarations',summary.fieldDeclarations],['U · behavior facts',summary.uiBehaviorFacts],['U · physical keys',summary.uiPhysicalKeys],['V · rules',summary.validationRules]];
    renderOwnedView(host,React.createElement(SchemaTduvMetrics,{metrics}));
    renderOwnedView(sessionContext.$('#schema-tduv-target-note'),summary.scopeNote);
  }catch(error){renderOwnedView(sessionContext.$('#schema-tduv-counts'),React.createElement(SchemaTduvMetrics,{error:error.message}));}
}
