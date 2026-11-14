// Server state belongs to a canonical opened file. Browser tabs retain local state.
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
const scope = isNode ? new (await import('node:async_hooks')).AsyncLocalStorage() : null;
const files = new Map();
const readers = new WeakMap();

export function currentDocumentFile() { return scope?.getStore()?.path || null; }
export function currentDocumentKey() { return scope?.getStore()?.key || null; }
export function currentDocumentLocks() { return scope?.getStore()?.locks || new Set(); }
export function runInDocumentFile(file, operation) {
  if (!scope) return operation();
  const locks = new Set(currentDocumentLocks());
  locks.add(file.key);
  return scope.run({ ...file, locks }, operation);
}

export function documentValue(name, initialize) {
  if (!scope) return initialize();
  function value() {
    const key = currentDocumentKey() || '';
    if (!files.has(key)) files.set(key, new Map());
    const values = files.get(key);
    if (!values.has(name)) values.set(name, initialize());
    return values.get(name);
  }
  const initial = initialize();
  const target = Array.isArray(initial) ? [] : initial instanceof Map ? new Map() : initial instanceof Set ? new Set() : {};
  const proxy = new Proxy(target, {
    get(_target, key) {
      const actual = value(), result = Reflect.get(actual, key, actual);
      return (actual instanceof Map || actual instanceof Set) && typeof result === 'function' ? result.bind(actual) : result;
    },
    set(_target, key, next) { return Reflect.set(value(), key, next); },
    deleteProperty(_target, key) { return Reflect.deleteProperty(value(), key); },
    has(_target, key) { return Reflect.has(value(), key); },
    ownKeys() { return Reflect.ownKeys(value()); },
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value(), key);
      return descriptor && { ...descriptor, configurable: key === 'length' && Array.isArray(target) ? false : true };
    },
    defineProperty(_target, key, descriptor) { return Reflect.defineProperty(value(), key, descriptor); },
  });
  readers.set(proxy, value);
  return proxy;
}

export function documentSnapshot(value) { return readers.get(value)?.() || value; }
