import { assertValidationProgramSemantics } from './semantic-validation.js';
import { validationRulesFromJson } from './json-import.js';
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => structuredClone(value);
const jsonText = value => value === undefined ? "" : JSON.stringify(value);
const ruleKind = rule => {
  if (Object.hasOwn(rule, "forEachTree")) return "forEachTree";
  if (Object.hasOwn(rule, "forEach")) return "forEach";
  if (Object.hasOwn(rule, "if")) return "if";
  if (Object.hasOwn(rule, "assert")) return "assert";
  if (Object.hasOwn(rule, "let")) return "let";
  if (Object.hasOwn(rule, "check")) return "check";
  return "other";
};
const KINDS = [
  ["assert", "Assertion"], ["let", "Let variable"], ["check", "Check"],
  ["forEach", "For each"], ["forEachTree", "For each tree"], ["if", "If"],
];
let nextId = 0;

function scopeDraft(scope, prefix) {
  const pathMode = scope === undefined || (isObject(scope) && typeof scope.from === "string");
  const config = pathMode && isObject(scope) ? scope : {};
  return {
    [`${prefix}Mode`]: pathMode ? "path" : "expression",
    [`${prefix}Expression`]: pathMode ? "" : jsonText(scope),
    [`${prefix}From`]: config.from || "",
    [`${prefix}Path`]: typeof config.path === "string" ? config.path : jsonText(config.path),
    [`${prefix}Where`]: jsonText(config.where),
    [`${prefix}BasePath`]: jsonText(config.basePath),
    [`${prefix}When`]: jsonText(config.when),
    [`${prefix}As`]: config.as || "",
  };
}

function fieldsFromRule(rule, kind) {
  const fields = { name: "", main: "", message: "", messageMode: "text",
    messageExpression: "", when: jsonText(rule.when), bind: "",
    pathAs: "", indexAs: "", haltOnErrors: false, hasChildren: false };
  if (kind === "assert") Object.assign(fields, { main: jsonText(rule.assert),
    message: typeof rule.message === "string" ? rule.message : "",
    messageMode: rule.message !== undefined && typeof rule.message !== "string"
      ? "expression" : "text",
    messageExpression: rule.message !== undefined && typeof rule.message !== "string"
      ? jsonText(rule.message) : "",
    haltOnErrors: rule.haltOnErrors === true });
  if (kind === "let") Object.assign(fields, { name: rule.let || "", main: jsonText(rule.value) });
  if (kind === "check") Object.assign(fields, { name: rule.check || "", main: jsonText(rule.input),
    bind: rule.bind || "", haltOnErrors: rule.haltOnErrors === true });
  if (kind === "if") fields.main = jsonText(rule.if);
  if (kind === "forEach" || kind === "forEachTree") {
    Object.assign(fields, { name: rule.as || "", pathAs: rule.pathAs || "",
      indexAs: rule.indexAs || "", ...scopeDraft(rule[kind], "scope") });
    if (kind === "forEachTree") Object.assign(fields,
      { hasChildren: Object.hasOwn(rule, "children"), ...scopeDraft(rule.children, "children") });
  }
  return fields;
}

export function draftRule(rule = null, parent = null, branch = "rules") {
  const original = rule === null ? null : clone(rule);
  const kind = original ? ruleKind(original) : "assert";
  const draft = { id: ++nextId, original, kind, fields: fieldsFromRule(original || {}, kind),
    parent, branch, expanded: false, children: { rules: [], then: [], else: [] } };
  draft.initialFields = clone(draft.fields);
  for (const key of ["rules", "then", "else"]) {
    if (Array.isArray(original?.[key])) draft.children[key] = original[key].map(child => draftRule(child, draft, key));
  }
  return draft;
}

