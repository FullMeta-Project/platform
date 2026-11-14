/** Serializable enum authoring state; DOM and React resources are not retained. */
export const jsonChoiceTypes=[['string','Text'],['number','Number'],['boolean','Boolean'],['null','Null'],['array','Array'],['object','Object']];
const typeOf=value=>value===null?'null':Array.isArray(value)?'array':typeof value;
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);

/** @param {Record<string, any>} options */
export function createJsonChoiceDraft({value,state,editLabels=false,choiceLabels}={}) {
  const labels=choiceLabels&&typeof choiceLabels==='object'&&!Array.isArray(choiceLabels)?choiceLabels:{};
  let data={present:value!==undefined,malformed:value!==undefined&&!Array.isArray(value),rows:Array.isArray(value)?value.map(item=>({type:typeOf(item),text:typeof item==='string'?item:JSON.stringify(item,null,2),...(editLabels?{label:labels[String(item)]??''}:{})})):[]};
  const initial=JSON.stringify(data),initialText=value===undefined?'':JSON.stringify(value,null,2),labelsText=choiceLabels===undefined?'':JSON.stringify(choiceLabels);
  if(state&&Array.isArray(state.rows))data={present:state.present===true,malformed:state.malformed===true,rows:state.rows.map(row=>({type:row.type,text:String(row.text??''),...(editLabels?{label:String(row.label??'')}:{})}))};
  let serial=data.rows.length,rowKeys=data.rows.map((_,index)=>`choice-${index}`);
  const snapshot=()=>structuredClone(data),unchanged=()=>JSON.stringify(data)===initial;
  const simple=()=>!data.rows.length||data.rows.every(row=>row.type===data.rows[0].type)&&['string','number','boolean'].includes(data.rows[0].type);
  function readRow(row,index){
    if(row.type==='string')return row.text;
    if(!jsonChoiceTypes.some(([type])=>type===row.type))throw new Error(`Allowed value ${index+1}: choose a JSON type.`);
    let parsed;try{parsed=JSON.parse(row.text);}catch{throw new Error(`Allowed value ${index+1}: enter a valid JSON ${row.type}.`);}
    if(typeOf(parsed)!==row.type||typeof parsed==='number'&&!Number.isFinite(parsed))throw new Error(`Allowed value ${index+1}: expected ${row.type}.`);
    return parsed;
  }
  function read(){
    if(!data.present)return undefined;
    if(data.malformed)throw new Error('The enum declaration must be an array. Repair it in JSON or add values here.');
    if(!data.rows.length)throw new Error('Add at least one allowed value, or turn off the local enum restriction.');
    const values=data.rows.map(readRow),seen=new Map();
    values.forEach((item,index)=>{const key=canonical(item);if(seen.has(key))throw new Error(`Allowed value ${index+1} duplicates value ${seen.get(key)+1}.`);seen.set(key,index);});return values;
  }
  function dispatch(command){
    const index=Number(command.row),row=data.rows[index];
    if(command.type==='presence')data.present=Boolean(command.present);
    else if(command.type==='add'){data.present=true;data.malformed=false;data.rows.push({type:simple()?data.rows[0]?.type||'string':'string',text:'',...(editLabels?{label:''}:{})});rowKeys.push(`choice-${serial++}`);}
    else if(!Number.isInteger(index)||!row)return false;
    else if(command.type==='text')row.text=String(command.text);
    else if(command.type==='label'&&editLabels)row.label=String(command.label);
    else if(command.type==='remove'){data.rows.splice(index,1);rowKeys.splice(index,1);}
    else if(command.type==='move'){
      const next=index+(command.direction==='up'?-1:command.direction==='down'?1:0);if(next===index||next<0||next>=data.rows.length)return false;
      [data.rows[index],data.rows[next]]=[data.rows[next],data.rows[index]];[rowKeys[index],rowKeys[next]]=[rowKeys[next],rowKeys[index]];
    }else if(command.type==='type'){
      let parsed;try{parsed=readRow(row,index);}catch{}
      row.type=command.value;
      if(row.type==='string')row.text=parsed===undefined?row.text:typeof parsed==='string'?parsed:JSON.stringify(parsed);
      else if(row.type==='null')row.text='null';
      else if(row.type==='boolean')row.text=typeof parsed==='boolean'?String(parsed):'false';
      else if(row.type==='object')row.text=typeOf(parsed)==='object'?JSON.stringify(parsed,null,2):'{}';
      else if(row.type==='array')row.text=Array.isArray(parsed)?JSON.stringify(parsed,null,2):'[]';
      else if(typeof parsed==='number')row.text=JSON.stringify(parsed);
    }else return false;
    return true;
  }
  return {snapshot,read,dispatch,simple,unchanged,view:()=>({...snapshot(),rowKeys:[...rowKeys]}),
    get value(){if(unchanged())return initialText;const result=read();return result===undefined?'':JSON.stringify(result,null,2);},
    get choiceLabelsValue(){
      if(!editLabels||unchanged()||!data.present)return labelsText;
      const values=read(),next={...labels};if(Array.isArray(value))for(const old of value)delete next[String(old)];
      values.forEach((item,index)=>{if(data.rows[index].label.trim())Object.defineProperty(next,String(item),{value:data.rows[index].label.trim(),enumerable:true,configurable:true,writable:true});});
      return Object.keys(next).length?JSON.stringify(next):'';
    }};
}
