/** Built-in editing dialog adapters. No opener nodes or executable callbacks enter snapshots. */
import {validateDialogPrivateState} from './dialog-private-state.js';
import {snapshotProjectIntegrationForm,restoreProjectIntegrationForm} from './schema-project-integration-form.js';
export const coreSchemaDialogIds=Object.freeze(['schema-authoring','schema-structure']);
const clone=value=>structuredClone(value);
const authoringTarget=value=>({itemPath:[...(value?.itemPath||[])],schemaProjection:clone(value?.schemaProjection||null)});
const structureTarget=value=>({path:Array.isArray(value?.path)?[...value.path]:null,label:String(value?.label||''),projection:clone(value?.projection||null)});
const provider=context=>({applicationId:context.activeApplicationPackage.id,schemaPath:context.activeApplicationPackage.schemaPath});
/** @param {any} context */
export function createCoreSchemaDialogControllers(context){
  let authoringPreview=false;
  const validate=(value,toolId)=>validateDialogPrivateState(value,{source:context.model,toolId,provider:provider(context)});
  return {
    'schema-authoring':{
      restoreControls:true,
      get dialog(){return context.$('#schema-authoring-dialog');},
      open(target){context.openSchemaAuthoringDialog(target);},
      snapshot(){const state=context.schemaAuthoringDialogState;if(!state)return null;const operation=context.$('#schema-authoring-operation').value,projectDraft=operation==='project-integration'?snapshotProjectIntegrationForm(context.$('#schema-authoring-inputs')):null;
        return {format:'fullmeta-schema-authoring-dialog-state/1',source:clone(context.model),provider:provider(context),target:authoringTarget(state.target),originalTarget:authoringTarget(state.originalTarget),appliedTargetPath:state.appliedTargetPath,operation,fieldRowCount:context.$('#schema-authoring-dialog').querySelectorAll('[data-schema-authoring-field-row]').length,kindRowCount:context.$('#schema-authoring-dialog').querySelectorAll('[data-schema-authoring-kind-row]').length,hadPreview:Boolean(state.preview),...(projectDraft?{projectDraft}:{} )};},
      restore(value){validate(value,'schema-authoring');context.openSchemaAuthoringDialog(clone(value.target));
        const select=context.$('#schema-authoring-operation');if(![...select.options].some(option=>option.value===value.operation))throw new Error('The saved operation is unavailable for this schema target.');select.value=value.operation;
        Object.assign(context.schemaAuthoringDialogState,{target:clone(value.target),originalTarget:clone(value.originalTarget),appliedTargetPath:value.appliedTargetPath,preview:null});
        context.renderSchemaAuthoringInputs({restoreRows:{field:value.fieldRowCount,kind:value.kindRowCount}});
        if(value.projectDraft)restoreProjectIntegrationForm(context.$('#schema-authoring-inputs'),value.projectDraft);
        authoringPreview=value.hadPreview;return {restored:true};},
      async afterRestore(){if(authoringPreview){authoringPreview=false;await context.previewSchemaAuthoringOperation();}},
      close(){context.closeSchemaAuthoringDialog();}
    },
    'schema-structure':{
      restoreControls:true,restoreBeforeDrafts:true,
      get dialog(){return context.$('#schema-open-dialog');},
      open(target){return context.openSchemaStructureDialog(target,null);},
      snapshot(){const state=context.schemaStructureDialogState;if(!state)return null;return {format:'fullmeta-schema-structure-dialog-state/1',source:clone(context.model),provider:provider(context),snapshot:{model:clone(state.snapshot.model)},parent:structureTarget(state.parent),targetPath:[...state.targetPath],history:(state.history||[]).map(structureTarget),current:structureTarget(context.currentSchemaStructureDialogTarget())};},
      restore(value){validate(value,'schema-structure');context.schemaStructureDialogState=null;
        if(context.$('#schema-open-dialog').open)context.$('#schema-open-dialog').close();
        if(!context.openSchemaStructureDialog(clone(value.current),null))throw new Error('The saved schema declaration could not be opened.');
        context.schemaStructureDialogState={parent:clone(value.parent),opener:null,targetPath:[...value.targetPath],history:clone(value.history),snapshot:clone(value.snapshot)};
        context.syncSchemaStructureDialogHeader();return {restored:true};},
      close(){return context.finishSchemaStructureDialog({apply:false});}
    }
  };
}