/** Create the same lossless draft used by the bulk dialog. */
export function validationProgramDraft(program) {
  return { roots: (Array.isArray(program?.rules) ? program.rules : []).map(rule => draftRule(rule)),
    maximumErrors: Number.isInteger(program?.maximumErrors) ? program.maximumErrors : 80,
    maxErrorsChanged: false, selected: null,
    ...(isObject(program) && Object.hasOwn(program, 'declarative') ? { authoredProgram: clone(program) } : {}) };
}

/** Stage native roots atomically with the same draft model as interactive rows. */
/** @param {any} program @param {any[]} rules @param {{mode?:string,programKey?:string,validate?:boolean}} options */
export function validationProgramWithImportedRules(program, rules, { mode = 'append', programKey, validate = true } = {}) {
  if (!['append', 'replace'].includes(mode)) throw new Error('Choose append or replace for imported rules.');
  const imported = validationRulesFromJson(JSON.stringify(rules));
  const result = clone(program), incoming = imported.map(rule => draftRule(rule));
  result.roots = mode === 'replace' ? incoming : [...result.roots, ...incoming];
  result.selected = incoming[0]?.id ?? null;
  if (validate) assertValidationProgramSemantics({ rules: result.roots.map(statementFromDraft) }, { programKey });
  return result;
}

const trim = value => String(value ?? "").trim();
function parseRequiredJson(text, label) {
  if (!trim(text)) throw new Error(`${label} is required.`);
  try { return JSON.parse(text); }
  catch { throw new Error(`${label} must be valid expression JSON.`); }
}
function parseOptionalJson(text, label) {
  return trim(text) ? parseRequiredJson(text, label) : undefined;
}
function pathValue(text, label) {
  const value = trim(text);
  if (!value) return ""; // The empty JSON Pointer selects the root.
  if (value.startsWith("{") || value.startsWith("[")) return parseRequiredJson(value, label);
  return value;
}
function variableName(text, label) {
  const value = trim(text);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`${label} must be a valid variable name.`);
  return value;
}
function optionalName(text, label) { return trim(text) ? variableName(text, label) : undefined; }
function setOptional(target, key, value) {
  if (value === undefined || value === "") delete target[key];
  else target[key] = value;
}
function serializeScope(draft, prefix, originalScope) {
  const f = draft.fields;
  if (f[`${prefix}Mode`] === "expression") return parseRequiredJson(f[`${prefix}Expression`], `${prefix} collection expression`);
  const originalWasPath = isObject(originalScope) && typeof originalScope.from === "string";
  const scope = originalWasPath ? clone(originalScope) : {};
  scope.from = trim(f[`${prefix}From`]);
  if (!scope.from) throw new Error(`${prefix} source is required.`);
  scope.path = pathValue(f[`${prefix}Path`], `${prefix} path`);
  setOptional(scope, "where", parseOptionalJson(f[`${prefix}Where`], `${prefix} where expression`));
  setOptional(scope, "basePath", parseOptionalJson(f[`${prefix}BasePath`], `${prefix} base path expression`));
  setOptional(scope, "when", parseOptionalJson(f[`${prefix}When`], `${prefix} when expression`));
  setOptional(scope, "as", optionalName(f[`${prefix}As`], `${prefix} item variable`));
  if (originalWasPath && draft.initialFields?.[`${prefix}Mode`] === "path") {
    for (const [key, suffix] of Object.entries({ from: "From", path: "Path", where: "Where",
      basePath: "BasePath", when: "When", as: "As" })) {
      if (f[`${prefix}${suffix}`] !== draft.initialFields[`${prefix}${suffix}`]) continue;
      if (Object.hasOwn(originalScope, key)) scope[key] = clone(originalScope[key]);
      else delete scope[key];
    }
  }
  return scope;
}

