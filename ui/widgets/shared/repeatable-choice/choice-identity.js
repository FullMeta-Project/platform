/** Stable token for preserving JSON identity types in a native select value. */
export function choiceIdentityToken(value) {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}

export function sameChoiceIdentity(left, right) {
  return Object.is(left, right);
}

export function choiceFromIdentityToken(records, property, token) {
  return records.find(record => choiceIdentityToken(record?.[property]) === token);
}
