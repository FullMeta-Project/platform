import { sameValidationExpression } from "./expression-language.js";

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function validationEditDraftIssue({ jsonDraftDirty = false, settingsDraftDirty = false } = {}) {
  if (jsonDraftDirty) return "Apply the current JSON draft before editing a validation expression.";
  if (settingsDraftDirty) return "Apply the current item settings before editing a validation expression.";
  return null;
}

export function validationRulePointerParts(pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("#/") || pointer.length < 3) {
    throw new Error("The validation rule has no usable source pointer.");
  }
  return pointer.slice(2).split("/").map(part => {
    if (/~(?![01])/.test(part)) throw new Error("The validation rule pointer is invalid.");
    return part.replace(/~1/g, "/").replace(/~0/g, "~");
  });
}

function childAt(parent, part) {
  if (!parent || typeof parent !== "object") return undefined;
  if (Array.isArray(parent)) {
    if (!/^(0|[1-9][0-9]*)$/.test(part)) return undefined;
    const index = Number(part);
    return Number.isSafeInteger(index) && index < parent.length ? parent[index] : undefined;
  }
  return own(parent, part) ? parent[part] : undefined;
}

export function validationRuleAtPointer(document, pointer) {
  return validationRulePointerParts(pointer).reduce(childAt, document);
}

export function documentWithValidationAssertion(document, { pointer, original, assertion }) {
  const current = validationRuleAtPointer(document, pointer);
  if (!current || typeof current !== "object" || Array.isArray(current) || !own(current, "assert")) {
    throw new Error("The validation rule no longer exists. Reopen its dialog.");
  }
  return documentWithValidationEdits(document, [{ pointer: `${pointer}/assert`, original, value: assertion }]);
}

export function documentWithValidationEdits(document, edits, { preconditions = [] } = {}) {
  if (!Array.isArray(edits) || !edits.length) throw new Error("There are no validation edits to apply.");
  for (const expected of preconditions) {
    const current = validationRuleAtPointer(document, expected.pointer);
    if (current === undefined || !sameValidationExpression(current, expected.value)) {
      throw new Error("A validation rule or its context changed after the dialog opened. Reopen its dialog.");
    }
  }
  const seen = new Set();
  for (const edit of edits) {
    if (seen.has(edit.pointer)) throw new Error("The same validation field was edited twice.");
    seen.add(edit.pointer);
    const parts = validationRulePointerParts(edit.pointer);
    if (parts.length < 3 || !["assert", "if", "when", "forEach", "forEachTree", "children", "value"].includes(parts.at(-1))) {
      throw new Error("This validation field cannot be changed from the expression dialog.");
    }
    const current = validationRuleAtPointer(document, edit.pointer);
    if (current === undefined) throw new Error("The validation field no longer exists. Reopen its dialog.");
    if (!sameValidationExpression(current, edit.original)) {
      throw new Error("This validation field changed after the dialog opened. Reopen its dialog.");
    }
  }
  const candidate = structuredClone(document);
  for (const edit of edits) {
    const parts = validationRulePointerParts(edit.pointer);
    let parent = candidate;
    for (const part of parts.slice(0, -1)) parent = childAt(parent, part);
    parent[parts.at(-1)] = structuredClone(edit.value);
  }
  return candidate;
}