function statementFromDraft(draft) {
  try { return statementFromDraftInner(draft); }
  catch (error) {
    if (!error.ruleAddressTagged) {
      error.message = `Rule ${draft.address || draft.id} (${describe(draft)}): ${error.message}`;
      error.ruleAddressTagged = true;
    }
    throw error;
  }
}
function statementFromDraftInner(draft) {
  if (draft.kind === "other") return clone(draft.original);
  const unchanged = (...fields) => draft.original && draft.initialFields &&
    fields.every(key => draft.fields[key] === draft.initialFields[key]);
  const childStatements = Object.fromEntries(["rules", "then", "else"].map(key =>
    [key, draft.children[key].map(statementFromDraft)]));
  const branchesUnchanged = ["rules", "then", "else"].every(key =>
    JSON.stringify(childStatements[key]) === JSON.stringify(draft.original?.[key] || []));
  if (draft.original && ruleKind(draft.original) === draft.kind && branchesUnchanged &&
      unchanged(...Object.keys(draft.fields))) return clone(draft.original);
  const node = draft.original && ruleKind(draft.original) === draft.kind ? clone(draft.original) : {};
  const f = draft.fields;
  if (draft.kind === "assert") {
    node.assert = unchanged("main") ? clone(draft.original.assert) : parseRequiredJson(f.main, "Assertion expression");
    if (f.messageMode === "expression")
      setOptional(node, "message", parseOptionalJson(f.messageExpression, "Message expression"));
    else setOptional(node, "message", trim(f.message));
    if (f.haltOnErrors) node.haltOnErrors = true; else delete node.haltOnErrors;
  } else if (draft.kind === "let") {
    node.let = variableName(f.name, "Let variable");
    node.value = unchanged("main") ? clone(draft.original.value) : parseRequiredJson(f.main, "Let value expression");
  } else if (draft.kind === "check") {
    node.check = trim(f.name);
    if (!node.check) throw new Error("Check name is required.");
    setOptional(node, "input", unchanged("main") ? clone(draft.original.input) : parseRequiredJson(f.main, "Check input expression"));
    setOptional(node, "bind", optionalName(f.bind, "Bound result variable"));
    if (f.haltOnErrors) node.haltOnErrors = true; else delete node.haltOnErrors;
  } else if (draft.kind === "if") {
    node.if = unchanged("main") ? clone(draft.original.if) : parseRequiredJson(f.main, "If condition expression");
    node.then = childStatements.then;
    if (draft.children.else.length) node.else = childStatements.else;
    else delete node.else;
  } else if (draft.kind === "forEach" || draft.kind === "forEachTree") {
    setOptional(node, "as", unchanged("name") ? draft.original.as : variableName(f.name, "Item variable"));
    node[draft.kind] = unchanged(...Object.keys(f).filter(key => key.startsWith("scope")))
      ? clone(draft.original[draft.kind]) : serializeScope(draft, "scope", draft.original?.[draft.kind]);
    setOptional(node, "pathAs", optionalName(f.pathAs, "Path variable"));
    setOptional(node, "indexAs", optionalName(f.indexAs, "Index variable"));
    if (draft.kind === "forEachTree") {
      if (f.hasChildren) node.children = serializeScope(draft, "children", draft.original?.children);
      else delete node.children;
    }
    node.rules = childStatements.rules;
  }
  setOptional(node, "when", parseOptionalJson(f.when, "When expression"));
  // Editing one fact must not normalize other facts (empty messages, explicit false,
  // selector metadata or intentionally empty branches) in an existing statement.
  if (draft.original && ruleKind(draft.original) === draft.kind) {
    const groups = { when: ["when"], assert: ["main"], value: ["main"], input: ["main"],
      if: ["main"], let: ["name"], check: ["name"], as: ["name"],
      message: ["message", "messageMode", "messageExpression"], bind: ["bind"],
      haltOnErrors: ["haltOnErrors"], pathAs: ["pathAs"], indexAs: ["indexAs"],
      children: ["hasChildren", ...Object.keys(f).filter(key => key.startsWith("children"))] };
    if (draft.kind === "forEach" || draft.kind === "forEachTree")
      groups[draft.kind] = Object.keys(f).filter(key => key.startsWith("scope"));
    for (const [key, fields] of Object.entries(groups)) {
      if (!unchanged(...fields)) continue;
      if (Object.hasOwn(draft.original, key)) node[key] = clone(draft.original[key]);
      else delete node[key];
    }
    for (const key of ["rules", "then", "else"]) {
      if (!draft.children[key].length && Array.isArray(draft.original[key]) && !draft.original[key].length)
        node[key] = [];
      if (!draft.children[key].length && !Object.hasOwn(draft.original, key)) delete node[key];
    }
  }
  return node;
}

