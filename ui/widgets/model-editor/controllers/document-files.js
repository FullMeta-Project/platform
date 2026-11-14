/** File presentation delegates document effects to the existing document controller. */
import {createWorkspaceFilePicker,validateWorkspacePickerState} from '../../../workspace/file-picker.js';

const controllers=new WeakMap();
const knownFields={new:['id','choice','folder','file'],saveAs:['file']};
const fieldIds={new:{id:'new-model-id',choice:'new-model-choice',folder:'new-model-folder',file:'new-model-file'},saveAs:{file:'save-as-name'}};
export function validateFilePresentation(state){
  if(!state||state.format!=='fullmeta-file-presentation/1'||!state.dialog||typeof state.dialog.open!=='boolean')throw new Error('Unsupported file dialog presentation.');
  if(state.dialog.open){
    if(!['new','saveAs'].includes(state.dialog.kind)||!state.dialog.fields||Object.values(state.dialog.fields).some(value=>typeof value!=='string'))throw new Error('Invalid file dialog raw fields.');
    const allowed=state.dialog.kind==='new'?['id','choice','folder','file']:['folder','file'];
    if(Object.keys(state.dialog.fields).some(key=>!allowed.includes(key)))throw new Error('Unknown file dialog field.');
    if(allowed.some(key=>typeof state.dialog.fields[key]!=='string')||typeof state.dialog.error!=='string')throw new Error('Incomplete file dialog draft.');
    if(typeof state.dialog.fromSchema!=='boolean'||typeof state.dialog.fileUserEdited!=='boolean')throw new Error('Invalid file dialog draft state.');
    const focus=state.dialog.focus;
    if(focus!==undefined&&focus!==null&&(!knownFields[state.dialog.kind].includes(focus.field)||!Number.isSafeInteger(focus.start)||!Number.isSafeInteger(focus.end)||focus.start<0||focus.end<focus.start||!['none','forward','backward'].includes(focus.direction)))throw new Error('Invalid file dialog input focus.');
  }
  validateWorkspacePickerState(state.picker);
  if(state.picker.open&&state.picker.purpose==='new-folder'&&(!state.dialog.open||state.dialog.kind!=='new'||state.picker.ownerKey!=='new-model-dialog'))throw new Error('Restore the owning New dialog before its folder picker.');
  if(state.picker.open&&['open','schema-for-new'].includes(state.picker.purpose)&&(state.dialog.open||state.picker.ownerKey!==null))throw new Error('A document file picker cannot belong to another file dialog.');
  return state;
}

