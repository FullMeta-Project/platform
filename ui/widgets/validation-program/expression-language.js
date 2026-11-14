// A reversible text surface for FullMeta rule expressions and selectors.
// ast(JSON) remains an audit-only escape hatch for unfamiliar JSON shapes.
// The JSON rule AST remains the executable source of truth.
export const validationOperationNames = Object.freeze([
  "abs", "all", "any", "canonicalMap", "choose", "coalesce", "concat", "contains",
  "descendants", "distinct", "entries", "eq", "filter", "flatten", "format", "fromEntries", "get",
  "gt", "gte", "has", "isNull", "keys", "length", "lookup", "lt", "lte", "map",
  "matches", "merge", "ne", "norm", "not", "path", "pathString", "product", "productAtMost",
  "schemaAt", "setEqual", "subset", "text", "trim", "unique", "values",
]);

const namedOperations = Object.freeze({
  map: ["items", "as", "value"], filter: ["items", "as", "where"],
  descendants: ["items", "childrenPath"],
  lookup: ["items", "as", "where"], matches: ["value", "schema"],
  canonicalMap: ["value", "omitValue", "allowedKeys"],
});
const textOperations = new Set(validationOperationNames.filter(name => !Object.hasOwn(namedOperations, name)));
export const validationTextCompletions = Object.freeze([
  ...validationOperationNames.map(name => ({ label: name, insert: `${name}()` })),
  { label: "select", insert: "select(from: \"root\", path: \"\")" },
  { label: "literal", insert: "literal()" },
  { label: "array", insert: "array()" },
  { label: "object", insert: "object()" },
]);
const booleanOperations = new Set([
  "all", "any", "contains", "eq", "gt", "gte", "has", "isNull", "lt", "lte",
  "matches", "ne", "not", "setEqual", "subset", "unique",
]);
const sourceNames = new Set(["model", "schema", "context"]);
const exactArity = Object.freeze({
  abs: 1, contains: 2, distinct: 1, entries: 1, eq: 2, flatten: 1,
  fromEntries: 1, get: 2, gt: 2, gte: 2, has: 2, isNull: 1, keys: 1,
  length: 1, lt: 2, lte: 2, ne: 2, norm: 1, not: 1, path: 1,
  pathString: 1, product: 1, productAtMost: 2, schemaAt: 1, setEqual: 2, subset: 2,
  trim: 1, unique: 1, values: 1,
});
const minimumArity = Object.freeze({ choose: 3, format: 1 });
const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const numberPattern = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function sameValidationExpression(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length && left.every((item, index) => sameValidationExpression(item, right[index]));
  if (!object(left) || !object(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => own(right, key)
    && sameValidationExpression(left[key], right[key]));
}

function syntaxError(text, offset, message) {
  const before = text.slice(0, offset), line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  const error = new SyntaxError(`${message} (line ${line}, column ${column}).`);
  error.offset = offset;
  return error;
}

function checkArity(name, count, text, offset) {
  if (own(exactArity, name) && count !== exactArity[name]) {
    throw syntaxError(text, offset, `${name} needs ${exactArity[name]} argument${exactArity[name] === 1 ? "" : "s"}`);
  }
  if (own(minimumArity, name) && count < minimumArity[name]) {
    throw syntaxError(text, offset, `${name} needs at least ${minimumArity[name]} arguments`);
  }
}

export function parseValidationExpression(input, { allowAst = false } = {}) {
  const text = String(input);
  if (text.length > 20000) throw syntaxError(text, 20000, "The expression is too long");
  let index = 0;
  const whitespace = () => { while (index < text.length && /\s/.test(text[index])) index++; };
  const fail = message => { throw syntaxError(text, index, message); };
  const consume = token => {
    whitespace();
    if (!text.startsWith(token, index)) return false;
    index += token.length;
    return true;
  };
  const expect = token => { if (!consume(token)) fail(`Expected ${JSON.stringify(token)}`); };
  const identifier = () => {
    whitespace();
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(index));
    if (!match) fail("Expected a name");
    index += match[0].length;
    return match[0];
  };
  const jsonString = () => {
    whitespace();
    if (text[index] !== '"') fail("Expected a JSON string");
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const character = text[index++];
      if (character === '"' && !escaped) {
        try { return JSON.parse(text.slice(start, index)); }
        catch { throw syntaxError(text, start, "Invalid JSON string"); }
      }
      if (character === "\\" && !escaped) escaped = true;
      else escaped = false;
    }
    throw syntaxError(text, start, "Unterminated JSON string");
  };
  const pathSuffix = (depth) => {
    whitespace();
    if (consume("·") || consume("->")) {
      whitespace();
      const path = consume("(") ? (() => { const value = expression(depth + 1); expect(")"); return value; })()
        : text[index] === "[" ? expression(depth + 1) : jsonString();
      if (typeof path === "string" && path !== "" && !path.startsWith("/")) fail("A path must be a JSON Pointer beginning with /");
      return path;
    }
    return undefined;
  };
  const expression = (depth = 0) => {
    if (depth > 128) fail("The expression is nested too deeply");
    whitespace();
    if (index >= text.length) fail("Expected an expression");
    if (consume("[")) {
      const items = [];
      if (!consume("]")) {
        do { items.push(expression(depth + 1)); } while (consume(","));
        expect("]");
      }
      return items;
    }
    if (consume("$")) {
      const name = identifier();
      const path = pathSuffix(depth);
      return path === undefined ? { var: name } : { var: name, path };
    }
    if (text[index] === '"') return jsonString();
    if (text[index] === "-" || /[0-9]/.test(text[index])) {
      const match = numberPattern.exec(text.slice(index));
      if (!match) fail("Invalid number");
      index += match[0].length;
      const value = Number(match[0]);
      if (!Number.isFinite(value)) fail("The number must be finite");
      return value;
    }
    const start = index, name = identifier();
    if (name === "true" || name === "false" || name === "null") return name === "null" ? null : name === "true";
    if (sourceNames.has(name)) {
      const path = pathSuffix(depth);
      return { [name]: path === undefined ? "" : path };
    }
    expect("(");
    if (name === "ast" || name === "literal") {
      if (name === "ast" && !allowAst) throw syntaxError(text, start, "Use the structured rule editor for this expression shape");
      whitespace();
      const jsonStart = index;
      let inString = false, escaped = false;
      while (index < text.length) {
        const character = text[index];
        if (inString) {
          if (character === '"' && !escaped) inString = false;
          if (character === "\\" && !escaped) escaped = true;
          else escaped = false;
        } else if (character === '"') inString = true;
        else if (character === ")") break;
        index++;
      }
      if (index >= text.length) fail(`Unterminated ${name} JSON wrapper`);
      let value;
      try { value = JSON.parse(text.slice(jsonStart, index).trim()); }
      catch { throw syntaxError(text, jsonStart, `Invalid JSON inside ${name} wrapper`); }
      index++;
      return name === "literal" ? { literal: value } : value;
    }
    if (name === "select" || own(namedOperations, name) || name === "object") {
      const fields = {};
      if (!consume(")")) {
        do {
          whitespace();
          const key = text[index] === '"' ? jsonString() : identifier();
          if (own(fields, key)) fail(`Duplicate field ${key}`);
          expect(":");
          fields[key] = expression(depth + 1);
        } while (consume(","));
        expect(")");
      }
      if (name === "object") return { object: fields };
      if (name === "select") {
        const keys = ["from", "var", "model", "schema", "context", "path", "where", "when", "as", "basePath"];
        if (Object.keys(fields).some(key => !keys.includes(key))) fail("Unknown selector field");
        for (const key of ["from", "var", "as"]) if (own(fields, key) && typeof fields[key] !== "string") fail(`${key} must be a string`);
        return fields;
      }
      if (Object.keys(fields).some(key => !namedOperations[name].includes(key))) fail(`Unknown ${name} field`);
      for (const key of name === "map" ? ["items", "value"] : ["filter", "lookup"].includes(name) ? ["items", "where"] : name === "matches" ? ["value", "schema"] : ["value"]) {
        if (!own(fields, key)) fail(`${name} needs ${key}`);
      }
      if (own(fields, "as") && typeof fields.as !== "string") fail("as must be a string");
      return { op: name, ...fields };
    }
    const args = [];
    if (!consume(")")) {
      do { args.push(expression(depth + 1)); } while (consume(","));
      expect(")");
    }
    if (name === "array") return { array: args };
    if (!textOperations.has(name)) throw syntaxError(text, start, `Unknown or unsupported text operation ${name}`);
    checkArity(name, args.length, text, start);
    return { op: name, args };
  };
  const result = expression();
  whitespace();
  if (index !== text.length) fail("Unexpected text after the expression");
  return result;
}

