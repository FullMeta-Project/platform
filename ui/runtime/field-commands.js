import {schemaWidgetOptions} from '../widgets/shared/schema-widget.js';

/** A repeatable-choice collection explicitly identifies its generated row key. */
export function isGeneratedIdentityPath(path,{schemaAt,resolve=value=>value}={}) {
  if(!Array.isArray(path)||path.length<2||!Number.isInteger(path.at(-2)))return false;
  const collection=resolve(schemaAt(path.slice(0,-2)))||{},ui=schemaWidgetOptions(collection);
  return ui.widget==='repeatableChoiceTable'&&typeof ui.generatedIdProperty==='string'&&path.at(-1)===ui.generatedIdProperty;
}

/** Apply optional presence and its declared companion changes to one isolated draft. */
export function draftWithOptionalField(draft, {path,present,createWithProperties=[],clearWithProperties}, {defaultAtPath}={}) {
  if(!Array.isArray(path)||!path.length||path.some(key=>typeof key!=='string'&&(!Number.isInteger(key)||key<0)))throw new Error('Choose a stable optional field path.');
  if(typeof present!=='boolean')throw new Error('Specify whether the optional field is present.');
  const result=structuredClone(draft),parentPath=path.slice(0,-1),parent=parentPath.reduce((value,key)=>value?.[key],result);
  if(!parent||typeof parent!=='object')throw new Error('The optional field parent is unavailable.');
  if(present){if(!Object.hasOwn(parent,path.at(-1)))parent[path.at(-1)]=defaultAtPath(path);for(const sibling of createWithProperties){if(Object.hasOwn(parent,sibling))continue;const value=defaultAtPath([...parentPath,sibling]);if(value!==null)parent[sibling]=value;}}
  else {delete parent[path.at(-1)];for(const sibling of clearWithProperties??createWithProperties)delete parent[sibling];}
  return result;
}

/** Parsing shared by a field's visible control and its public command. No DOM dependency. */
export function parseFieldDraft(raw, type, {optional=false,nonnegativeInteger=false}={}) {
  const text=typeof raw==='string'?raw:String(raw??'');
  if(optional&&text.trim()===''&&['number','string','optional-boolean'].includes(type))return {remove:true};
  let value;
  if(type==='boolean')value=raw===true;
  else if(type==='null'){if(raw!==null)throw new Error('Choose the null value.');value=null;}
  else if(type==='array'){if(!Array.isArray(raw))throw new Error('Choose a JSON array value.');value=structuredClone(raw);}
  else if(type==='object'){if(raw===null||typeof raw!=='object'||Array.isArray(raw))throw new Error('Choose a JSON object value.');value=structuredClone(raw);}
  else if(type==='optional-boolean'){if(!['true','false',''].includes(text))throw new Error('Choose yes, no or unspecified.');if(text==='')return {remove:true};value=text==='true';}
  else if(type==='number'){
    if(!text.trim()||!Number.isFinite(Number(text)))throw new Error('Enter a finite number.');
    value=Number(text);if(nonnegativeInteger&&(!Number.isInteger(value)||value<0))throw new Error('Enter a nonnegative whole number.');
  }else if(['json-value','json-array'].includes(type)){try{value=JSON.parse(text);}catch{throw new Error('Enter a valid JSON value.');}if(type==='json-array'&&!Array.isArray(value))throw new Error('Enter a JSON array.');}
  else if(type==='array-number'||type==='array-string'){
    const entries=Array.isArray(raw)?raw:text.split(',').map(value=>value.trim()).filter(Boolean);value=type==='array-number'?entries.map(Number):entries;
    if(type==='array-number'&&value.some(value=>!Number.isFinite(value)))throw new Error('Enter only finite numbers.');
  }else if(type==='array-string-select'){if(!Array.isArray(raw))throw new Error('Choose a list of values.');value=raw.map(String);}
  else value=text;
  return {value,remove:false};
}
export function draftWithFieldChange(draft,{path,valueType,rawValue,value,optional=false,nonnegativeInteger=false},{defaultAtPath}={}){
  if(!Array.isArray(path)||path.some(key=>typeof key!=='string'&&(!Number.isInteger(key)||key<0)))throw new Error('Choose a stable field path.');
  const parsed=parseFieldDraft(rawValue===undefined?value:rawValue,valueType,{optional,nonnegativeInteger});
  if(!path.length){if(parsed.remove)throw new Error('The selected root value cannot be omitted.');return parsed.value;}
  const result=structuredClone(draft);let owner=result;
  for(let index=0;index<path.length-1;index++){
    const key=path[index];if(owner===null||typeof owner!=='object')throw new Error('The field parent is not a group.');
    if(!Object.hasOwn(owner,key)){
      const initial=defaultAtPath?.(path.slice(0,index+1));
      const group=initial!==null&&typeof initial==='object'?structuredClone(initial):typeof path[index+1]==='number'?[]:{};
      Object.defineProperty(owner,key,{value:group,writable:true,configurable:true,enumerable:true});
    }
    owner=owner[key];
  }
  if(owner===null||typeof owner!=='object')throw new Error('The field parent is not a group.');
  if(parsed.remove)delete owner[path.at(-1)];else Object.defineProperty(owner,path.at(-1),{value:parsed.value,writable:true,configurable:true,enumerable:true});
  return result;
}
/** Availability is checked independently of DOM controls, including read-only ancestors. */
export function assertFieldWritable({document,path,schemaAt,resolve=value=>value,generatedOwnerAt,kind}){
  if(!Array.isArray(path))throw new Error('Choose a stable document field path.');
  if(kind==='schemaDocument'&&generatedOwnerAt?.(document,path))throw new Error('This generated field belongs to guided authoring. Edit its owning choice.');
  for(let length=0;length<=path.length;length++){const schema=resolve(schemaAt(path.slice(0,length)));if(schema===false||schema?.readOnly===true||schemaWidgetOptions(schema).readOnly===true)throw new Error('This field is read-only in the active schema.');}
  if(kind!=='schemaDocument'&&isGeneratedIdentityPath(path,{schemaAt,resolve}))throw new Error('Generated item IDs are read-only.');
}
