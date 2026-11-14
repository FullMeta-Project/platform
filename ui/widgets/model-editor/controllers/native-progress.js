/** Project declared JSON pointers from cumulative native events into the strip. */
function pointerReader(pointer){
  if(typeof pointer!=='string'||!pointer.startsWith('/')||/~(?![01])/u.test(pointer))throw new Error('Native progress mappings require JSON Pointers.');
  const keys=pointer.slice(1).split('/').map(key=>key.replace(/~1/g,'/').replace(/~0/g,'~'));
  return event=>keys.reduce((value,key)=>value!==null&&typeof value==='object'&&Object.hasOwn(value,key)?value[key]:undefined,event);
}

export function createNativeProgressProjection(mapping={},fallback='Running native operation…'){
  if(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||Object.keys(mapping).some(key=>!['message','completed','total','details'].includes(key)))throw new Error('The native progress mapping is invalid.');
  const readers=Object.fromEntries(['message','completed','total'].filter(key=>mapping[key]!==undefined).map(key=>[key,pointerReader(mapping[key])]));
  if(mapping.details!==undefined&&!Array.isArray(mapping.details))throw new Error('Native progress details must be an array.');
  const details=(mapping.details||[]).map(field=>{
    if(!field||typeof field!=='object'||Object.keys(field).some(key=>!['pointer','label','unit'].includes(key))||typeof field.label!=='string'||!field.label.trim()||field.unit!==undefined&&typeof field.unit!=='string')throw new Error('A native progress detail needs a label and JSON Pointer.');
    return {...field,read:pointerReader(field.pointer),value:undefined};
  });
  const state={message:fallback,completed:null,total:null};
  return event=>{
    for(const [key,read]of Object.entries(readers)){
      const value=read(event);if(value===undefined)continue;
      if(key==='message'){
        if(typeof value!=='string')throw new Error('A mapped native progress message must be text.');
        if(value)state.message=value;
      }else{
        if(value!==null&&(!Number.isSafeInteger(value)||value<0))throw new Error('Mapped native progress counts must be nonnegative safe integers or null.');
        state[key]=value;
      }
    }
    if(state.total!==null&&state.completed!==null&&state.completed>state.total)throw new Error('The mapped completed count exceeds its total.');
    for(const detail of details){
      const value=detail.read(event);if(value===undefined)continue;
      if(value!==null&&!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))throw new Error('A mapped native progress detail must be a finite scalar.');
      detail.value=value;
    }
    const text=details.filter(field=>field.value!==null&&field.value!==undefined&&field.value!=='').map(field=>`${field.label}: ${field.value}${field.unit?' '+field.unit:''}`).join(' · ');
    return {...state,progress:state.total>0&&state.completed!==null?state.completed/state.total*100:null,detail:text,detailTitle:text};
  };
}
