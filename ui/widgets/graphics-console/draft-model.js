const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);

function sameValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((item, index) => sameValue(item, right[index]));
  }
  if (!isObject(left) || !isObject(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

/** Apply only changes made by the designer to the latest source declaration. */
export function mergeGraphicsConsoleDraft(original, edited, source) {
  if (sameValue(original, edited)) return clone(source);
  if (isObject(original) && isObject(edited) && isObject(source)) {
    const result = clone(source);
    for (const key of new Set([...Object.keys(original), ...Object.keys(edited)])) {
      if (!Object.hasOwn(edited, key)) delete result[key];
      else if (!Object.hasOwn(original, key)) result[key] = clone(edited[key]);
      else if (!sameValue(original[key], edited[key])) {
        result[key] = mergeGraphicsConsoleDraft(original[key], edited[key], source[key]);
      }
    }
    return result;
  }
  if (Array.isArray(original) && Array.isArray(edited) && Array.isArray(source)
    && original.length === edited.length && edited.length === source.length) {
    return edited.map((item, index) => mergeGraphicsConsoleDraft(original[index], item, source[index]));
  }
  return clone(edited);
}


export const mergeGraphicsInterfacesDraft = mergeGraphicsConsoleDraft;
