/** Resolve declared actions identically for UI clicks and public semantic commands. */
export function createApplicationCommandDispatcher({bindings,actions,control}) {
  function inspect() {
    return (bindings()||[]).map(binding=>{
      const element=control(binding.selector),available=typeof actions()?.[binding.id]==='function'&&Boolean(element)&&!element.disabled&&!element.closest('[hidden],.hidden');
      return {id:binding.id,label:binding.label||binding.id,available,reason:available?'':element?.title||'This action is unavailable in the current view.'};
    });
  }
  async function dispatch(id,invocation) {
    const binding=(bindings()||[]).find(entry=>entry.id===id);
    if(!binding)throw new Error('Choose an application-declared action.');
    const availability=inspect().find(entry=>entry.id===id);
    if(!availability.available)throw new Error(availability.reason);
    return await actions()[id](invocation);
  }
  return Object.freeze({inspect,dispatch});
}
