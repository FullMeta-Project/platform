import { createValidationProgramTableDialog, validationStatementFromDraft } from "../validation-program/widget.js";

const clone = value => structuredClone(value);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Builds a candidate from factored table rows; existing unknown keys remain intact. */
export function schemaWithValidationRuleDrafts(schema, programDrafts) {
  const candidate = clone(schema);
  for (const [key, program] of programDrafts) {
    const original = candidate[key];
    if (original === undefined && !program.roots.length && !program.authoredProgram?.declarative) continue;
    if (original !== undefined && (!isObject(original) || !Array.isArray(original.rules) && !Object.hasOwn(program.authoredProgram || {}, 'declarative')))
      throw new Error(`${key} is not a validation rule program.`);
    const result = program.authoredProgram ? clone(program.authoredProgram) : original ? clone(original) : { maximumErrors: 80, rules: [] };
    if (!original && key === "x-fullmeta-rules") result.version = 1;
    if (original && !Object.hasOwn(original, "maximumErrors") && !program.maxErrorsChanged)
      delete result.maximumErrors;
    else result.maximumErrors = program.maximumErrors;
    result.rules = program.authoredProgram && Object.hasOwn(program.authoredProgram, 'declarative')
      ? clone(program.authoredProgram.rules) : program.roots.map(validationStatementFromDraft);
    candidate[key] = result;
  }
  return candidate;
}


export function createBulkValidationDialog(options) {
  return createValidationProgramTableDialog({ ...options, buildCandidate: schemaWithValidationRuleDrafts });
}
