/** Transport checks for an inline field-UI draft; incomplete text remains editable data. */
import {validateStructuredValueDraftShape} from '../shared/structured-value-editor.js';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const path=value=>Array.isArray(value)&&value.every(key=>typeof key==='string'||Number.isSafeInteger(key)&&key>=0);
const requireState=(valid,message)=>{if(!valid)throw new Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rawContainers(value){if(!value||typeof value!=='object')return;
  if(Object.hasOwn(value,'rows'))requireState(Array.isArray(value.rows),'Inline widget rows must be an array.');
  if(Object.hasOwn(value,'controls'))requireState(record(value.controls),'Inline widget controls must be a draft map.');
  if(value.format==='fullmeta-structured-widget-state/1')validateStructuredValueDraftShape(value.draft);
  if(Object.hasOwn(value,'structured'))validateStructuredValueDraftShape(value.structured);
  for(const [key,child] of Object.entries(value))if(!['current','original','source','schema'].includes(key)&&child&&typeof child==='object')rawContainers(child);
}
function plainDraft(value,ancestors=new Set()){if(value===undefined||value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
  requireState(typeof value==='object'&&[Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(value))&&!ancestors.has(value),'Inline UI drafts must contain finite, plain data.');ancestors.add(value);for(const child of Object.values(value))plainDraft(child,ancestors);ancestors.delete(value);}
function presentation(value){if(value==null)return;requireState(value.format==='fullmeta-ui-annotation-state/1'&&Array.isArray(value.groups)&&Array.isArray(value.extras),'Inline presentation draft structure is invalid.');
  for(const group of value.groups){requireState(record(group)&&Array.isArray(group.entries),'Inline presentation groups are invalid.');for(const annotation of group.entries){requireState(record(annotation)&&typeof annotation.key==='string'&&Array.isArray(annotation.fields),'Inline presentation entries are invalid.');for(const field of annotation.fields){requireState(record(field)&&typeof field.key==='string'&&typeof field.type==='string','Inline presentation fields are invalid.');if(field.type==='json'){requireState(record(field.draft)&&typeof field.draft.enabled==='boolean','Inline JSON presence draft is invalid.');validateStructuredValueDraftShape(field.draft.structured);}else if(['stringList','stringMap'].includes(field.type))requireState(Array.isArray(field.draft)&&field.draft.every(row=>record(row)&&Number.isSafeInteger(row.id)&&row.id>0&&typeof row.value==='string'&&(field.type!=='stringMap'||typeof row.key==='string')),'Inline presentation rows are invalid.');else if(field.type==='typedValue')requireState(record(field.draft)&&['text','number','boolean','null'].includes(field.draft.kind)&&typeof field.draft.value==='string','Inline typed presentation draft is invalid.');else requireState(typeof field.draft==='string','Inline presentation values must remain raw text.');}}}
  for(const extra of value.extras){requireState(record(extra)&&typeof extra.key==='string','Inline presentation extra fields are invalid.');validateStructuredValueDraftShape(extra.draft);}
}
export function validateInlineUiEditorState(value){plainDraft(value);requireState(value?.format==='fullmeta-inline-ui-state/1'&&record(value.target)&&record(value.sourceSchema),'Inline UI state needs its source declaration.');
  requireState((value.target.file===null||typeof value.target.file==='string')&&(value.target.path===null||path(value.target.path))&&typeof value.target.propertyName==='string','Inline UI target is invalid.');
  for(const key of ['title','jsonKey','selectedWidget'])requireState(typeof value[key]==='string',`Inline UI ${key} must remain raw text.`);
  requireState(typeof value.presentationOpen==='boolean'&&Array.isArray(value.addedKeys)&&value.addedKeys.every(key=>typeof key==='string')&&new Set(value.addedKeys).size===value.addedKeys.length,'Inline presentation selection is invalid.');
  requireState(record(value.reference)&&typeof value.reference.enabled==='boolean'&&['simple','advanced'].includes(value.reference.filterMode),'Inline reference draft is invalid.');for(const key of ['scope','targetPath','targetLabel','filterProperty','filterValue'])requireState(typeof value.reference[key]==='string','Inline reference values must remain raw text.');
  for(const key of ['widgetStates','widgetBaselines']){requireState(record(value[key]),'Inline widget drafts must be maps.');for(const state of Object.values(value[key]))requireState(record(state)||typeof state==='string','Inline widget state is invalid.');rawContainers(value[key]);}
  presentation(value.presentationState);presentation(value.presentationBaseline);return value;
}
export function validateInlineUiWorkspaceState(saved,{source,documentPath,selectionPath,pendingSettings}={}){requireState(record(saved)&&saved.key===JSON.stringify([documentPath,selectionPath])&&same(saved.source,source),'The inline UI draft belongs to another document or selection.');validateInlineUiEditorState(saved.state);
  const target=saved.state.target;requireState(path(target.path),'The inline UI source path is unavailable.');
  if(target.file===null||target.file===documentPath){const current=target.path.reduce((value,key)=>value?.[key],source),prefix=Array.isArray(selectionPath)&&selectionPath.every((key,index)=>target.path[index]===key),draft=prefix&&pendingSettings!==undefined?target.path.slice(selectionPath.length).reduce((value,key)=>value?.[key],pendingSettings):undefined;
    requireState(same(current,saved.state.sourceSchema)||draft!==undefined&&same(draft,saved.state.sourceSchema),'The inline UI declaration changed since its draft was opened.');}
  return saved;
}