function printable(value, depth = 0) {
  if (depth > 128) return null;
  if (value === null || ["string", "boolean", "number"].includes(typeof value)) {
    return typeof value === "number" && !Number.isFinite(value) ? null : JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(item => printable(item, depth + 1));
    return parts.every(part => part !== null) ? `[${parts.join(", ")}]` : null;
  }
  if (!object(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 1 && own(value, "literal")) {
    return `literal(${JSON.stringify(value.literal)})`;
  }
  if (typeof value.var === "string" && identifierPattern.test(value.var)
    && keys.every(key => ["var", "path"].includes(key))
    && (keys.length === 1 || typeof value.path !== "string" || value.path === "" || value.path.startsWith("/"))) {
    const path = own(value, "path") ? printable(value.path, depth + 1) : null;
    return own(value, "path") ? path === null ? null : `$${value.var} · ${typeof value.path === "string" || Array.isArray(value.path) ? path : `(${path})`}` : `$${value.var}`;
  }
  if (keys.length === 1 && sourceNames.has(keys[0])) {
    const source = value[keys[0]], path = printable(source, depth + 1);
    if (path === null || typeof source === "string" && source !== "" && !source.startsWith("/")) return null;
    return `${keys[0]}${source === "" ? "" : ` · ${typeof source === "string" || Array.isArray(source) ? path : `(${path})`}`}`;
  }
  if (keys.length === 1 && own(value, "object") && object(value.object)) {
    const fields = Object.entries(value.object).map(([key, child]) => [key, printable(child, depth + 1)]);
    return fields.some(([, part]) => part === null) ? null : `object(${fields.map(([key, part]) => `${identifierPattern.test(key) ? key : JSON.stringify(key)}: ${part}`).join(", ")})`;
  }
  if (keys.length === 1 && own(value, "array") && Array.isArray(value.array)) {
    const parts = value.array.map(item => printable(item, depth + 1));
    return parts.some(part => part === null) ? null : `array(${parts.join(", ")})`;
  }
  if (typeof value.op === "string" && own(namedOperations, value.op) && keys.every(key => key === "op" || namedOperations[value.op].includes(key))) {
    const fields = Object.entries(value).filter(([key]) => key !== "op").map(([key, child]) => [key, printable(child, depth + 1)]);
    return fields.some(([, part]) => part === null) ? null : `${value.op}(${fields.map(([key, part]) => `${key}: ${part}`).join(", ")})`;
  }
  if (keys.includes("from") && keys.every(key => ["from", "var", "model", "schema", "context", "path", "where", "when", "as", "basePath"].includes(key))) {
    const fields = Object.entries(value).map(([key, child]) => [key, printable(child, depth + 1)]);
    return fields.some(([, part]) => part === null) ? null : `select(${fields.map(([key, part]) => `${key}: ${part}`).join(", ")})`;
  }
  if (keys.length === 2 && typeof value.op === "string" && Array.isArray(value.args)
    && textOperations.has(value.op) && keys.every(key => ["op", "args"].includes(key))) {
    const parts = value.args.map(item => printable(item, depth + 1));
    if (parts.some(part => part === null)) return null;
    try { checkArity(value.op, parts.length, "", 0); } catch { return null; }
    return `${value.op}(${parts.join(", ")})`;
  }
  return null;
}

export function printableValidationExpression(value) {
  const text = printable(value);
  if (text === null) return null;
  try { return sameValidationExpression(parseValidationExpression(text), value) ? text : null; }
  catch { return null; }
}

// A complete, lossless printer for migration and program auditing. The UI
// deliberately continues to use printableValidationExpression so complex
// shapes remain in the structured editor until a concise syntax is designed.
export function losslessValidationExpression(value) {
  const concise = printableValidationExpression(value);
  if (concise !== null) return concise;
  const text = `ast(${JSON.stringify(value)})`;
  if (!sameValidationExpression(parseValidationExpression(text, { allowAst: true }), value)) {
    throw new Error("The validation expression cannot be round-tripped losslessly.");
  }
  return text;
}

export function validationExpressionVariables(value, result = new Set(), local = new Set()) {
  if (Array.isArray(value)) value.forEach(item => validationExpressionVariables(item, result, local));
  else if (object(value)) {
    if (own(value, "literal")) return result;
    if (typeof value.var === "string" && !local.has(value.var)) result.add(value.var);
    if (["map", "filter", "lookup"].includes(value.op)) {
      validationExpressionVariables(value.items, result, local);
      const nested = new Set([...local, value.as || "item", "item", "index"]);
      validationExpressionVariables(value.value ?? value.where, result, nested);
      return result;
    }
    if (own(value, "from")) {
      if (!["root", "model", "schema", "context"].includes(value.from) && !local.has(value.from)) result.add(value.from);
      for (const key of ["path", "basePath", "when"]) if (own(value, key) && typeof value[key] !== "string") validationExpressionVariables(value[key], result, local);
      if (own(value, "where")) validationExpressionVariables(value.where, result,
        new Set([...local, value.as || "item", "item", "index", "key"]));
      return result;
    }
    for (const [key, child] of Object.entries(value)) if (!["var", "as"].includes(key) && !(key === "path" && typeof child === "string")) {
      validationExpressionVariables(child, result, local);
    }
  }
  return result;
}

export function validationExpressionReadTargets(value, result = new Set()) {
  if (Array.isArray(value)) value.forEach(item => validationExpressionReadTargets(item, result));
  else if (object(value)) {
    if (own(value, "literal")) return result;
    if (typeof value.var === "string") result.add(JSON.stringify(["var", value.var, own(value, "path") ? value.path : null]));
    else for (const source of sourceNames) if (typeof value[source] === "string") {
      result.add(JSON.stringify(["source", source, value[source]]));
    }
    for (const [key, child] of Object.entries(value)) if (!["var", "path", "model", "schema", "context"].includes(key)) {
      validationExpressionReadTargets(child, result);
    }
  }
  return result;
}

export function validationAssertionEditIssue(original, proposed, availableVariables = [], { allowReadTargetChange = false } = {}) {
  if (typeof proposed !== "boolean" && !(object(proposed) && booleanOperations.has(proposed.op))) {
    return "An assertion must be a boolean expression. Use a comparison or another boolean operation.";
  }
  const allowed = new Set(availableVariables);
  for (const name of validationExpressionVariables(proposed)) {
    if (!allowed.has(name)) return `$${name} is not available in this rule's scope.`;
  }
  const before = [...validationExpressionReadTargets(original)].sort();
  const after = [...validationExpressionReadTargets(proposed)].sort();
  if (!allowReadTargetChange && !sameValidationExpression(before, after)) {
    return "Changing the field this rule reads also requires editing its error path. Open the structured rule for that change.";
  }
  return null;
}
