/** FullMeta validation program keys are distinct from objects that merely contain a `rules` array. */
export function isFullMetaValidationProgramKey(key) {
  return key === 'x-fullmeta-rules' || (typeof key === 'string' && /^x-fullmeta-.+Validation$/.test(key));
}

export function isFullMetaValidationProgram(key, value) {
  return isFullMetaValidationProgramKey(key) && value !== null && typeof value === 'object'
    && !Array.isArray(value) && Array.isArray(value.rules);
}

export function fullMetaValidationProgramKeys(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return [];
  return Object.keys(document).filter(key => isFullMetaValidationProgram(key, document[key]));
}
