/** Exactly-once ownership of synchronous resources, including partial mount failures. */
export function createResourceScope() {
  const cleanups=[];let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;const failures=[];for(const release of cleanups.reverse())try{release();}catch(error){failures.push(error);}cleanups.length=0;if(failures.length)throw new AggregateError(failures,'Some editor resources could not be released.');};
  return Object.freeze({add(resource){const release=typeof resource==='function'?resource:()=>resource?.dispose?.();if(disposed)release();else cleanups.push(release);return resource;},dispose,get disposed(){return disposed;}});
}
