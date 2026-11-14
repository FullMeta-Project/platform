/** One provider callback for local field drafts and advertised host/application actions. */
import {serializableEditorValue} from '../../js/debug/controller.js';
const fieldCommands=new Set(['field.change','field.optional','widget.action']);
/** Preserve the same widget action data for visible controls and host commands. */
export function widgetActionRecord(command) {
  const args=command.args||{};
  const identityToken=args.identityToken;
  return {dataset:{schemaWidgetPath:JSON.stringify(command.path||[]),schemaWidgetRow:String(args.row??''),...(args.rowIdentityToken!==undefined?{schemaWidgetRowIdentityToken:args.rowIdentityToken}:{}),schemaWidgetValue:identityToken??String(args.value??''),...(identityToken!==undefined?{schemaWidgetIdentityToken:identityToken}:{}),schemaWidgetKey:args.key??'',rowMove:args.direction??'',...(args.kind==='change'?{schemaWidgetChange:command.action}:{schemaWidgetAction:command.action})},value:identityToken??String(args.value??''),checked:args.checked===true};
}
export function createWidgetCommandDispatcher({fieldCommand,getSession}) {
  return function onCommand(command,event) {
    if(command&&fieldCommands.has(command.type)&&command.expectedRevision===undefined)return fieldCommand(command,event);
    const value=serializableEditorValue(command);
    if(typeof value.type!=='string')throw new Error('A widget command needs its normal host command type.');
    const session=getSession();if(!session)throw new Error('The host command session is not ready.');
    const {type,expectedRevision,args,...fields}=value;
    return session.dispatch(type,fieldCommands.has(type)?fields:args??fields,{expectedRevision}).then(answer=>answer.result);
  };
}