export function describe(draft) {
  const f = draft.fields;
  if (draft.kind === "assert") return f.messageMode === "expression"
    ? "Computed message" : f.message || "Assertion";
  if (draft.kind === "let") return `Let ${f.name || "variable"}`;
  if (draft.kind === "check") return `Check ${f.name || "type"}`;
  if (draft.kind === "if") return "Conditional";
  if (draft.kind === "forEach" || draft.kind === "forEachTree")
    return `${draft.kind === "forEachTree" ? "Tree" : "Each"} ${f.name || "item"}`;
  return Object.keys(draft.original || {}).join(", ") || "Other rule";
}
export function countDescendants(draft) {
  return 1 + ["rules", "then", "else"].reduce((sum, key) =>
    sum + draft.children[key].reduce((sub, child) => sub + countDescendants(child), 0), 0);
}

const BATCH_KINDS = new Set(KINDS.map(([kind]) => kind));
const BATCH_FIELDS = new Set(Object.keys(fieldsFromRule({}, "forEachTree")));
const BATCH_BOOLEAN_FIELDS = new Set(["haltOnErrors", "hasChildren"]);
const BATCH_MODE_FIELDS = new Set(["messageMode", "scopeMode", "childrenMode"]);
const BATCH_EXPRESSION_FIELDS = new Set(["main", "messageExpression", "when",
  "scopeExpression", "scopeWhere", "scopeBasePath", "scopeWhen",
  "childrenExpression", "childrenWhere", "childrenBasePath", "childrenWhen"]);
const BATCH_PATH_FIELDS = new Set(["scopePath", "childrenPath"]);
const ADDRESS_PARTS = /^(?:[1-9]\d*)(?:\.(?:rules|then|else)\[(?:[1-9]\d*)\])*$/;

function fieldFitsRule(kind, field) {
  if (kind === "other") return false;
  if (field === "when") return true;
  if (field === "name") return ["let", "check", "forEach", "forEachTree"].includes(kind);
  if (field === "main") return ["assert", "let", "check", "if"].includes(kind);
  if (["message", "messageMode", "messageExpression"].includes(field)) return kind === "assert";
  if (field === "bind") return kind === "check";
  if (field === "haltOnErrors") return kind === "check" || kind === "assert";
  if (field === "hasChildren" || field.startsWith("children")) return kind === "forEachTree";
  if (field === "pathAs" || field === "indexAs" || field.startsWith("scope"))
    return kind === "forEach" || kind === "forEachTree";
  return false;
}

function addressSteps(address) {
  const value = trim(address);
  if (!ADDRESS_PARTS.test(value))
    throw new Error(`Rule path ${value || "(blank)"} must look like 14 or 14.rules[1].`);
  const parts = [...value.matchAll(/(?:^|\.)(\d+)|\.(rules|then|else)\[(\d+)\]/g)];
  const steps = [{ branch: "roots", index: Number(parts[0][1]) - 1 }];
  for (const part of parts.slice(1))
    steps.push({ branch: part[2], index: Number(part[3]) - 1 });
  return steps;
}