export function createDocumentFileController(context){
  const dialog=context.$('#workspace-file-dialog'),host=context.$('#workspace-file-dialog-host');
  const picker=createWorkspaceFilePicker({dialog,container:host,requestJson:(...args)=>context.requestJson(...args),defaultFolder:()=>context.loadedModelFolder||'.'});
  const lastFocus={new:null,saveAs:null},document=dialog.ownerDocument;
  const captureFocus=(node,kind)=>{const field=Object.entries(fieldIds[kind]).find(([,id])=>node?.id===id)?.[0];return field?{field,start:node.selectionStart??0,end:node.selectionEnd??0,direction:node.selectionDirection||'none'}:null;};
  const focusOut=event=>{for(const kind of ['new','saveAs']){const focus=captureFocus(event.target,kind);if(focus)lastFocus[kind]=focus;}};
  context.container.addEventListener('focusout',focusOut);
  const assertIdle=()=>{if(context.operationProgress.isBusy()||context.modelLoading||context.modelSaving||context.newModelCreating)throw new Error('Finish the current editor operation before choosing files.');};
  const requiredDialog=kind=>{if(!['new','saveAs'].includes(kind))throw new Error('Choose the New or Save As file dialog.');const element=context.$(kind==='new'?'#new-model-dialog':'#save-as-dialog');if(!element?.open)throw new Error('Open the requested file dialog first.');return element;};
  const openModelPicker=async({folder}={})=>{assertIdle();return picker.open({purpose:'open',folder:folder??context.loadedModelFolder??'.',extensions:['.json'],title:'Open workspace JSON',onAccept:selected=>context.openModel(selected.folder,selected.file)});};
  const inspect=()=>{
    const kind=context.$('#new-model-dialog').open?'new':context.$('#save-as-dialog').open?'saveAs':null;if(!kind)return {open:false};
    const fields=Object.fromEntries(Object.entries(fieldIds[kind]).map(([key,id])=>[key,context.$('#'+id).value]));if(kind==='saveAs')fields.folder=context.loadedModelFolder||'.';
    const error=context.$(kind==='new'?'#new-model-status':'#save-as-status');
    return {kind,open:true,fields,choices:kind==='new'?[...context.$('#new-model-choice').options].map(option=>({id:option.value,label:option.textContent})):[],visibleFields:knownFields[kind].filter(key=>{const node=context.$('#'+fieldIds[kind][key]);return !node.hidden&&!node.parentElement.hidden;}),readonlyFields:kind==='saveAs'?['folder']:[],busy:Boolean(context.modelSaving||context.newModelCreating),error:error.hidden?'':error.textContent,fromSchema:Boolean(context.schemaProjectCreation),fileUserEdited:context.$('#new-model-file').dataset.userEdited==='true',focus:captureFocus(document.activeElement,kind)||lastFocus[kind]};
  };
  const update=({kind,fields}={})=>{
    assertIdle();requiredDialog(kind);if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).some(key=>!knownFields[kind].includes(key))||Object.values(fields).some(value=>typeof value!=='string'))throw new Error('Use the file dialog’s editable raw fields.');
    for(const key of knownFields[kind])if(Object.hasOwn(fields,key)){
      const input=context.$('#'+fieldIds[kind][key]);if(input.hidden||input.parentElement.hidden||input.disabled)throw new Error('This file field is unavailable.');
    }
    if(kind==='new'&&Object.hasOwn(fields,'choice')&&![...context.$('#new-model-choice').options].some(option=>option.value===fields.choice))throw new Error('Choose an offered model profile.');
    for(const key of knownFields[kind])if(Object.hasOwn(fields,key)){
      const input=context.$('#'+fieldIds[kind][key]);input.value=fields[key];
      input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));
      if(kind==='new'&&key==='file')input.dataset.userEdited='true';
    }
    return inspect();
  };
  const browse=({kind}={})=>{
    assertIdle();const ownerDialog=requiredDialog(kind);if(kind==='saveAs')throw new Error('Save As keeps the current folder; document relocation is not supported.');
    const input=context.$('#new-model-folder');if(input.parentElement.hidden)throw new Error('This project creates its declared project folder automatically.');
    return picker.open({purpose:'new-folder',mode:'directory',folder:input.value||'.',extensions:['.json'],ownerDialog,opener:context.$('#new-model-folder-browse'),onAccept:selected=>update({kind:'new',fields:{folder:selected.folder}})});
  };
  const submit=async({kind}={})=>{
    assertIdle();requiredDialog(kind);if(picker.inspect().open)throw new Error('Finish the active workspace selection first.');
    const form=context.$(kind==='new'?'#new-model-form':'#save-as-form');if(!form.reportValidity())throw new Error('Correct the file dialog fields before continuing.');
    if(kind==='new')await context.createNewModel();else await context.saveProjectAs();
    const current=inspect();if(current.open&&current.kind===kind)throw new Error(current.error||'The document could not be saved or created.');
    return {submitted:true,kind,path:context.openedDocumentPath()};
  };
  const snapshot=()=>({format:'fullmeta-file-presentation/1',dialog:inspect(),picker:picker.snapshot()});
  const restore=async state=>{
    validateFilePresentation(state);picker.cancel();
    for(const id of ['#new-model-dialog','#save-as-dialog'])if(context.$(id).open)context.$(id).close();
    if(state.dialog.open){
      if(state.dialog.kind==='new')await context.openNewModelDialog({fromSchema:state.dialog.fromSchema,restorePresentation:true});else context.openSaveAsDialog({restorePresentation:true});
      const fields=state.dialog.fields;
      for(const [key,id]of Object.entries(fieldIds[state.dialog.kind]))if(Object.hasOwn(fields,key))context.$('#'+id).value=fields[key];
      context.$('#new-model-file').dataset.userEdited=state.dialog.fileUserEdited?'true':'';
      const error=context.$(state.dialog.kind==='new'?'#new-model-status':'#save-as-status');error.textContent=state.dialog.error||'';error.hidden=!state.dialog.error;
      if(state.dialog.focus){lastFocus[state.dialog.kind]=structuredClone(state.dialog.focus);const input=context.$('#'+fieldIds[state.dialog.kind][state.dialog.focus.field]);input.focus();if(typeof input.setSelectionRange==='function')input.setSelectionRange(state.dialog.focus.start,state.dialog.focus.end,state.dialog.focus.direction);}
    }
    if(state.picker.open){
      if(state.picker.purpose==='import')await picker.restore(state.picker);
      else if(state.picker.purpose==='new-folder'){
        if(!state.dialog.open||state.dialog.kind!=='new')throw new Error('Restore the owning New dialog before its folder picker.');
        await picker.restore(state.picker,{ownerDialog:context.$('#new-model-dialog'),opener:context.$('#new-model-folder-browse'),onAccept:selected=>update({kind:'new',fields:{folder:selected.folder}})});
      }else if(state.picker.purpose==='open')await picker.restore(state.picker,{onAccept:selected=>context.openModel(selected.folder,selected.file)});
      else if(state.picker.purpose==='schema-for-new')await picker.restore(state.picker,{title:'Choose model schema',onAccept:acceptSchema});
    }
    return snapshot();
  };
  const acceptSchema=async selected=>{
    const schema=JSON.parse(selected.text);context.activateApplicationPackage(await context.loadApplicationPackage(schema.properties?.application?.const,{schemaUrl:new URL(selected.path,location.origin+'/')}));await context.verifyServerCompatibility();
    // Close this picker before opening the normal New form.
    picker.cancel();await context.openNewModelDialog();
  };
  const selectSchema=()=>picker.open({purpose:'schema-for-new',folder:context.loadedModelFolder||'.',extensions:['.json'],title:'Choose model schema',onAccept:acceptSchema});
  const api={picker,openModelPicker,selectSchema,inspect,update,browse,submit,snapshot,restore,validate:validateFilePresentation,dispose(){context.container.removeEventListener('focusout',focusOut);picker.dispose();controllers.delete(context);}};
  controllers.set(context,api);context.resources?.add(api);return api;
}
export function documentFileController(context){return controllers.get(context)||createDocumentFileController(context);}
