import { createValidationRuleRecipeTable, validationRuleFromRecipe } from "../validation-program/widget.js";
export { validationRuleFromRecipe, validationRuleRecipeFromRule } from "../validation-program/widget.js";

const clone = value => structuredClone(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Applies only edited recipe roots; unsupported root rules and program metadata survive. */
export function schemaWithValidationRuleRecipes(schema, programKey, edits) {
  if (!record(schema) || !Array.isArray(edits) || !edits.length)
    throw new Error('Add or edit at least one rule recipe.');
  const candidate = clone(schema);
  const current = candidate[programKey];
  if (current !== undefined && (!record(current) || !Array.isArray(current.rules)))
    throw new Error(`${programKey} is not a validation program.`);
  const program = current || { version: 1, maximumErrors: 80, rules: [] };
  const originalLength = program.rules.length;
  const touched = new Set();
  for (const edit of edits) {
    if (edit.index === null) {
      if (edit.remove) continue;
      program.rules.push(validationRuleFromRecipe(edit.facts));
      continue;
    }
    if (!Number.isInteger(edit.index) || edit.index < 0 || edit.index >= originalLength
      || touched.has(edit.index)) throw new Error('A recipe no longer identifies one existing rule.');
    touched.add(edit.index);
    if (edit.remove) program.rules[edit.index] = null;
    else program.rules[edit.index] = validationRuleFromRecipe(edit.facts, program.rules[edit.index]);
  }
  program.rules = program.rules.filter(rule => rule !== null);
  candidate[programKey] = program;
  return candidate;
}


export function createValidationRuleRecipeDialog(options) {
  return createValidationRuleRecipeTable({ ...options, buildCandidate: schemaWithValidationRuleRecipes });
}