function draftAtAddress(program, address, { createMissing = false, kind = "" } = {}) {
  const steps = addressSteps(address);
  let parent = null, list = program.roots, draft = null;
  for (let position = 0; position < steps.length; position++) {
    const { branch, index } = steps[position];
    if (index > list.length || (index === list.length && (!createMissing || position !== steps.length - 1)))
      throw new Error(`${address}: first add the missing parent or preceding sibling.`);
    if (index === list.length) {
      if (!BATCH_KINDS.has(kind)) throw new Error(`${address}: new rules need a kind.`);
      draft = draftRule(null, parent, branch === "roots" ? "rules" : branch);
      draft.kind = kind;
      draft.fields = fieldsFromRule({}, kind);
      list.push(draft);
    } else draft = list[index];
    if (position === steps.length - 1) break;
    const nextBranch = steps[position + 1].branch;
    if (nextBranch === "rules" && draft.kind !== "forEach" && draft.kind !== "forEachTree")
      throw new Error(`${address}: ${nextBranch} needs a For each parent.`);
    if ((nextBranch === "then" || nextBranch === "else") && draft.kind !== "if")
      throw new Error(`${address}: ${nextBranch} needs an If parent.`);
    parent = draft;
    list = draft.children[nextBranch];
  }
  return draft;
}

function parseBatchLines(text, columnCount, label) {
  const lines = String(text || "").split(/\r?\n/);
  const result = [];
  lines.forEach((line, index) => {
    if (!trim(line) || trim(line).startsWith("#")) return;
    const columns = line.split("\t");
    if (columns.length > columnCount) throw new Error(`${label} line ${index + 1} (statement ${trim(columns[0]) || '(blank path)'}) has too many columns.`);
    result.push({ number: index + 1, columns });
  });
  if (!result.length) throw new Error(`${label} needs at least one row.`);
  return result;
}

export function applyStatementRows(program, text) {
  const rows = parseBatchLines(text, 8, "Statement rows");
  for (const { number, columns } of rows) {
    const [address, rawKind, name, expression, message, source, path, when] =
      [...columns, ...Array(8).fill("")].slice(0, 8).map(trim);
    if (address.toLowerCase() === "path" && rawKind.toLowerCase() === "kind") continue;
    try {
      const kind = rawKind || "";
      if (kind && !BATCH_KINDS.has(kind) && kind !== "other")
        throw new Error(`Kind ${kind} is not supported.`);
      const draft = draftAtAddress(program, address, { createMissing: true, kind });
      if (kind && draft.kind !== kind)
        throw new Error(`Existing rule is ${draft.kind}; change its kind in the structured editor.`);
      const f = draft.fields;
      if (name) {
        if (!fieldFitsRule(draft.kind, "name")) throw new Error("This rule has no name or type field.");
        f.name = name;
      }
      if (expression) {
        if (draft.kind === "other") throw new Error("Other rule shapes are preserved without edits.");
        parseRequiredJson(expression, "Expression");
        if (kind === "forEach" || kind === "forEachTree" ||
          (!kind && (draft.kind === "forEach" || draft.kind === "forEachTree"))) {
          f.scopeMode = "expression"; f.scopeExpression = expression;
        } else f.main = expression;
      }
      if (message) {
        if (draft.kind !== "assert") throw new Error("Message is only available for assertions.");
        f.messageMode = "text"; f.message = message;
      }
      if (source || path) {
        if (draft.kind !== "forEach" && draft.kind !== "forEachTree")
          throw new Error("Source and traversal path are only available for loops.");
        if (expression) throw new Error("Use either collection expression or source and traversal path.");
        f.scopeMode = "path";
        if (source) f.scopeFrom = source;
        if (path) {
          if (path.startsWith("{") || path.startsWith("[")) parseRequiredJson(path, "Traversal path");
          f.scopePath = path;
        }
      }
      if (when) {
        if (draft.kind === "other") throw new Error("Other rule shapes are preserved without edits.");
        parseRequiredJson(when, "When expression"); f.when = when;
      }
    } catch (error) { throw new Error(`Statement row ${number} (statement ${address || '(blank path)'}): ${error.message}`); }
  }
  return rows.length;
}

