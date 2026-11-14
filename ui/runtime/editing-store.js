// @ts-check
/** Public JSON state and commands. React, network clients and native handles stay outside it. */
import { serializableEditorValue } from '../../js/editor-debug.js';

/** @param {{initial: any, reduce: (state:any, command:any)=>any, validate?: (state:any)=>void}} options */
export function createEditingStore({initial, reduce, validate = () => {}}) {
  const freeze = value => {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  let state = freeze(serializableEditorValue(initial)), revision = 0, disposed = false;
  const listeners = new Set();
  const read = () => state;
  function publish() { for (const listener of listeners) listener(state, revision); }
  /** A batch is reduced and validated completely before one publication. */
  function dispatch(command) {
    if (disposed) throw new Error('The editing session is disposed.');
    if (command.expectedRevision !== undefined && command.expectedRevision !== revision)
      throw new Error(`Editing revision conflict: expected ${command.expectedRevision}, current ${revision}.`);
    const commands = command.type === 'batch' ? command.commands : [command];
    if (!Array.isArray(commands) || !commands.length) throw new Error('Choose at least one editing command.');
    let candidate = structuredClone(state);
    for (const entry of commands) candidate = reduce(candidate, serializableEditorValue(entry));
    candidate = serializableEditorValue(candidate); validate(candidate);
    state = freeze(candidate); revision++; publish();
    return {revision, state: serializableEditorValue(state)};
  }
  return Object.freeze({read, get revision(){return revision;}, snapshot:()=>({revision,state:serializableEditorValue(state)}), dispatch,
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    select(selector, listener, equal = Object.is){let previous=selector(state);return this.subscribe(next=>{const value=selector(next);if(!equal(previous,value)){previous=value;listener(value);}});},
    dispose(){disposed=true;listeners.clear();}});
}

/** Versioned adapter for an existing canonical host. It does not retain a second document. */
export function createHostCommandSession({read, commands, inspect = read, versionOf, now = () => performance.now(), interruptCommands = []}) {
  if(!Array.isArray(interruptCommands)||interruptCommands.some(command=>typeof command!=='string'))throw new Error('Interrupt commands must be an explicit command-name array.');
  const interrupts=new Set(interruptCommands);
  let revision = 0, active = false, interrupting = false, activeCommand = null, disposed = false;
  let observedVersion=versionOf?JSON.stringify(versionOf()):null;
  const listeners = new Set();
  const publish = () => {for(const listener of listeners) listener({revision,active:active||interrupting,interrupting});};
  function observe(){if(!versionOf||active||interrupting)return;const next=JSON.stringify(versionOf());if(next!==observedVersion){observedVersion=next;revision++;publish();}}
  async function dispatch(type, args = {}, options = {}) {
    if(disposed)throw new Error('The editing session is disposed.');
    if(interrupting)throw new Error('An interrupt command is already running.');
    const interrupt=active&&interrupts.has(type)&&!interrupts.has(activeCommand);
    if(active&&!interrupt)throw new Error('An editing command is already running.');
    observe();
    if(options.expectedRevision!==undefined&&options.expectedRevision!==revision)
      throw new Error(`Editing revision conflict: expected ${options.expectedRevision}, current ${revision}.`);
    if(!Object.hasOwn(commands,type)||typeof commands[type]!=='function')throw new Error(`Unknown editing command: ${type}.`);
    const input=serializableEditorValue(args),started=now();let committed=false;if(interrupt)interrupting=true;else{active=true;activeCommand=type;}publish();
    try {const result=await commands[type](input);revision++;committed=true;return {revision,result:result===undefined?null:serializableEditorValue(result),commandMs:now()-started};}
    finally {if(versionOf){const next=JSON.stringify(versionOf());if(!committed&&next!==observedVersion)revision++;observedVersion=next;}if(interrupt)interrupting=false;else{active=false;activeCommand=null;}publish();}
  }
  return Object.freeze({dispatch, snapshot:()=>{observe();return {format:'fullmeta-host-session/1',revision,state:serializableEditorValue(read())};},
    inspect:()=>serializableEditorValue(inspect()),get revision(){observe();return revision;},get active(){return active||interrupting;},get interrupting(){return interrupting;},
    commands:()=>Object.keys(commands),subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    changed(){if(versionOf)observe();else {revision++;publish();}},dispose(){disposed=true;listeners.clear();}});
}
