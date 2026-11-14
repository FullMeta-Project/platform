import React from '../../shared/react/react-runtime.js';
import {renderOwnedView,joinView} from '../../../runtime/owned-view.js';
import {SchemaField,SchemaObject,SchemaStructure} from '../schema-form.js';
import {RowMoveControls} from '../../shared/react/collection-controls.js';
export function validateTreeAnnotationCandidate(sessionContext, candidate,edits){
  if(sessionContext.activeApplicationPackage?.kind!=='schemaDocument')throw new Error('Open a schema document first.');
  const draftIssue=sessionContext.validationEditDraftIssue({jsonDraftDirty: sessionContext.jsonDraftDirty,settingsDraftDirty: sessionContext.settingsDraftDirty});
  if(draftIssue)throw new Error(draftIssue);
  const expected=sessionContext.schemaWithTreeAnnotationEdits(sessionContext.model,edits);
  if(JSON.stringify(candidate)!==JSON.stringify(expected))throw new Error('The tree annotation preview is out of date. Reopen it.');
  const generatedIssue=sessionContext.schemaGeneratedOwnershipIssue(sessionContext.model,candidate,{
    allowGeneratedPaths:sessionContext.schemaTreeAnnotationEditPaths(edits),
  });
  if(generatedIssue)throw new Error(generatedIssue);
  const errors=sessionContext.validateFullMetaModelWithRules(candidate);
  if(errors.length)throw new Error(`The tree annotations are not ready to apply: ${errors[0]}`);
}

export function applicationTreeBehavior(sessionContext){return sessionContext.activeApplicationPackage?.treeBehavior||{}}

export function schemaAuthoringTreePreview(sessionContext, document){
  const lines=[];
  const visit=(entries,prefix=[],depth=0)=>{for(const entry of entries||[]){
    const binding=[...prefix,...(Array.isArray(entry?.path)?entry.path:[])];
    let declaration=document;
    for(const part of binding)declaration=part==='*'?declaration?.items:declaration?.properties?.[part];
    const group=Array.isArray(entry?.children)&&!entry.role;
    const label=entry?.title||declaration?.title||binding.at(-1)||'Project';
    const role=entry?.role?` · ${entry.role}`:group?' · group':'';
    lines.push(`${'  '.repeat(depth)}${label}${role}  [${binding.join(' › ')}]`);
    visit(entry?.children,binding,depth+1);
  }};
  visit(document?.['x-fullmeta-ui-tree']?.children||[]);
  return lines.length?lines.join('\n'):'(No project tree entries are bound yet.)';
}