export function applyDetailRows(program, text) {
  const rows = parseBatchLines(text, 3, "Detail rows");
  for (const { number, columns } of rows) {
    const [address, field, value = ""] = columns;
    if (trim(address).toLowerCase() === "path" && trim(field).toLowerCase() === "field") continue;
    try {
      if (!BATCH_FIELDS.has(trim(field))) throw new Error(`Field ${field || "(blank)"} is not editable.`);
      const draft = draftAtAddress(program, address);
      const key = trim(field);
      if (!fieldFitsRule(draft.kind, key))
        throw new Error(`${key} is not a field of a ${draft.kind} rule.`);
      if (BATCH_BOOLEAN_FIELDS.has(key)) {
        if (trim(value) !== "true" && trim(value) !== "false")
          throw new Error(`${key} must be true or false.`);
        draft.fields[key] = trim(value) === "true";
      } else if (BATCH_MODE_FIELDS.has(key)) {
        const allowed = key === "messageMode" ? ["text", "expression"] : ["path", "expression"];
        if (!allowed.includes(trim(value))) throw new Error(`${key} must be ${allowed.join(" or ")}.`);
        draft.fields[key] = trim(value);
      } else {
        if (BATCH_EXPRESSION_FIELDS.has(key) && trim(value)) parseRequiredJson(value, key);
        if (BATCH_PATH_FIELDS.has(key) && /^[\s]*[\[{]/.test(value)) parseRequiredJson(value, key);
        draft.fields[key] = value;
      }
    } catch (error) { throw new Error(`Detail row ${number} (statement ${trim(address) || '(blank path)'}): ${error.message}`); }
  }
  return rows.length;
}

export function statementRowsFor(program, selected) {
  const lines = ["Path\tKind\tName or type\tExpression JSON\tMessage\tSource\tTraversal path\tWhen JSON"];
  function visit(draft, address) {
    const f = draft.fields;
    const loop = draft.kind === "forEach" || draft.kind === "forEachTree";
    const expression = loop ? f.scopeMode === "expression" ? f.scopeExpression : "" : f.main;
    lines.push([address, draft.kind, f.name, expression,
      draft.kind === "assert" && f.messageMode === "text" ? f.message : "",
      loop && f.scopeMode === "path" ? f.scopeFrom : "",
      loop && f.scopeMode === "path" ? f.scopePath : "",
      draft.kind === "other" ? "" : f.when]
      .map(value => String(value ?? "").replace(/\t|\r?\n/g, " ")).join("\t"));
    for (const branch of ["rules", "then", "else"])
      draft.children[branch].forEach((child, index) => visit(child, `${address}.${branch}[${index + 1}]`));
  }
  program.roots.forEach((root, index) => {
    if (selected === null || selected === root.id) visit(root, String(index + 1));
  });
  return lines.join("\n");
}

export function detailRowsFor(program, selected) {
  const lines = ["Path\tField\tValue"];
  function visit(draft, address) {
    for (const [key, value] of draft.kind === "other" ? [] : Object.entries(draft.fields)) {
      if (["name", "main", "message", "when", "scopeFrom", "scopePath", "scopeExpression"].includes(key)) continue;
      if (value === "" || value === false || value === undefined) continue;
      lines.push([address, key, String(value).replace(/\t|\r?\n/g, " ")].join("\t"));
    }
    for (const branch of ["rules", "then", "else"])
      draft.children[branch].forEach((child, index) => visit(child, `${address}.${branch}[${index + 1}]`));
  }
  program.roots.forEach((root, index) => {
    if (selected === null || selected === root.id) visit(root, String(index + 1));
  });
  return lines.join("\n");
}

export { statementFromDraft as validationStatementFromDraft };
export function snapshotValidationDraft(draft){return {...draft,parent:null,children:Object.fromEntries(Object.entries(draft.children).map(([branch,children])=>[branch,children.map(snapshotValidationDraft)]))};}
export function restoreValidationDraft(value,parent=null){if(Number.isSafeInteger(value.id)&&value.id>0)nextId=Math.max(nextId,value.id);const draft={...value,parent,children:{}};for(const [branch,children]of Object.entries(value.children))draft.children[branch]=children.map(child=>restoreValidationDraft(child,draft));return draft;}
