const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const escapePointer = value => String(value).replace(/~/g, "~0").replace(/\//g, "~1");
const pointer = parts => `#/${parts.map(escapePointer).join("/")}`;
const displayName = value => String(value).replace(/^x-fullmeta-/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
const ruleKinds = ["forEachTree", "forEach", "if", "assert", "let", "check"];

function statementKind(rule) {
  if (!object(rule)) return "unknown";
  return ruleKinds.find(kind => Object.hasOwn(rule, kind)) || "unknown";
}

export function countRules(rules) {
  if (!Array.isArray(rules)) return 0;
  return rules.reduce((count, rule) => {
    const kind = statementKind(rule);
    if (kind === "forEach" || kind === "forEachTree") return count + 1 + countRules(rule.rules);
    if (kind === "if") return count + 1 + countRules(rule.then) + countRules(rule.else);
    return count + 1;
  }, 0);
}

function compact(value, depth = 0) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value !== "object") return String(value);
  if (depth > 2) return Array.isArray(value) ? "[…]" : "{…}";
  if (Array.isArray(value)) return `[${value.slice(0, 3).map(item => compact(item, depth + 1)).join(", ")}${value.length > 3 ? ", …" : ""}]`;
  if (typeof value.op === "string" && Array.isArray(value.args)) return `${value.op}(${value.args.map(item => compact(item, depth + 1)).join(", ")})`;
  if (typeof value.var === "string") return `$${value.var}${value.path ? ` · ${compact(value.path, depth + 1)}` : ""}`;
  for (const source of ["model", "schema", "context", "from"]) {
    if (Object.hasOwn(value, source)) return `${source}${value.path ? ` · ${compact(value.path, depth + 1)}` : ` · ${compact(value[source], depth + 1)}`}`;
  }
  return `{${Object.keys(value).slice(0, 3).join(", ")}${Object.keys(value).length > 3 ? ", …" : ""}}`;
}

export function ruleTitle(rule, index) {
  const kind = statementKind(rule);
  if (kind === "let") return `Set ${rule.let || "value"}`;
  if (kind === "forEach") return `For each ${rule.as || "item"}`;
  if (kind === "forEachTree") return `Traverse tree as ${rule.as || "item"}`;
  if (kind === "if") return `If ${expressionText(rule.if)}`;
  if (kind === "assert") return typeof rule.message === "string" && rule.message.trim() ? rule.message : `Require ${compact(rule.assert)}`;
  if (kind === "check") return `Check ${rule.check}`;
  return `Rule ${index + 1} · unknown form`;
}

function ruleDataSummary(rule) {
  const reads = new Set();
  const visit = value => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!object(value)) return;
    if (Object.hasOwn(value, "literal")) return;
    if (typeof value.var === "string") reads.add(`$${value.var}${value.path ? ` · ${compact(value.path)}` : ""}`);
    for (const source of ["from", "model", "schema", "context"]) if (typeof value[source] === "string") {
      reads.add(`${source === "from" ? "source" : source} ${value[source]}${value.path ? ` · ${compact(value.path)}` : ""}`);
    }
    Object.values(value).forEach(visit);
  };
  for (const key of ["when", "value", "forEach", "forEachTree", "children", "if", "assert", "message", "input"]) if (Object.hasOwn(rule || {}, key)) visit(rule[key]);
  const writes = [];
  if (typeof rule?.let === "string") writes.push(`$${rule.let}`);
  if (typeof rule?.bind === "string") writes.push(`$${rule.bind}`);
  if (typeof rule?.as === "string") writes.push(`$${rule.as} (loop item)`);
  if (typeof rule?.indexAs === "string") writes.push(`$${rule.indexAs} (index)`);
  return { reads: [...reads], writes };
}

function summarizeProgram(source, key, declaration) {
  const isRoot = key === "x-fullmeta-rules";
  return {
    file: source.file,
    pointer: pointer([key]),
    label: isRoot ? "Model validation" : displayName(key),
    key,
    declaration,
    source,
  };
}