export function treeIconSource(sessionContext, iconSvg){
  if(typeof iconSvg!=='string'||!/^<svg(?:\s|>)[\s\S]*<\/svg>\s*$/i.test(iconSvg.trim()))return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg.trim())}`;
}

export function treeIconForDeclaration(sessionContext, declaration){
  const iconFrom=(schema)=>sessionContext.isRecord(schema)?sessionContext.legacyFieldUiView(sessionContext.resolveModelEditorSchema(schema))?.['x-fullmeta-ui-icon']||null:null;
  const direct=iconFrom(declaration);
  if(direct||!sessionContext.isRecord(declaration)||typeof declaration.$ref!=='string')return direct;
  // Presentation siblings can override the referenced presentation as a whole
  // (for example, a hidden field paired with an icon on its reusable definition).
  // If the direct declaration has no icon, inspect the referenced declaration
  // alone so its structured icon remains available to the tree renderer.
  return iconFrom({$ref:declaration.$ref});
}

export function treeIconForPath(sessionContext, path,schemaForPath=sessionContext.modelEditorSchemaForPath){
  const direct=sessionContext.treeIconForDeclaration(schemaForPath(path));
  if(direct||!Array.isArray(path)||!path.length)return direct;
  const api=sessionContext.applicationSchemaApi(),parentPath=path.slice(0,-1),parentSchema=schemaForPath(parentPath),parentValue=sessionContext.valueAt(parentPath),last=path.at(-1);
  let declared;
  try{
    declared=Number.isInteger(last)
      ?api?.modelEditorSchemaItem?.(parentSchema,parentValue,last)
      :api?.modelEditorSchemaProperty?.(parentSchema,parentValue,String(last));
  }catch{return null}
  if(!sessionContext.isRecord(declared))return null;
  return sessionContext.treeIconForDeclaration(declared);
}

export function createModelTreeItem(sessionContext, label,path,{active=false,title=label,dataset={},disabled=false,schemaForPath=sessionContext.modelEditorSchemaForPath,iconSvg:declaredIconSvg=null}={}){
  const iconSvg=declaredIconSvg || (sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ? null : sessionContext.treeIconForPath(path,schemaForPath));
  let icon=null;
  const iconSource=sessionContext.treeIconSource(iconSvg);
  if(iconSource){
    icon=document.createElement('img');icon.className='tree-item-icon';icon.alt='';icon.setAttribute('aria-hidden','true');icon.src=iconSource;
    icon.addEventListener('error',()=>{icon.remove();button.classList.remove('tree-has-icon')},{once:true});
  }
  const button=sessionContext.createTreeItem({label,active,disabled,className:'tree-item',title,icon,dataset});
  return button;
}

export function treeSectionIconSvg(sessionContext, heading,rootItem,schemaForPath=sessionContext.modelEditorSchemaForPath){
  if(rootItem?.querySelector('.tree-item-icon'))return null;
  if(heading.treeIconSvg)return heading.treeIconSvg;
  let path;try{path=JSON.parse(heading.dataset.sectionSchemaPath||heading.dataset.arrayPath||rootItem?.dataset.modelPath||'null')}catch{return null}
  return sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ?sessionContext.legacyFieldUiView(schemaForPath(path))?.['x-fullmeta-ui-icon']||null
    :sessionContext.treeIconForPath(path,schemaForPath);
}

export function appendTreeSectionIcon(sessionContext, heading,iconSvg){
  const iconSource=sessionContext.treeIconSource(iconSvg);
  if(!iconSource)return;
  const icon=document.createElement('img');icon.className='tree-section-icon';icon.alt='';icon.setAttribute('aria-hidden','true');
  icon.src=iconSource;icon.addEventListener('error',()=>icon.remove(),{once:true});
  heading.querySelector('.tree-section-toggle')?.after(icon);
}

export function schemaTreeButtonForSelection(sessionContext, path,projectionNode=null){
  const location=projectionNode?.treeLocation;
  if(Array.isArray(location)){
    const match=[...sessionContext.treeContent.querySelectorAll('.tree-item[data-schema-tree-location]')].find(item=>{
      try{return sessionContext.samePath(JSON.parse(item.dataset.schemaTreeLocation),location)}catch{return false}
    });
    if(match)return match;
  }
  return [...sessionContext.treeContent.querySelectorAll('.tree-item[data-model-path]')].find(item=>{
    try{return sessionContext.samePath(JSON.parse(item.dataset.modelPath),path)}catch{return false}
  })||null;
}

export function updateTreeSelection(sessionContext, button){
  const previous=sessionContext.treeContent.querySelector('.tree-item.active');
  if(previous!==button)previous?.classList.remove('active');
  button?.classList.add('active');
}

export function treeUiSetting(sessionContext, name){return sessionContext.activeUiProfile?.behavior?.tree?.[name]??sessionContext.uiProfileSchema.properties?.behavior?.properties?.tree?.properties?.[name]?.default}

export function configureTreeRoot(sessionContext, schemaForPath=sessionContext.modelEditorSchemaForPath){
  const projectId=String(sessionContext.activeApplicationPackage?.rootLabel?.(sessionContext.model)||sessionContext.model?.metadata?.id||'model');
  const applicationPackage=sessionContext.activeApplicationPackage;
  const applicationName=applicationPackage?.applicationRegistration?.name||applicationPackage?.manifest?.name;
  const rootTitle=typeof applicationName==='string'&&applicationName.trim()?applicationName:projectId;
  const toggle=sessionContext.$('#tree-root-toggle'),children=sessionContext.$('#tree-children'),icon=sessionContext.$('#tree-root-icon');
  renderTreeRootTitle(sessionContext,{label:rootTitle,...renameCallbacks(sessionContext)});
  const rootDeclaration=sessionContext.activeApplicationPackage?.kind==='schemaDocument'?sessionContext.model:schemaForPath([]);
  const rootIcon=sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    ?sessionContext.legacyFieldUiView(rootDeclaration)?.['x-fullmeta-ui-icon']
    :sessionContext.treeIconForDeclaration(rootDeclaration);
  const iconSource=sessionContext.treeIconSource(rootIcon);
  icon.hidden=!iconSource;
  if(iconSource&&icon.getAttribute('src')!==iconSource){icon.src=iconSource;icon.addEventListener('error',()=>{icon.hidden=true},{once:true})}
  const collapsed=sessionContext.treeRootCollapsedState.get(projectId)??Boolean(sessionContext.treeUiSetting('rootCollapsedByDefault'));
  children.hidden=collapsed;sessionContext.setTreeToggleState(toggle,{expanded:!collapsed,label:'project tree'});
}

export function configureTreeSectionCollapse(sessionContext, root,schemaForPath){
  sessionContext.configureTreeSections(root,{
    projectId:sessionContext.model?.metadata?.id||'model',
    collapsedByDefault:Boolean(sessionContext.treeUiSetting('collapsedByDefault')),
    collapsedHandle:String(sessionContext.treeUiSetting('collapsedHandle')??'▸'),
    expandedHandle:String(sessionContext.treeUiSetting('expandedHandle')??'▾'),
    state:sessionContext.treeSectionCollapsedState,
    schemaForPath,
    iconForSection:(heading,rootItem,lookup)=>sessionContext.treeSectionIconSvg(heading,rootItem,lookup),
    appendSectionIcon:sessionContext.appendTreeSectionIcon,
    onPopulate:sessionContext.configureTreeItemDragging,
  });
}

export function treeItemPath(sessionContext, node){try{return JSON.parse(node?.dataset?.modelPath||'null')}catch{return null}}

export function treeArrayPathForItem(sessionContext, path){
  const applicationPath=sessionContext.applicationTreeBehavior().arrayPathForItem?.(sessionContext.model,path);
  if(applicationPath!==undefined)return applicationPath;
  if(!Array.isArray(path)||!Number.isInteger(path.at(-1)))return null;
  const arrayPath=path.slice(0,-1);
  return Array.isArray(sessionContext.valueAt(arrayPath))?arrayPath:null;
}

export function configureTreeItemDragging(sessionContext, root){
  const behavior=sessionContext.applicationTreeBehavior();
  for(const node of root.querySelectorAll('.tree-item[data-model-path]')){node.draggable=false;node.classList.remove('tree-reorderable');node.title=node.textContent.trim()}
  for(const node of root.querySelectorAll('.tree-item[data-model-path]')){
    const path=sessionContext.treeItemPath(node);if(!behavior.isSpecialItemPath?.(path,sessionContext.model))continue;
    node.classList.add('tree-reorderable');
    node.title=behavior.specialItemDragTitle?.(node.textContent.trim(),sessionContext.model,path)||`${node.textContent.trim()} · Drag to move`;
  }
  for(const section of root.querySelectorAll('.tree-group')){
    const siblingGroups=new Map();
    for(const node of Array.from(section.children).filter((child)=>child.matches('.tree-item[data-model-path]'))){
      const path=sessionContext.treeItemPath(node),arrayPath=sessionContext.treeArrayPathForItem(path);if(!arrayPath)continue;
      if(behavior.isSpecialItemPath?.(path,sessionContext.model))continue;
      const key=JSON.stringify(arrayPath);if(!siblingGroups.has(key))siblingGroups.set(key,[]);siblingGroups.get(key).push(node);
    }
    for(const siblings of siblingGroups.values())if(siblings.length>1)for(const node of siblings){
      node.classList.add('tree-reorderable');node.title=`${node.textContent.trim()} · Drag to reorder within this section`;
    }
  }
}

export function clearTreeDropIndicators(sessionContext){
  sessionContext.treeContent.querySelectorAll('.tree-dragging,.tree-drop-before,.tree-drop-after').forEach((node)=>node.classList.remove('tree-dragging','tree-drop-before','tree-drop-after'));
  sessionContext.treeContent.querySelectorAll('.tree-drop-target').forEach((node)=>node.classList.remove('tree-drop-target'));
}

export function reorderTreeItem(sessionContext, sourceState,targetNode,dropAfter){
  const targetPath=sessionContext.treeItemPath(targetNode),targetArrayPath=sessionContext.treeArrayPathForItem(targetPath),section=targetNode.closest('.tree-group');
  if(!targetArrayPath||!sessionContext.samePath(targetArrayPath,sourceState.arrayPath))return false;
  if(sessionContext.jsonDraftDirty){sessionContext.setStatus('Apply or discard the JSON editor changes before reordering model-tree items.','error');return false;}
  try{sessionContext.applyCurrentSettingsDraft({refresh:false})}catch{return false;}
  const arrayPath=sourceState.arrayPath,sourceIndex=sourceState.sourcePath.at(-1),targetIndex=targetPath.at(-1),array=sessionContext.valueAt(arrayPath);
  if(!Array.isArray(array)||!Number.isInteger(sourceIndex)||!Number.isInteger(targetIndex)||!array[sourceIndex]||!array[targetIndex])return false;
  const rows=Array.from(sessionContext.treeContent.querySelectorAll('.tree-item[data-model-path]'));
  const slots=rows.map((node)=>({node,path:sessionContext.treeItemPath(node)})).filter((entry)=>sessionContext.samePath(sessionContext.treeArrayPathForItem(entry.path),arrayPath)).map((entry)=>entry.path.at(-1));
  const sourcePosition=slots.indexOf(sourceIndex),targetPosition=slots.indexOf(targetIndex);
  if(sourcePosition<0||targetPosition<0)return false;
  const candidate=sessionContext.cloneJson(sessionContext.model),nextArray=arrayPath.reduce((value,key)=>value?.[key],candidate);
  if(!Array.isArray(nextArray))return false;
  const priorVisibleItems=slots.map((index)=>nextArray[index]),orderedVisibleItems=[...priorVisibleItems],movedItem=orderedVisibleItems.splice(sourcePosition,1)[0];
  const selectedBelongsToArray=Array.isArray(sessionContext.selectedPath)&&sessionContext.selectedPath.length>arrayPath.length&&sessionContext.samePath(sessionContext.selectedPath.slice(0,arrayPath.length),arrayPath)&&Number.isInteger(sessionContext.selectedPath[arrayPath.length]);
  const selectedVisiblePositionBefore=selectedBelongsToArray?slots.indexOf(sessionContext.selectedPath[arrayPath.length]):-1;
  const selectedCandidateItem=selectedVisiblePositionBefore>=0?priorVisibleItems[selectedVisiblePositionBefore]:null;
  let insertionPosition=targetPosition+(dropAfter?1:0);if(sourcePosition<insertionPosition)insertionPosition--;
  orderedVisibleItems.splice(insertionPosition,0,movedItem);
  if(priorVisibleItems.every((item,index)=>item===orderedVisibleItems[index]))return false;
  slots.forEach((slot,index)=>{nextArray[slot]=orderedVisibleItems[index]});
  sessionContext.model=candidate;
  if(selectedBelongsToArray){
    const selectedVisiblePosition=selectedCandidateItem?orderedVisibleItems.indexOf(selectedCandidateItem):-1;
    if(selectedVisiblePosition>=0)sessionContext.selectedPath=[...arrayPath,slots[selectedVisiblePosition],...sessionContext.selectedPath.slice(arrayPath.length+1)];
  }
  if(sessionContext.applicationTreeBehavior().affectsPreviewForReorder?.(sessionContext.model,arrayPath))sessionContext.invalidatePreviewArtifacts();
  sessionContext.renderModel();
  const sectionName=sourceState.section.querySelector('.tree-label')?.textContent.trim()||String(arrayPath.at(-1));
  sessionContext.setStatus(`Moved “${sourceState.sourceLabel}” within ${sectionName}. Save to keep the change.`,'good');
  return true;
}

export function moveSpecialTreeItem(sessionContext, sourcePath,destinationPath,index){
  const moveItem=sessionContext.applicationTreeBehavior().moveItem;
  if(typeof moveItem!=='function')return false;
  if(sessionContext.jsonDraftDirty){sessionContext.setStatus('Apply or discard the JSON editor changes before moving this tree item.','error');return false;}
  try{sessionContext.applyCurrentSettingsDraft({refresh:false})}catch{return false;}
  const move=moveItem(sessionContext.model,sourcePath,destinationPath,index);if(!move)return false;
  sessionContext.model=move.model;sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;
  sessionContext.invalidatePreviewArtifacts();sessionContext.renderModel();
  sessionContext.setStatus(move.message||`Moved ${move.featureLabel||'item'} ${move.destinationIsGroup?'under':'to'} ${move.destinationLabel||'its destination'}. Save to keep the change.`,'good');
  return true;
}

export function treeDropPlan(sessionContext, state,targetNode,clientY){
  const sourcePath=state.sourcePath,targetPath=sessionContext.treeItemPath(targetNode);
  const behavior=sessionContext.applicationTreeBehavior(),isSpecial=behavior.isSpecialItemPath;
  if(isSpecial?.(sourcePath,sessionContext.model)||isSpecial?.(targetPath,sessionContext.model))return behavior.dropPlan?.({model: sessionContext.model,sourcePath,targetPath,targetNode,clientY})||null;
  const targetArrayPath=sessionContext.treeArrayPathForItem(targetPath);
  if(!targetArrayPath||targetNode.closest('.tree-group')!==state.section||!sessionContext.samePath(targetArrayPath,state.arrayPath))return null;
  const bounds=targetNode.getBoundingClientRect();
  return{kind:'reorder',dropAfter:clientY>bounds.top+bounds.height/2};
}

export function renderTree(sessionContext) {
  const root=sessionContext.$('#tree-content');if(!sessionContext.model)return;
  const treeModel=sessionContext.model,schemaCache=new Map();
  const schemaForPath=(path,options)=>{
    const key=`${options?.resolveVariant===false?'direct':'resolved'}:${JSON.stringify(path||[])}`;
    if(!schemaCache.has(key))schemaCache.set(key,sessionContext.modelEditorSchemaForPath(treeModel,path,options));
    return schemaCache.get(key);
  };
  sessionContext.configureTreeRoot(schemaForPath);
  const schemaDescriptor=schemaForPath([])?.['x-fullmeta-ui-tree'];
  const descriptor=sessionContext.activeApplicationPackage?.treeDescriptorForModel?.(treeModel,schemaDescriptor)||schemaDescriptor;
  if(!sessionContext.samePath(sessionContext.reactTreeState.selectedPath,sessionContext.selectedPath))sessionContext.reactTreeState={...sessionContext.reactTreeState,selectedId:null,selectedPath:Array.isArray(sessionContext.selectedPath)?[...sessionContext.selectedPath]:null};
  sessionContext.reactTreeProjection=sessionContext.projectSchemaTree(treeModel,descriptor,{state:sessionContext.reactTreeState,schemaForPath,resolveSchema:sessionContext.resolveModelEditorSchema,
    labelFor:sessionContext.referenceItemLabel,collapsedByDefault:Boolean(sessionContext.treeUiSetting('collapsedByDefault'))});
  const props={projection:sessionContext.reactTreeProjection,rename:sessionContext.treeRename,
    onRenameChange:renameCallbacks(sessionContext).onChange,onRenameCommit:renameCallbacks(sessionContext).onCommit,onRenameCancel:renameCallbacks(sessionContext).onCancel,
    collapsedHandle:String(sessionContext.treeUiSetting('collapsedHandle')??'▸'),expandedHandle:String(sessionContext.treeUiSetting('expandedHandle')??'▾'),
    onSelect(node,button){sessionContext.selectItem(node.label,node.path,button,node.projection||null);if(sessionContext.samePath(sessionContext.selectedPath,node.path))sessionContext.reactTreeState=sessionContext.reduceTreeViewState(sessionContext.reactTreeState,{type:'select',id:node.id,path:node.path});},
    onCollectionSelect(node,button){sessionContext.selectDefinitionCollection(node.collection,button);sessionContext.reactTreeState=sessionContext.reduceTreeViewState(sessionContext.reactTreeState,{type:'select',id:node.id,path:node.path});},
    onToggle({id,path,expanded}){sessionContext.reactTreeState=sessionContext.reduceTreeViewState(sessionContext.reactTreeState,{type:'toggle',id,path,expanded});sessionContext.renderTree();},
    onNodeRef(node,button){if(node.projection)sessionContext.schemaProjectionForTreeButton.set(button,node.projection);},
    onPopulate:sessionContext.configureTreeItemDragging,
    onFocus(node){sessionContext.reactTreeState=sessionContext.reduceTreeViewState(sessionContext.reactTreeState,{type:'focus',id:node.id});},
    iconForNode(node){return sessionContext.treeIconSource(node.projection?.iconSvg||node.iconSvg||(sessionContext.activeApplicationPackage?.kind==='schemaDocument'?null:sessionContext.treeIconForPath(node.path,schemaForPath)));},
  };
  if(sessionContext.reactTreeMount)sessionContext.reactTreeMount.update(props);else sessionContext.reactTreeMount=sessionContext.mountReactTree(root,props);
}

export function treeSelectionPathExists(model,path){
  if(!Array.isArray(path))return false;
  let current=model;
  for(const key of path){
    if(current===null||typeof current!=='object'||!Object.hasOwn(current,key))return false;
    current=current[key];
  }
  return true;
}

export function selectItem(sessionContext, label, path, button, projectionNode=null) {
  let modelChanged=false;try{modelChanged=sessionContext.applyCurrentSettingsDraft({refresh:false,announce:true});}catch{return;}
  if(modelChanged)sessionContext.renderTree();
  if(!treeSelectionPathExists(sessionContext.model,path)){
    if(!modelChanged)sessionContext.renderTree();
    sessionContext.setStatus('That tree item no longer exists. Choose an available item.','good');
    return;
  }
  sessionContext.invalidateScanConfirmation?.();
  const previousComponentId=sessionContext.activeComponentId();
  sessionContext.selectedSchemaProjection=projectionNode;
  sessionContext.selectedPath = path; sessionContext.selectedCollection=null; sessionContext.selectedLabel = label;
  sessionContext.clearPreviewForComponentChange(previousComponentId,sessionContext.activeComponentId());
  if(!modelChanged)sessionContext.updateTreeSelection(button);
  sessionContext.$('#selection-title').textContent = label;
  sessionContext.$('#selection-path').textContent = sessionContext.activeApplicationPackage?.kind==='schemaDocument'
    &&Array.isArray(projectionNode?.treeTrail)
    ?projectionNode.treeTrail.map(entry=>entry.label).join(' › '):path.join(' › ');
  const resultItem=sessionContext.isResultPath(path);
  sessionContext.settingsDraft = sessionContext.cloneJson(sessionContext.valueAt(path));sessionContext.settingsDraftDirty=false;
  sessionContext.renderSelectedItemSettings(label,path);if(resultItem)sessionContext.settingsTable.parentElement.scrollTop=0;
  const noteContext=sessionContext.activeApplicationPackage?.selectionNoteContext?.({model: sessionContext.model,path,draft:sessionContext.settingsDraft,component:sessionContext.modelComponent(),hasRole:sessionContext.hasEditorRole})||{};
  const selectedItemDescription=sessionContext.resolveModelEditorSchema(sessionContext.modelEditorSchemaForPath(sessionContext.model,path))?.description;
  sessionContext.$('#editor-note').textContent=sessionContext.modelEditorNote(sessionContext.activeApplicationPackage?.modelEditorUi,'selection',path,sessionContext.settingsDraft,{...noteContext,profileCopy:sessionContext.activeUiProfile?.copy})
    ||selectedItemDescription||sessionContext.profileCopy('genericSettingsNote',sessionContext.activeApplicationPackage?.kind==='schemaDocument'
      ?'Edit the schema settings. Apply item or choose another tree item to keep changes in the open document; use Save to write them to disk.'
      :'Edit the typed settings. Apply item, choose another tree item, or start an operation to commit them to the model JSON.');
  sessionContext.updateApplySettingsVisibility();sessionContext.updateModelEditState();
  if(sessionContext.settingsDraftDirty&&resultItem)sessionContext.setStatus('Duplicate plot-series IDs were repaired in this draft. Apply the plot item and Save the model to keep the correction.','good');
  sessionContext.showGraphicsForSelection(path,sessionContext.valueAt(path));
  sessionContext.showSchemaGraphicsContext();sessionContext.syncSchemaStructureDialogHeader();
}

export function showModelOverview(sessionContext){
  sessionContext.invalidateScanConfirmation?.();
  if(!sessionContext.model)return;
  try{sessionContext.applyCurrentSettingsDraft({refresh:false,announce:true});}catch{return;}
  sessionContext.selectedSchemaProjection=null;
  sessionContext.selectedPath=sessionContext.activeApplicationPackage?.kind==='schemaDocument'?[]:null;
  sessionContext.selectedCollection=null;sessionContext.selectedLabel=sessionContext.activeApplicationPackage?.kind==='schemaDocument'?'Document settings':'';
  sessionContext.settingsDraft=sessionContext.selectedPath?sessionContext.cloneJson(sessionContext.model):null;sessionContext.settingsDraftDirty=false;
  sessionContext.setTab();
  sessionContext.renderTree();sessionContext.renderSettingsTable();
  sessionContext.updateSelectionActionVisibility();sessionContext.updateWorkflowPanels();
  sessionContext.settingsTable.parentElement.scrollTop=0;
  sessionContext.showDefaultGraphicsScene();sessionContext.syncModelActionAvailability();
}

export function treeActionPlans(sessionContext){
  const create=sessionContext.activeApplicationPackage?.treeActionPlans;
  if(typeof create!=='function')throw new Error('The active application does not provide tree action plans.');
  const dimension=sessionContext.activeScenarioDimension();
  const catalogContext=sessionContext.activeApplicationPackage?.treeActionCatalogs?.({model: sessionContext.model,dimension,capabilities:sessionContext.engineCapabilities})||{};
  return create({
    model: sessionContext.model,ui:sessionContext.activeApplicationPackage.modelEditorUi,capabilities:sessionContext.engineCapabilities,
    catalogs:catalogContext.catalogs||{},catalogIssues:catalogContext.issues||{},
    factories:sessionContext.activeApplicationPackage.editorFactories,valueAt: sessionContext.valueAt,rolePath:sessionContext.editorRolePath,rolePathAt:sessionContext.editorRolePathAt,
    hasRole:sessionContext.hasEditorRole,isRoleItem:sessionContext.isEditorRoleItem,isRoleRoot:sessionContext.isEditorRoleRoot,
    componentFor:sessionContext.componentForArray,dimension,
    makeId:sessionContext.uniqueId,makeName:sessionContext.uniqueName,makeSymbol:sessionContext.uniqueSymbol,cloneItem:sessionContext.cloneWithUniqueIds,
    cloneModelItem:sessionContext.cloneModelItemWithUniqueIds,editorOptions:sessionContext.editorOptions(),
    definitionLabel: sessionContext.definitionLabel,referenceItemLabel: sessionContext.referenceItemLabel,
  });
}

export function modelAfterTreeDeletion(sessionContext, path){
  return sessionContext.modelAfterTreeDeletionTransaction(sessionContext.model,path);
}

export function deleteTreeItem(sessionContext, path) {
  const objectDeletion=sessionContext.treeActionPlans().objectPropertyDeletion(path);
  if(objectDeletion){
    const parentPath=path.slice(0,-1),childKey=path.at(-1),parent=sessionContext.valueAt(parentPath),child=parent?.[childKey];if(!child)return;
    const name=child.name||objectDeletion.fallbackName,updated={...parent};delete updated[childKey];
    sessionContext.model=sessionContext.modelWithSettingsItemDraft(sessionContext.model,parentPath,updated);sessionContext.selectedPath=null;sessionContext.selectedCollection=null;sessionContext.selectedLabel='';sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;
    sessionContext.$('#selection-title').textContent='Settings';sessionContext.$('#selection-path').textContent='No item selected';sessionContext.renderModel();sessionContext.setStatus(`Removed ${name} from its ${objectDeletion.parentName}. Save to keep the change.`,'good');return;
  }
  if (!path || !Number.isInteger(path.at(-1))) return;
  const arrayPath=path.slice(0,-1), index=path.at(-1), list=sessionContext.valueAt(arrayPath), item=list?.[index]; if (!item) return;
  sessionContext.model=sessionContext.modelAfterTreeDeletion(path);
  sessionContext.selectedPath=null; sessionContext.selectedCollection=null; sessionContext.selectedLabel=''; sessionContext.settingsDraft=null;sessionContext.settingsDraftDirty=false;
  if (sessionContext.hasAnyEditorRole('previewCollectionInvalidationRoles',arrayPath)) sessionContext.invalidatePreviewArtifacts();
  sessionContext.$('#selection-title').textContent='Settings'; sessionContext.$('#selection-path').textContent='No item selected'; sessionContext.renderModel();
  sessionContext.setStatus(`Removed ${item.name || item.id || 'item'}. Validate the model to check for affected references, then Save to keep the change.`, 'good');
}

export function startInlineTreeRename(sessionContext, path,initialValue,commitRename,fieldLabel='name',projectionNode=null,sourceAction=null) {
  const button=path?.length===0?sessionContext.$('#tree-home'):sessionContext.schemaTreeButtonForSelection(path,projectionNode);
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return false;
  const value=typeof initialValue==='function'?initialValue(button):initialValue;
  sessionContext.treeRename={nodeId:path.length===0?'@root':button.dataset.treeNodeId,path:[...path],original:String(value??''),value:String(value??''),fieldLabel,error:'',sourceAction};
  sessionContext.treeRenameCommit=commitRename;sessionContext.renderTree();sessionContext.syncModelActionAvailability?.();
  return true;
}

function renameCallbacks(sessionContext){return {
  onChange(value){if(!sessionContext.treeRename)return;sessionContext.treeRename={...sessionContext.treeRename,value,error:''};sessionContext.renderTree();sessionContext.syncModelActionAvailability?.();},
  onCancel(){if(!sessionContext.treeRename)return;sessionContext.treeRenameCommit=null;sessionContext.treeRename=null;sessionContext.renderTree();sessionContext.syncModelActionAvailability?.();},
  onCommit(){const draft=sessionContext.treeRename,commit=sessionContext.treeRenameCommit;if(!draft||!commit)return;const value=draft.value.trim();if(!value){draft.error=`A tree item ${draft.fieldLabel} cannot be empty.`;sessionContext.setStatus(draft.error,'error');sessionContext.renderTree();return;}sessionContext.treeRenameCommit=null;sessionContext.treeRename=null;try{commit(value);sessionContext.renderTree();}catch(error){sessionContext.treeRenameCommit=commit;sessionContext.treeRename={...draft,error:`Could not rename ${draft.original}. ${error.message}`};sessionContext.setStatus(sessionContext.treeRename.error,'error');sessionContext.renderTree();}sessionContext.syncModelActionAvailability?.();}
};}
/** Normal inline-rename callbacks shared by React events and semantic commands. */
export function changeTreeRename(sessionContext, value) { return renameCallbacks(sessionContext).onChange(value); }
export function commitTreeRename(sessionContext) { return renameCallbacks(sessionContext).onCommit(); }
export function cancelTreeRename(sessionContext) { return renameCallbacks(sessionContext).onCancel(); }

export function startRenameTreeItem(sessionContext, path) {
  const item=sessionContext.valueAt(path);if(!item||typeof item.name!=='string')return false;
  return sessionContext.startInlineTreeRename(path,item.name,(name)=>{
    if(name===item.name){sessionContext.renderTree();return;}
    sessionContext.model=sessionContext.modelWithSettingsItem(sessionContext.model,path,{...item,name});
    const renamed=sessionContext.valueAt(path);sessionContext.selectedLabel=sessionContext.displayItemName(renamed,path.slice(0,-1));sessionContext.$('#selection-title').textContent=sessionContext.selectedLabel;
    sessionContext.renderModel();sessionContext.setStatus(`Renamed to ${renamed.name}. Save to keep the change.`,'good');
  },'name',null,{kind:'name',path:[...path]});
}

export function startDeclaredTreeInlineEdit(sessionContext, action,target,edit){
  if(edit?.field!=='title'||!Array.isArray(target?.itemPath))return false;
  const path=target.itemPath,item=sessionContext.valueAt(path);
  if(!sessionContext.isRecord(item))return false;
  return sessionContext.startInlineTreeRename(path,button=>item.title||button.querySelector('.tree-item-text')?.textContent.trim()||button.textContent.trim(),(title)=>{
    if(title===item.title){sessionContext.renderTree();return;}
    if(!sessionContext.performDeclaredTreeAction(action,target,{title}))throw new Error(`No handler is registered for ${action}.`);
  },'title',target.schemaProjection,{kind:'declared-title',action,path:[...path],projection:target.schemaProjection||null});
}

export function closeTreeMenu(sessionContext) { sessionContext.contextMenu.classList.add('hidden'); renderOwnedView(sessionContext.contextMenu, null); sessionContext.contextTarget=null; }

export function treeInsertionForAction(sessionContext, action,target){return sessionContext.treeActionPlans().insertionForAction(action,target)}

export function toggleTreeItemEnabled(sessionContext, path){
  if(!sessionContext.isToggleEnabledItemPath(path))throw new Error('This tree item cannot be enabled or disabled.');
  const item=sessionContext.valueAt(path);if(!item||typeof item!=='object')throw new Error('The selected item no longer exists.');
  const enabled=item.enabled===false;
  const updated={...item,enabled};
  sessionContext.model=sessionContext.modelWithSettingsItem(sessionContext.model,path,updated);
  sessionContext.selectedPath=path;sessionContext.selectedCollection=null;sessionContext.selectedLabel=sessionContext.displayItemName(updated,path.slice(0,-1));sessionContext.settingsDraft=sessionContext.cloneJson(updated);sessionContext.settingsDraftDirty=false;
  sessionContext.renderModel();
  sessionContext.setStatus(`${enabled?'Enabled':'Disabled'} ${item.name||item.id||'item'}. Save to keep the change.`,'good');
}

export function treeActionAvailability(sessionContext, action,target){
  const declared=sessionContext.treeActionPlans().actionAvailability?.(action,target);
  if(declared)return declared;
  if(action==='delete'){
    const path=target?.itemPath;
    if(sessionContext.treeActionPlans().objectPropertyDeletion(path))return{disabled:false,reason:''};
    if(!path||!Number.isInteger(path.at(-1)))return{disabled:true,reason:'Select an item in the tree first.'};
    return sessionContext.valueAt(path)?{disabled:false,reason:''}:{disabled:true,reason:'The selected item no longer exists.'};
  }
  const catalogIssue=sessionContext.treeActionPlans().catalogIssue(action);
  if(catalogIssue)return{disabled:true,reason:catalogIssue};
  try{
    const insertion=sessionContext.treeInsertionForAction(action,target);
    if(!insertion)return{disabled:true,reason:`This editor has no operation handler for ${action}.`};
    if(insertion.settingsPath){sessionContext.settingsInsertionTarget(insertion);return{disabled:false,reason:''};}
    sessionContext.insertionIndexFor(insertion.arrayPath,insertion.afterIndex);
    sessionContext.checkArrayInsertionLimit(insertion.arrayPath);
    return{disabled:false,reason:''};
  }catch(error){return{disabled:true,reason:error.message};}
}

export function performTreeInsertionAction(sessionContext, action,target){
  const insertion=sessionContext.treeInsertionForAction(action,target);
  if(!insertion)throw new Error(`This editor has no operation handler for ${action}.`);
  if(insertion.settingsPath){
    // Optional nested actions do not exist in the
    // model until they are added. Set the existing parent object with the new
    // child instead of trying to set a missing leaf path.
    const {parentPath,childKey,parent}=sessionContext.settingsInsertionTarget(insertion);
    sessionContext.model=sessionContext.modelWithSettingsItemDraft(sessionContext.model,parentPath,{...parent,[childKey]:insertion.item});
    sessionContext.selectedPath=insertion.settingsPath;sessionContext.selectedCollection=null;sessionContext.selectedLabel=insertion.item.name||insertion.fallbackName||'item';sessionContext.settingsDraft=sessionContext.cloneJson(insertion.item);sessionContext.settingsDraftDirty=false;sessionContext.renderModel();sessionContext.setStatus(`Added ${sessionContext.selectedLabel} under ${sessionContext.valueAt(insertion.settingsPath.slice(0,-1))?.name||insertion.parentName||'item'}. Save to keep the change.`,'good');return;
  }
  sessionContext.insertArrayItem(insertion.arrayPath,insertion.item,insertion.afterIndex);
  const notice=sessionContext.activeApplicationPackage?.treeInsertionNotice?.({model: sessionContext.model,insertion,action,engineCapabilities: sessionContext.engineCapabilities,editorUi:sessionContext.activeApplicationPackage.modelEditorUi});
  if(notice)sessionContext.setStatus(notice.message,notice.kind||'good');
}

export function performDeclaredTreeAction(sessionContext, action,target,input={}){
  const plan=sessionContext.treeActionPlans(),availability=plan.actionAvailability?.(action,target);
  if(!availability)return false;
  if(availability.disabled)throw new Error(availability.reason||`Cannot ${action} here.`);
  if(sessionContext.jsonDraftDirty)throw new Error('Apply the current JSON draft before changing this tree item.');
  sessionContext.applyCurrentSettingsDraft({refresh:false,announce:true});
  const result=sessionContext.treeActionPlans().executeAction?.(action,target,input);
  if(!result)throw new Error(`This editor has no operation handler for ${action}.`);
  if(result.validate){
    const errors=sessionContext.validateFullMetaModelWithRules(result.document);
    if(errors.length)throw new Error(errors[0]);
  }
  // A null path opens the overview; an empty array selects the document root.
  const opensOverview=result.path===null;
  if(!opensOverview&&!Array.isArray(result.path))throw new Error(`Invalid selection path for ${action}.`);
  sessionContext.model=result.document;
  sessionContext.selectedPath=result.path;sessionContext.selectedCollection=null;sessionContext.selectedLabel=opensOverview?'':result.label;
  const priorProjection=target.schemaProjection;
  sessionContext.selectedSchemaProjection=!opensOverview&&action==='schema.renameTitle'&&sessionContext.samePath(result.path,priorProjection?.path)
    ?{...priorProjection,label:result.label,
      treeTrail:priorProjection.treeTrail?.map((entry,index,trail)=>index===trail.length-1
        ?{...entry,label:result.label}:entry)}:null;
  sessionContext.settingsDraft=opensOverview?null:sessionContext.cloneJson(sessionContext.valueAt(sessionContext.selectedPath));sessionContext.settingsDraftDirty=false;
  sessionContext.renderModel();
  if(opensOverview){
    sessionContext.showDefaultGraphicsScene();
  }else{
    sessionContext.$('#selection-title').textContent=result.label;
    sessionContext.$('#selection-path').textContent=sessionContext.selectedSchemaProjection?.treeTrail?.map(entry=>entry.label).join(' › ')
      ||result.path.join(' › ');
    sessionContext.showSchemaGraphicsContext();
  }
  sessionContext.setStatus(result.message||`Updated ${result.label||'model draft'}. Save to keep the change.`,'good');
  return true;
}

export function clearTreeDropTargetIndicators(sessionContext){
  sessionContext.treeContent.querySelectorAll('.tree-drop-before,.tree-drop-after').forEach((node)=>node.classList.remove('tree-drop-before','tree-drop-after'));
  sessionContext.treeContent.querySelectorAll('.tree-drop-target').forEach((node)=>node.classList.remove('tree-drop-target'));
}

export function setTreeWidth(sessionContext, treeWidth) {
  if(window.matchMedia('(max-width: 900px)').matches)return;
  const compact=window.matchMedia('(max-width: 1100px)').matches,width=sessionContext.workspace.clientWidth,minTree=compact?190:210,minRight=320;
  treeWidth=Math.max(minTree,Math.min(420,Math.min(treeWidth,width-minRight-12)));
  sessionContext.workspace.style.setProperty('--tree-width',`${treeWidth}px`);
  sessionContext.treeSplitter.setAttribute('aria-valuemin',String(minTree));sessionContext.treeSplitter.setAttribute('aria-valuemax','420');sessionContext.treeSplitter.setAttribute('aria-valuenow',String(Math.round(treeWidth)));
  try{localStorage.setItem('fullmeta.modelEditor.treeWidth',String(Math.round(treeWidth)))}catch{}
  sessionContext.drawPreview();
}
import {renderTreeRootTitle} from './tree-inline-edit.js';
