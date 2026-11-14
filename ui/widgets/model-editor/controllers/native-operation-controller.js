/** Normal native-operation workflow shared by UI actions, widgets and WebMCP. */
import {resolveNativeOperation,nativeOperationActionContract,assertNativeOperationValue} from '../../../../js/services.js';
import {createNativeProgressProjection} from './native-progress.js';
const clone=value=>structuredClone(value);
const sameIdentity=(left,right)=>left?.id===right.id&&left?.version===right.version&&left?.digest===right.digest;
export function nativeOperationActions(context){
  const availability=context.applicationCommands.inspect();
  return (context.activeApplicationPackage?.actionBindings||[]).filter(binding=>binding.execution?.workflow?.kind==='nativeOperation').map(binding=>{
    return {...availability.find(action=>action.id===binding.id),id:binding.id,label:binding.label||binding.id,execution:binding.execution,apiContract:nativeOperationActionContract(binding,context.activeApplicationPackage.editorApiContracts).apiContract};
  });
}
export async function consumeOperationEvents(binding,descriptor,events,onEvent=()=>{}){
  let terminal=null,last=null;
  for await(const raw of events){
    if(terminal!==null)throw new Error('The native operation emitted an event after its terminal event.');
    const event=assertNativeOperationValue(binding,'event',raw),kind=event[descriptor.terminal.discriminator];
    if(descriptor.terminal.success.includes(kind))terminal=true;
    else if(descriptor.terminal.failure.includes(kind))terminal=false;
    last=event;await onEvent(event);
  }
  if(terminal===null)throw new Error('The native stream ended without its required terminal event.');
  if(!terminal){const error=new Error(last.message||'The native operation did not complete.');Object.assign(error,{diagnostics:last.diagnostics||[],cancelled:last.type==='cancelled',event:last});throw error;}
  return last;
}
async function* responseEvents(response){
  if(!response.body)throw new Error('The native operation returned no event stream.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
  try {while(true){const {done,value}=await reader.read();pending+=done?decoder.decode():decoder.decode(value,{stream:true});if(pending.length>4*1024*1024)throw new Error('A native operation event exceeds the 4 MiB limit.');let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line.trim())yield JSON.parse(line);}if(done)break;}if(pending.trim())yield JSON.parse(pending);}
  finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function declaredRequest(execution,api,values){
  const workflow=execution.workflow||{},headers={};
  const allowed=new Set((api.externalProgram?.requestEnvironment||[]).filter(binding=>binding.source==='header').map(binding=>binding.header));
  for(const [name,binding]of Object.entries(workflow.requestHeaders||{})){
    if(!/^[a-z][a-z0-9-]*$/.test(name)||!allowed.has(name)||!binding||!Object.hasOwn(execution.inputs||{},binding.input)||!['text','percent'].includes(binding.encoding||'text'))throw new Error('Native request headers must bind declared inputs to the API request environment.');
    const value=values[binding.input];if(typeof value!=='string'||!value||/[\r\n\0]/.test(value))throw new Error(`The native request header ${name} needs a nonempty text input.`);
    headers[name]=binding.encoding==='percent'?encodeURIComponent(value):value;
  }
  if(workflow.input!==undefined&&!Object.hasOwn(execution.inputs||{},workflow.input))throw new Error('The native request body must select a declared input.');
  return {input:workflow.input===undefined?values:values[workflow.input],headers};
}
export async function runNativeOperation(context,execution,readInputs,invocation={}){
  const {apiName,apiContract:api}=nativeOperationActionContract({execution},context.activeApplicationPackage?.editorApiContracts);
  const {identity,descriptor}=resolveNativeOperation(api.operationContract);
  const projectProgress=createNativeProgressProjection(execution.workflow?.progress,`Running ${identity.id}…`);
  if(invocation.operationContract&&!sameIdentity(invocation.operationContract,identity))throw new Error('Rediscover the changed native operation binding before execution.');
  if(context.operationProgress.isBusy()||context.modelSaving||context.modelLoading||context.modelValidating)throw new Error('Finish the active editor operation first.');
  context.commitVisibleEditorState();
  if(context.settingsDraftDirty||context.jsonDraftDirty)throw new Error('Apply or discard the current draft before native execution.');
  const errors=context.validateFullMetaModelWithRules(context.model);if(errors.length)throw new Error(errors[0]);
  const request=declaredRequest(execution,api,readInputs());
  let input=assertNativeOperationValue(identity,'input',invocation.input===undefined?request.input:invocation.input);
  const inputModel=identity.id==='fem.studyRun'?input:input.model;
  if(context.stableJsonString(inputModel)!==context.stableJsonString(context.model))throw new Error('The operation input must use the current visible document model. Apply model edits and rediscover its revision first.');
  if(descriptor.effects?.createsArtifacts&&context.hasUnsavedEditorChanges())await context.saveModel();
  if(context.stableJsonString(inputModel)!==context.stableJsonString(context.model)||descriptor.effects?.createsArtifacts&&context.hasUnsavedEditorChanges())throw new Error('The visible document changed before native execution. Save its latest data and retry.');
  if(context.stableJsonString(request.headers)!==context.stableJsonString(declaredRequest(execution,api,readInputs()).headers))throw new Error('The selected native request context changed before execution. Retry with the current selection.');
  input=clone(input);const id=context.createOperationId(),kind=identity.id;
  const label=context.activeApplicationPackage?.actionBindings?.find(binding=>binding.execution===execution)?.label||kind;
  context.startOperationKind(kind,id);
  context.beginOperationProgress({id,kind,label,message:`Running ${label}…`,cancellable:descriptor.protocol==='ndjson-stdio'});
  context.lastNativeOperation={action:execution.operation,identity,operationId:id,state:'running',diagnostics:[]};
  const headers={...request.headers,'content-type':'application/json','x-fullmeta-operation-id':id,'x-fullmeta-operation-contract-digest':identity.digest};
  const options={method:'POST',headers,body:JSON.stringify(input)},url=context.declaredActionEndpoint(apiName);
  let result,progressView;
  try {
    if(descriptor.protocol==='json-stdio'){
      result=assertNativeOperationValue(identity,'result',await context.requestJson(url,options));
      if(context.editorDebug?.serviceMode!=='fixture'&&!sameIdentity(result.operationContract,identity))throw new Error('The native server did not confirm the expected operation contract identity.');
    }
    else {
      const fixture=await context.editorDebug?.request(url,options);
      let events;
      if(fixture?.handled){if(!Array.isArray(fixture.value?.events))throw new Error('A native-stream fixture needs an explicit events array.');events=fixture.value.events;}
      else {if(context.serverCompatibility!=='compatible')throw new Error('Confirm the native server compatibility before execution.');const response=await fetch(url,context.applicationRequestOptions(options));if(!response.ok){const body=await response.json();const error=new Error(body.error||`Native operation failed (${response.status}).`);Object.assign(error,{diagnostics:body.diagnostics||[]});throw error;}events=responseEvents(response);}
      result=await consumeOperationEvents(identity,descriptor,events,event=>{if(context.editorDebug?.serviceMode!=='fixture'&&!sameIdentity(event.operationContract,identity))throw new Error('The native stream contract identity is missing or incompatible.');progressView=projectProgress(event);context.updateOperationProgress(id,progressView);context.lastNativeOperation={...context.lastNativeOperation,event,diagnostics:event.diagnostics||[]};});
    }
    context.lastNativeOperation={...context.lastNativeOperation,state:'success',result};
    const message=execution.workflow?.progress?.message&&progressView?.message||`${label} completed.`;
    // Stream receipts can contain hundreds of artifact paths. Inspection keeps
    // the full receipt; the ordinary Settings pane keeps its usable height.
    context.$('#resolved-values').textContent=descriptor.protocol==='ndjson-stdio'?message:JSON.stringify(result,null,2);
    context.finishOperationProgress(id,{state:'success',message});context.setStatus(message,'good');return result;
  }catch(error){context.lastNativeOperation={...context.lastNativeOperation,state:error.cancelled?'cancelled':'error',message:error.message,diagnostics:error.diagnostics||[]};context.$('#resolved-values').textContent=error.message;context.finishOperationProgress(id,{state:error.cancelled?'cancelled':'error',message:error.message});context.setStatus(error.message,'error');throw error;}
  finally {context.finishOperationKind(kind,id);context.syncModelActionAvailability();}
}