export function discoverPrograms(sources) {
  const result = [];
  for (const source of sources) {
    if (!object(source?.value)) continue;
    for (const [key, value] of Object.entries(source.value)) {
      if (!(key === "x-fullmeta-rules" || /^x-fullmeta-.*Validation$/.test(key))) continue;
      if (!object(value) || !Array.isArray(value.rules)) continue;
      result.push(summarizeProgram(source, key, value));
    }
  }
  return result;
}

function getAtPointer(value, path) {
  const parts = String(path || "#").replace(/^#\/?/, "").split("/").filter(Boolean).map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  return parts.reduce((current, part) => current?.[Array.isArray(current) ? Number(part) : part], value);
}

export function pointerSegments(path) {
  if (Array.isArray(path)) return path.map(String);
  if (typeof path !== "string") return [];
  return path.replace(/^#?\/?/, "").split("/").filter(Boolean).map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function resolvedSourcePath(selector, environment) {
  if (!object(selector)) return null;
  const source = selector.from || "root", path = pointerSegments(selector.path);
  if (source === "root") return path;
  if (environment.has(source)) return [...environment.get(source), ...path];
  if (source === "model" || source === "context" || source === "schema") return [source, ...path];
  return null;
}

export function expressionText(value) {
  if (Array.isArray(value)) return `[${value.map(expressionText).join(", ")}]`;
  if (!object(value)) return JSON.stringify(value);
  if (Object.hasOwn(value, "literal")) return expressionText(value.literal);
  if (typeof value.var === "string") return `$${value.var}${value.path ? ` · ${expressionText(value.path)}` : ""}`;
  if (typeof value.op === "string" && Array.isArray(value.args)) return `${value.op}(${value.args.map(expressionText).join(", ")})`;
  for (const source of ["model", "context", "schema"]) if (Object.hasOwn(value, source)) {
    return `${source}${value.path ? ` · ${expressionText(value.path)}` : ` · ${expressionText(value[source])}`}`;
  }
  return JSON.stringify(value);
}

function expressionReadPaths(value, environment, result = []) {
  if (Array.isArray(value)) { value.forEach(item => expressionReadPaths(item, environment, result)); return result; }
  if (!object(value)) return result;
  if (typeof value.var === "string" && Array.isArray(environment.get(value.var))) {
    result.push([...environment.get(value.var), ...pointerSegments(value.path)]);
  }
  if (Object.hasOwn(value, "literal")) return result;
  Object.values(value).forEach(item => expressionReadPaths(item, environment, result));
  return result;
}

function pathLabel(path) {
  return `$${(path || []).map(part => part === "*" ? "[*]" : `.${part}`).join("")}`;
}

function pathPrefixMatches(left, right) {
  if (left.length > right.length) return false;
  return left.every((part, index) => part === "*" || right[index] === "*" || String(part) === String(right[index]));
}

export function pathsRelated(left, right) {
  if (!left.length) return true;
  if (!right.length) return false;
  return pathPrefixMatches(left, right) || pathPrefixMatches(right, left);
}

export function semanticAssertions(program) {
  const found = [];
  const control = (path, field, value, label, bindings, diagnostic = false) => ({
    pointer: `${pointer(path)}/${escapePointer(field)}`, field, value: structuredClone(value),
    label, availableVariables: [...bindings], diagnostic,
  });
  const visit = (rules, path, environment = new Map(), guards = [], scopes = [], scopePaths = [],
    bindings = new Set(["root", "model", "schema", "context", "documents", "path", "__path"]),
    inheritedControls = [], diagnosticControl = null) => {
    if (!Array.isArray(rules)) return;
    const localEnvironment = new Map(environment), localBindings = new Set(bindings);
    let localDiagnostic = diagnosticControl;
    rules.forEach((rule, index) => {
      if (!object(rule)) return;
      const current = [...path, index], kind = statementKind(rule);
      const ruleControls = inheritedControls.slice();
      if (Object.hasOwn(rule, "when")) ruleControls.push(control(current, "when", rule.when, "Only when", localBindings));
      if (kind === "let" && rule.let === "path" && Object.hasOwn(rule, "value")) {
        localDiagnostic = control(current, "value", rule.value, "Diagnostic path", localBindings, true);
      }
      if (kind === "let" && typeof rule.let === "string") {
        localBindings.add(rule.let);
        localEnvironment.delete(rule.let);
      } else if (kind === "check" && typeof rule.bind === "string") {
        localBindings.add(rule.bind);
        localEnvironment.delete(rule.bind);
      }
      if (kind === "forEach" || kind === "forEachTree") {
        const selector = kind === "forEach" ? rule.forEach : rule.forEachTree;
        const selectorControl = control(current, kind, selector, "Collection selector and diagnostic location", localBindings, true);
        const nestedControls = [...ruleControls, selectorControl];
        const sourcePath = resolvedSourcePath(selector, localEnvironment), nested = new Map(localEnvironment);
        if (sourcePath) nested.set(typeof rule.as === "string" ? rule.as : "item", sourcePath);
        const nestedBindings = new Set(localBindings);
        nestedBindings.add(typeof rule.as === "string" ? rule.as : "item");
        nestedBindings.add(typeof rule.indexAs === "string" ? rule.indexAs : "index");
        nestedBindings.add(typeof rule.pathAs === "string" ? rule.pathAs : "path");
        if (kind === "forEachTree" && Object.hasOwn(rule, "children")) {
          const childBindings = new Set(nestedBindings);
          for (const nestedRule of rule.rules || []) {
            if (typeof nestedRule?.let === "string") childBindings.add(nestedRule.let);
            if (typeof nestedRule?.bind === "string") childBindings.add(nestedRule.bind);
          }
          nestedControls.push(control(current, "children", rule.children, "Child selector", childBindings));
        }
        const nextScopes = sourcePath ? [...scopes, `For each $${rule.as || "item"} at ${pathLabel(sourcePath)}`] : scopes;
        const nextScopePaths = sourcePath ? [...scopePaths, sourcePath] : scopePaths;
        visit(rule.rules, [...current, "rules"], nested, guards, nextScopes, nextScopePaths,
          nestedBindings, nestedControls, selectorControl);
      } else if (kind === "if") {
        const condition = expressionText(rule.if), reads = expressionReadPaths(rule.if, localEnvironment);
        const nextGuards = [...guards, { text: `When ${condition}`, reads }];
        const conditionControl = control(current, "if", rule.if, "If condition", localBindings);
        visit(rule.then, [...current, "then"], localEnvironment, nextGuards, scopes, scopePaths,
          localBindings, [...ruleControls, conditionControl], localDiagnostic);
        if (Array.isArray(rule.else)) visit(rule.else, [...current, "else"], localEnvironment,
          [...guards, { text: `When not(${condition})`, reads }], scopes, scopePaths,
          localBindings, [...ruleControls, conditionControl], localDiagnostic);
      } else if (kind === "assert") {
        const reads = [...expressionReadPaths(rule.assert, localEnvironment)];
        for (const guard of guards) reads.push(...guard.reads);
        if (rule.when !== undefined) reads.push(...expressionReadPaths(rule.when, localEnvironment));
        if (reads.length) found.push({
          file: program.file, pointer: pointer(current), label: ruleTitle(rule, index),
          programLabel: program.label, kind: "assert", expression: expressionText(rule.assert),
          assertion: structuredClone(rule.assert), availableVariables: [...localBindings],
          sourceRule: structuredClone(rule),
          controls: [...ruleControls, ...(localDiagnostic && !ruleControls.some(item => item.pointer === localDiagnostic.pointer)
            ? [localDiagnostic] : [])],
          message: typeof rule.message === "string" ? rule.message : rule.message === undefined ? "" : expressionText(rule.message),
          guards: guards.map(guard => guard.text), scopes: scopes.slice(), scopePaths: scopePaths.map(path => path.slice()),
          reads: [...new Set(reads.map(pathLabel))], readPaths: reads,
        });
      }
    });
  };
  visit(program.declaration.rules, [program.key, "rules"]);
  return found;
}

