// Generated from declarative-editor.jsx by scripts/build-frontend.mjs.
import React, { createRoot, flushSync } from "../shared/react/react-runtime.js";
import {
  createDeclarativeObligation,
  declarativeConstraintTypes,
  declarativeRuleSources,
  compileDeclarativeValidation,
  declarativeProgramState,
  programWithDeclarativeObligations,
  equivalentDeclarativeObligations,
  compareDeclarativeObligations
} from "./declarative-rules.js";
const clone = (value) => structuredClone(value);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const fieldOperand = () => ({ field: "" });
const defaultCondition = () => ({ type: "required", subject: fieldOperand() });
const descriptor = (type) => declarativeConstraintTypes.find((item) => item.type === type);
const operandMode = (value) => own(value || {}, "canonicalMap") ? "canonicalMap" : own(value || {}, "select") ? "select" : own(value || {}, "norm") ? "norm" : own(value || {}, "object") ? "object" : own(value || {}, "array") ? "array" : own(value || {}, "literal") ? "literal" : own(value || {}, "binding") ? "binding" : own(value || {}, "ancestor") ? "ancestor" : own(value || {}, "source") ? "source" : "field";
const nestedScopes = (record) => Array.isArray(record.scope?.nested) ? record.scope.nested : [];
const pointerPrefix = (record, before = Infinity) => [record.scope?.path || "", ...nestedScopes(record).slice(0, before).map((scope) => scope?.path || "")].join("");
function sortDeclarativeRows(records, direction = "original") {
  const rows = records.map((item, index) => ({ item, index }));
  if (direction === "original") return rows;
  const scope = (item) => object(item) ? `${item.scope?.source || ""}:${pointerPrefix(item)}` : "";
  return rows.sort((a, b) => (direction === "descending" ? -1 : 1) * scope(a.item).localeCompare(scope(b.item)) || a.index - b.index);
}
function Labeled({ label, children, hint }) {
  return /* @__PURE__ */ React.createElement("label", { className: "declarative-field" }, /* @__PURE__ */ React.createElement("span", null, label), children, hint ? /* @__PURE__ */ React.createElement("small", null, hint) : null);
}
function OperandFields({ label, value = fieldOperand(), path, record, commands, model, depth = 0 }) {
  if (depth > 16) return /* @__PURE__ */ React.createElement("p", null, "Structured operand nesting exceeds 16 levels.");
  const mode = operandMode(value), change = (next) => commands.setAt(record.id, path, next);
  const key = `${record.id}|${path}`;
  const scopeFilter = /^scope\.nested\.(\d+)\.when(?:\.|$)/.exec(path);
  const parentLevels = Math.min(16, nestedScopes(record).length + [...path.matchAll(/\.select\.(?:where|value)(?=\.|$)/g)].length);
  const subjectPrefix = path.startsWith("scope.when.") ? pointerPrefix(record, 0) : scopeFilter ? pointerPrefix(record, Number(scopeFilter[1]) + 1) : pointerPrefix(record);
  return /* @__PURE__ */ React.createElement("fieldset", { className: "declarative-operand" }, /* @__PURE__ */ React.createElement("legend", null, label), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} source` }, /* @__PURE__ */ React.createElement("select", { "aria-label": `${label} source`, value: mode, onChange: (event) => {
    const next = { ...value };
    for (const field of ["field", "source", "path", "literal", "binding", "ancestor", "object", "array", "norm", "select", "canonicalMap"]) delete next[field];
    change({ ...next, ...event.target.value === "literal" ? { literal: null } : event.target.value === "source" ? { source: "root", path: "" } : event.target.value === "binding" ? { binding: "", path: "" } : event.target.value === "ancestor" ? { ancestor: 1, path: "" } : event.target.value === "object" ? { object: {} } : event.target.value === "array" ? { array: [] } : event.target.value === "norm" ? { norm: { field: "" } } : event.target.value === "select" ? { select: { kind: "items", from: { field: "" } } } : event.target.value === "canonicalMap" ? { canonicalMap: { value: { field: "" }, omitValue: { literal: null } } } : { field: "" } });
    commands.clearLiteral(key);
  } }, /* @__PURE__ */ React.createElement("option", { value: "field" }, "Selected subject field"), /* @__PURE__ */ React.createElement("option", { value: "source" }, "Another source / path"), /* @__PURE__ */ React.createElement("option", { value: "binding" }, "Named check result"), parentLevels ? /* @__PURE__ */ React.createElement("option", { value: "ancestor" }, "Parent subject") : null, /* @__PURE__ */ React.createElement("option", { value: "literal" }, "Literal JSON value"), /* @__PURE__ */ React.createElement("option", { value: "object" }, "Object members"), /* @__PURE__ */ React.createElement("option", { value: "array" }, "Array items"), /* @__PURE__ */ React.createElement("option", { value: "norm" }, "Vector norm"), /* @__PURE__ */ React.createElement("option", { value: "select" }, "Select collection members"), /* @__PURE__ */ React.createElement("option", { value: "canonicalMap" }, "Map with default entries omitted"))), mode === "canonicalMap" ? /* @__PURE__ */ React.createElement(React.Fragment, null, ["value", "omitValue"].map((part) => /* @__PURE__ */ React.createElement(OperandFields, { key: part, label: `${label} ${part === "value" ? "map" : "omitted value"}`, value: value.canonicalMap[part], path: `${path}.canonicalMap.${part}`, record, commands, model, depth: depth + 1 }))) : null, mode === "select" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Labeled, { label: `${label} flatten one level`, hint: "Combine selected arrays in order; null contributes no items and a scalar contributes itself." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: value.select.flatten === true, onChange: (event) => change({ select: { ...value.select, flatten: event.target.checked } }) })), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} recursive children JSON Pointer`, hint: "Optional path relative to each member; include descendants in source order." }, /* @__PURE__ */ React.createElement("input", { value: value.select.childrenPath || "", onChange: (event) => {
    const query = { ...value.select };
    if (event.target.value) query.childrenPath = event.target.value;
    else delete query.childrenPath;
    change({ select: query });
  } })), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} require exactly one result`, hint: "Return the sole selected value, or null if none or several match." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: value.select.single === true, onChange: (event) => change({ select: { ...value.select, single: event.target.checked } }) })), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} collection kind` }, /* @__PURE__ */ React.createElement("select", { value: value.select.kind, onChange: (event) => change({ select: { ...value.select, kind: event.target.value } }) }, ["items", "keys", "values", "entries"].map((kind) => /* @__PURE__ */ React.createElement("option", { key: kind, value: kind }, kind)))), /* @__PURE__ */ React.createElement(OperandFields, { label: `${label} collection`, value: value.select.from, path: `${path}.select.from`, record, commands, model, depth: depth + 1 }), /* @__PURE__ */ React.createElement(ConditionFields, { label: `${label} member filter`, value: value.select.where, path: `${path}.select.where`, record, commands, model, depth: depth + 1 }), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} project a value` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: Boolean(value.select.value), onChange: (event) => {
    const query = { ...value.select };
    if (event.target.checked) query.value = { field: "" };
    else delete query.value;
    change({ select: query });
  } })), value.select.value ? /* @__PURE__ */ React.createElement(OperandFields, { label: `${label} selected value`, value: value.select.value, path: `${path}.select.value`, record, commands, model, depth: depth + 1 }) : null) : null, mode === "norm" ? /* @__PURE__ */ React.createElement(OperandFields, { label: `${label} vector`, value: value.norm, path: `${path}.norm`, record, commands, model, depth: depth + 1 }) : null, mode === "object" ? /* @__PURE__ */ React.createElement(React.Fragment, null, Object.entries(value.object || {}).map(([name, child], index) => /* @__PURE__ */ React.createElement("div", { key: index }, /* @__PURE__ */ React.createElement(Labeled, { label: `${label} member ${index + 1} name` }, /* @__PURE__ */ React.createElement("input", { value: name, onChange: (event) => {
    const next = event.target.value;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(next) && !["__proto__", "constructor", "prototype"].includes(next) && (next === name || !own(value.object, next))) change({ object: Object.fromEntries(Object.entries(value.object).map(([key2, item]) => [key2 === name ? next : key2, item])) });
  } })), /* @__PURE__ */ React.createElement(OperandFields, { label: `${label} ${name}`, value: child, path: `${path}.object.${name}`, record, commands, model, depth: depth + 1 }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => change({ object: Object.fromEntries(Object.entries(value.object).filter(([key2]) => key2 !== name)) }) }, "Remove member"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: Object.keys(value.object || {}).length >= 64, onClick: () => {
    let serial = 1;
    while (own(value.object || {}, `member${serial}`)) serial++;
    change({ object: { ...value.object, [`member${serial}`]: { literal: null } } });
  } }, "Add member")) : mode === "array" ? /* @__PURE__ */ React.createElement(React.Fragment, null, (value.array || []).map((child, index) => /* @__PURE__ */ React.createElement("div", { key: index }, /* @__PURE__ */ React.createElement(OperandFields, { label: `${label} item ${index + 1}`, value: child, path: `${path}.array.${index}`, record, commands, model, depth: depth + 1 }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => change({ array: value.array.filter((_, i) => i !== index) }) }, "Remove item"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: (value.array || []).length >= 64, onClick: () => change({ array: [...value.array, { literal: null }] }) }, "Add item")) : null, mode === "canonicalMap" || mode === "select" || mode === "norm" || mode === "object" || mode === "array" ? null : mode === "literal" ? /* @__PURE__ */ React.createElement(Labeled, { label: `${label} literal JSON` }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      "aria-label": `${label} literal JSON`,
      rows: 2,
      value: own(model.literalDrafts, key) ? model.literalDrafts[key] : JSON.stringify(value.literal, null, 2) ?? "null",
      onChange: (event) => commands.setLiteral(key, event.target.value),
      spellCheck: false
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, mode === "source" ? /* @__PURE__ */ React.createElement(Labeled, { label: `${label} explicit source` }, /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": `${label} explicit source`,
      value: value.source || "root",
      onChange: (event) => change({ ...value, source: event.target.value })
    },
    declarativeRuleSources.map((source) => /* @__PURE__ */ React.createElement("option", { key: source, value: source }, source))
  )) : null, mode === "binding" ? /* @__PURE__ */ React.createElement(Labeled, { label: `${label} result name`, hint: "Use the name declared by another semantic check; row order does not matter." }, /* @__PURE__ */ React.createElement("input", { "aria-label": `${label} result name`, value: value.binding || "", onChange: (event) => change({ ...value, binding: event.target.value }) })) : null, mode === "binding" ? /* @__PURE__ */ React.createElement(Labeled, { label: `${label} allow failed check result`, hint: "Read the result even if its check failed or was skipped. Handle null or errors explicitly." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: value.allowErrors === true, onChange: (event) => change({ ...value, allowErrors: event.target.checked }) })) : null, mode === "ancestor" ? /* @__PURE__ */ React.createElement(Labeled, { label: `${label} parent levels`, hint: "One means the immediate enclosing selection or subject." }, /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: parentLevels, "aria-label": `${label} parent levels`, value: value.ancestor ?? 1, onChange: (event) => change({ ...value, ancestor: Number(event.target.value) }) })) : null, /* @__PURE__ */ React.createElement(Labeled, { label: `${label} JSON Pointer`, hint: mode === "field" ? "Relative to the selected subject; empty reads the subject." : mode === "binding" ? "Relative to the named check result." : "Relative to the explicit source; * selects collection members." }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": `${label} JSON Pointer`,
      value: mode === "field" ? value.field ?? "" : value.path ?? "",
      onChange: (event) => change({ ...value, [mode === "field" ? "field" : "path"]: event.target.value })
    }
  )), mode !== "binding" && mode !== "ancestor" ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.pick(
    record,
    mode === "field" ? subjectPrefix : "",
    (selected) => change({ ...value, [mode === "field" ? "field" : "path"]: selected })
  ) }, "Choose ", label.toLowerCase(), " path\u2026") : null));
}
function ConstraintFields({ value, path, record, commands, model, prefix = "Requirement" }) {
  const info = descriptor(value?.type) || declarativeConstraintTypes[0];
  const change = (next) => commands.setAt(record.id, path, next);
  return /* @__PURE__ */ React.createElement("div", { className: "declarative-constraint-fields" }, /* @__PURE__ */ React.createElement(Labeled, { label: `${prefix} constraint type` }, /* @__PURE__ */ React.createElement("select", { "aria-label": `${prefix} constraint type`, value: value?.type || "required", onChange: (event) => {
    const next = { ...value, type: event.target.value }, chosen = descriptor(event.target.value);
    if (chosen.other && !next.other) next.other = { literal: null };
    if (!chosen.other) delete next.other;
    if (chosen.excluded && !next.excluded) next.excluded = { literal: null };
    if (!chosen.excluded) delete next.excluded;
    if (chosen.projection && typeof next.itemPath !== "string") next.itemPath = "/id";
    if (!chosen.projection) delete next.itemPath;
    if (chosen.omitMapValue) next.omitValue ??= "";
    else delete next.omitValue;
    if (chosen.aggregate) {
      next.countPath ??= "";
      next.collectionPath ??= "";
    } else {
      delete next.countPath;
      delete next.collectionPath;
    }
    if (!chosen.keyed) delete next.entryWhen;
    if (chosen.semantic) {
      next.check ||= "quantity";
      next.subjectInput ||= "value";
      next.inputs ||= [];
    } else {
      delete next.check;
      delete next.subjectInput;
      delete next.inputs;
      delete next.expose;
      delete next.gate;
    }
    for (const bound of ["minimum", "maximum"]) {
      if (chosen.bounds === bound || chosen.bounds === "range") {
        if (typeof next[bound] !== "number") next[bound] = 0;
      } else delete next[bound];
    }
    change(next);
  } }, declarativeConstraintTypes.filter((type) => prefix === "Requirement" || !type.semantic && !type.keyed).map((type) => /* @__PURE__ */ React.createElement("option", { key: type.type, value: type.type }, type.label)))), /* @__PURE__ */ React.createElement("div", { className: "declarative-operands" }, /* @__PURE__ */ React.createElement(OperandFields, { label: `${prefix} operand`, value: value?.subject, path: `${path}.subject`, record, commands, model }), info.other ? /* @__PURE__ */ React.createElement(OperandFields, { label: `${prefix} comparison`, value: value?.other, path: `${path}.other`, record, commands, model }) : null, info.excluded ? /* @__PURE__ */ React.createElement(OperandFields, { label: `${prefix} excluded collection`, value: value?.excluded, path: `${path}.excluded`, record, commands, model }) : null), info.projection ? /* @__PURE__ */ React.createElement(Labeled, { label: `${prefix} item field JSON Pointer`, hint: "Relative to each collection item; empty compares the complete item." }, /* @__PURE__ */ React.createElement("input", { "aria-label": `${prefix} item field JSON Pointer`, value: value?.itemPath ?? "", onChange: (event) => change({ ...value, itemPath: event.target.value }) })) : null, info.omitMapValue ? /* @__PURE__ */ React.createElement(Labeled, { label: `${prefix} omitted map value`, hint: "Entries with this text value are ignored when comparing maps; stored data is preserved." }, /* @__PURE__ */ React.createElement("input", { "aria-label": `${prefix} omitted map value`, value: value?.omitValue ?? "", onChange: (event) => change({ ...value, omitValue: event.target.value }) })) : null, info.aggregate ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Labeled, { label: "Item count JSON Pointer", hint: "Relative to each item; use this nonnegative integer when present." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Item count JSON Pointer", value: value?.countPath ?? "", onChange: (event) => change({ ...value, countPath: event.target.value }) })), /* @__PURE__ */ React.createElement(Labeled, { label: "Item collection JSON Pointer", hint: "Relative to each item; its size supplies the count when the count field is absent." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Item collection JSON Pointer", value: value?.collectionPath ?? "", onChange: (event) => change({ ...value, collectionPath: event.target.value }) }))) : null, info.keyed ? /* @__PURE__ */ React.createElement(ConditionFields, { value: value.entryWhen, path: `${path}.entryWhen`, record, commands, model, label: "Entry applicability" }) : null, info.semantic ? /* @__PURE__ */ React.createElement("fieldset", { className: "declarative-semantic-inputs" }, /* @__PURE__ */ React.createElement("legend", null, "Semantic check inputs"), /* @__PURE__ */ React.createElement(Labeled, { label: "Semantic check kind" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Semantic check kind", value: value.check || "quantity", onChange: (event) => change({ ...value, check: event.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "quantity" }, "Quantity"), /* @__PURE__ */ React.createElement("option", { value: "expression" }, "Expression"), /* @__PURE__ */ React.createElement("option", { value: "uniqueIds" }, "Unique IDs"), /* @__PURE__ */ React.createElement("option", { value: "rules" }, "Validation program"), /* @__PURE__ */ React.createElement("option", { value: "collection" }, "Collection relations"))), /* @__PURE__ */ React.createElement(Labeled, { label: "Program prerequisite", hint: "An unconditional root-scope check can stop later validation if it fails." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": "Program prerequisite", checked: value.gate === true, onChange: (event) => {
    const next = { ...value };
    if (event.target.checked) next.gate = true;
    else delete next.gate;
    change(next);
  } })), /* @__PURE__ */ React.createElement(Labeled, { label: "Reusable result name", hint: "Optional. Name an unconditional check result for this subject or its nested children; root results are available everywhere." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Reusable result name", value: value.expose || "", onChange: (event) => {
    const next = { ...value };
    if (event.target.value) next.expose = event.target.value;
    else delete next.expose;
    change(next);
  } })), /* @__PURE__ */ React.createElement(Labeled, { label: "Subject input name", hint: "The selected requirement operand supplies this named check input." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Subject input name", value: value.subjectInput || "", onChange: (event) => change({ ...value, subjectInput: event.target.value }) })), (value.inputs || []).map((input, index) => /* @__PURE__ */ React.createElement("div", { key: index }, /* @__PURE__ */ React.createElement(Labeled, { label: `Semantic input ${index + 1} name` }, /* @__PURE__ */ React.createElement("input", { "aria-label": `Semantic input ${index + 1} name`, value: input.name || "", onChange: (event) => change({ ...value, inputs: value.inputs.map((row, i) => i === index ? { ...row, name: event.target.value } : row) }) })), /* @__PURE__ */ React.createElement(OperandFields, { label: `Semantic input ${index + 1}`, value: input.operand, path: `${path}.inputs.${index}.operand`, record, commands, model }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => {
    commands.clearLiteralPrefix(`${record.id}|${path}.inputs`);
    change({ ...value, inputs: value.inputs.filter((_, i) => i !== index) });
  } }, "Remove semantic input"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => change({ ...value, inputs: [...value.inputs || [], { name: "", operand: { literal: null } }] }) }, "Add semantic input")) : null, ["minimum", "maximum"].filter((bound) => info.bounds === bound || info.bounds === "range").map((bound) => /* @__PURE__ */ React.createElement(Labeled, { key: bound, label: `${prefix} ${bound}` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      "aria-label": `${prefix} ${bound}`,
      value: value?.[bound] ?? "",
      step: /Count$|^countRange$/.test(value?.type) ? 1 : "any",
      min: /Count$|^countRange$/.test(value?.type) ? 0 : void 0,
      onChange: (event) => change({ ...value, [bound]: event.target.value === "" ? "" : Number(event.target.value) })
    }
  ))));
}
function ConditionFields({ value, path = "when", record, commands, model, depth = 0, label = "Applicability" }) {
  const kind = !value ? "none" : own(value, "all") ? "all" : own(value, "any") ? "any" : own(value, "not") ? "not" : "predicate";
  const change = (next) => commands.setAt(record.id, path, next);
  return /* @__PURE__ */ React.createElement("fieldset", { className: "declarative-condition" }, /* @__PURE__ */ React.createElement("legend", null, label), /* @__PURE__ */ React.createElement(Labeled, { label: `${label} condition` }, /* @__PURE__ */ React.createElement("select", { "aria-label": `${label} condition`, value: kind, onChange: (event) => {
    const selected = event.target.value;
    change(selected === "none" ? void 0 : selected === "predicate" ? defaultCondition() : selected === "not" ? { not: defaultCondition() } : { [selected]: [defaultCondition()] });
    commands.clearLiteralPrefix(`${record.id}|${path}`);
  } }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "Always applies"), /* @__PURE__ */ React.createElement("option", { value: "predicate" }, "When a requirement holds"), depth < 15 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("option", { value: "all" }, "When all conditions hold"), /* @__PURE__ */ React.createElement("option", { value: "any" }, "When any condition holds"), /* @__PURE__ */ React.createElement("option", { value: "not" }, "When a condition does not hold")) : null)), kind === "predicate" ? /* @__PURE__ */ React.createElement(ConstraintFields, { value, path, record, commands, model, prefix: label }) : null, kind === "not" ? /* @__PURE__ */ React.createElement(ConditionFields, { value: value.not, path: `${path}.not`, record, commands, model, depth: depth + 1, label: `${label} negated` }) : null, kind === "all" || kind === "any" ? /* @__PURE__ */ React.createElement(React.Fragment, null, (Array.isArray(value[kind]) ? value[kind] : []).map((child, index) => /* @__PURE__ */ React.createElement("div", { key: index, className: "declarative-condition-child" }, /* @__PURE__ */ React.createElement(ConditionFields, { value: child, path: `${path}.${kind}.${index}`, record, commands, model, depth: depth + 1, label: `${label} ${index + 1}` }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => {
    change({ ...value, [kind]: value[kind].filter((_, child2) => child2 !== index) });
    commands.clearLiteralPrefix(`${record.id}|${path}`);
  } }, "Remove condition"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => change({ ...value, [kind]: [...Array.isArray(value[kind]) ? value[kind] : [], defaultCondition()] }) }, "Add condition")) : null);
}
function DeclarativeView({ model, commands }) {
  const editorRef = React.useRef(null);
  const [comparisonId, setComparisonId] = React.useState("");
  const [generatedOpen, setGeneratedOpen] = React.useState(false);
  const [scopeSort, setScopeSort] = React.useState(
    /** @type {'original' | 'ascending' | 'descending'} */
    "original"
  );
  const record = model.records.find((item) => object(item) && item.id === model.selectedId), source = declarativeProgramState(model.original);
  let generated, diagnostic;
  try {
    generated = compileDeclarativeValidation(commands.materialize());
  } catch (error) {
    diagnostic = error.message;
  }
  const legacy = source.kind === "legacy" && model.original.rules?.length > 0 && !model.convertLegacy;
  const mismatch = ["stale", "invalid"].includes(source.kind) && !model.resolveStale;
  const equivalent = equivalentDeclarativeObligations(model.records);
  return /* @__PURE__ */ React.createElement("section", { className: "declarative-rule-authoring", "data-jsx-surface": "declarative-validation" }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("h3", null, "Declarative requirements"), /* @__PURE__ */ React.createElement("p", null, "One independent obligation per row. Select subjects and reusable predicates; traversal is generated. Stage names document the externally selected program boundary.")), /* @__PURE__ */ React.createElement("p", { className: "declarative-state", role: "status" }, "Target ", model.programKey, " \xB7 ", model.records.length, " obligations \xB7 ", legacy ? "Legacy program unchanged" : mismatch ? "Source/output mismatch needs review" : model.dirty ? "Edited authoring draft" : "No pending authoring changes"), equivalent.map((pair, index) => /* @__PURE__ */ React.createElement("p", { className: "declarative-feedback", role: "status", key: `${pair.first}-${pair.second}-${index}` }, "Requirements ", pair.first, " and ", pair.second, " have the same scope and predicate. Review their diagnostics before deciding whether both are needed.")), legacy ? /* @__PURE__ */ React.createElement("div", { className: "declarative-compatibility" }, /* @__PURE__ */ React.createElement("p", null, "This existing native program is preserved and can be inspected in Schema source. It will not be converted automatically. Starting a declarative replacement replaces its executable rules only after Preview and Apply."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: commands.startReplacement }, "Start declarative replacement")) : null, mismatch ? /* @__PURE__ */ React.createElement("div", { className: "declarative-compatibility" }, /* @__PURE__ */ React.createElement("p", null, "Authored records and generated output do not match, or records require correction. Review the source and generated candidate; Apply and Save must not silently overwrite a mismatch."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: source.diagnostics.some((item) => item.code === "unsupported-format"), onClick: commands.regenerate }, "Regenerate derived rules"), source.diagnostics.map((item, index) => /* @__PURE__ */ React.createElement("p", { key: index, role: "alert" }, item.path, ": ", item.message))) : null, /* @__PURE__ */ React.createElement("div", { className: "declarative-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button primary", disabled: legacy, onClick: () => commands.addRule() }, "Add rule"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: !model.dirty, onClick: commands.reset }, "Reset declarative draft")), model.records.length ? /* @__PURE__ */ React.createElement("div", { className: "declarative-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "schema-structure-table declarative-obligations-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Requirement"), /* @__PURE__ */ React.createElement("th", null, "Stage"), /* @__PURE__ */ React.createElement("th", { "aria-sort": scopeSort === "original" ? "none" : scopeSort }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "aria-label": "Sort by Subject scope", onClick: () => setScopeSort(scopeSort === "original" ? "ascending" : scopeSort === "ascending" ? "descending" : "original") }, "Subject scope", scopeSort === "ascending" ? " \u2191" : scopeSort === "descending" ? " \u2193" : "")), /* @__PURE__ */ React.createElement("th", null, "Predicate"), /* @__PURE__ */ React.createElement("th", null, "Diagnostic"), /* @__PURE__ */ React.createElement("th", null, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, sortDeclarativeRows(model.records, scopeSort).map(({ item, index }) => !object(item) ? /* @__PURE__ */ React.createElement("tr", { key: `invalid-${index}` }, /* @__PURE__ */ React.createElement("td", { colSpan: 5 }, "Malformed obligation at row ", index + 1, "; correct or explicitly remove this row."), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.removeRuleAt(index) }, "Delete malformed row"))) : /* @__PURE__ */ React.createElement("tr", { key: item.id || `row-${index}`, "aria-selected": item.id === model.selectedId }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => {
    commands.select(item.id);
    editorRef.current?.scrollIntoView?.({ block: "start", inline: "nearest" });
  } }, item.name || item.id), /* @__PURE__ */ React.createElement("code", null, item.id)), /* @__PURE__ */ React.createElement("td", null, item.stage), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("code", null, item.scope?.source, ":", pointerPrefix(item) || "(root)")), /* @__PURE__ */ React.createElement("td", null, descriptor(item.constraint?.type)?.label || item.constraint?.type), /* @__PURE__ */ React.createElement("td", null, item.diagnostic?.message), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", "aria-label": `Delete rule ${item.name || item.id}`, onClick: () => commands.removeRule(item.id) }, "Delete"))))))) : /* @__PURE__ */ React.createElement("p", { className: "schema-bulk-note" }, "Add a rule to state what must be true."), record && !legacy ? /* @__PURE__ */ React.createElement("section", { ref: editorRef, className: "declarative-record-editor", "aria-label": `Edit declarative rule ${record.id}` }, /* @__PURE__ */ React.createElement("div", { className: "declarative-form-grid" }, /* @__PURE__ */ React.createElement(Labeled, { label: "Rule identifier" }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Rule identifier", value: model.idDrafts[record.id] ?? record.id ?? "", onChange: (event) => commands.updateRule(record.id, { id: event.target.value }) })), /* @__PURE__ */ React.createElement(Labeled, { label: "Rule name" }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Rule name", value: record.name || "", onChange: (event) => commands.updateRule(record.id, { name: event.target.value }) })), /* @__PURE__ */ React.createElement(Labeled, { label: "Validation stage", hint: "All obligations in this target program share one externally selected stage." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Validation stage", value: record.stage || "", onChange: (event) => commands.updateRule(record.id, { stage: event.target.value }) })), /* @__PURE__ */ React.createElement(Labeled, { label: "Scope source" }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Scope source", value: record.scope?.source || "root", onChange: (event) => commands.updateRule(record.id, { scope: { ...record.scope, source: event.target.value } }) }, declarativeRuleSources.map((item) => /* @__PURE__ */ React.createElement("option", { key: item, value: item }, item)))), /* @__PURE__ */ React.createElement(Labeled, { label: "Subject scope JSON Pointer", hint: "Empty selects the source root once; * selects every collection item." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Subject scope JSON Pointer", value: record.scope?.path ?? "", onChange: (event) => commands.updateRule(record.id, { scope: { ...record.scope, path: event.target.value } }) })), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.pick(record, "", (path) => commands.updateRule(record.id, { scope: { ...record.scope, path } })) }, "Choose subject scope\u2026"), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": "Include recursive descendants", checked: own(record.scope || {}, "childrenPath"), onChange: (event) => {
    const scope = { ...record.scope };
    if (event.target.checked) scope.childrenPath = "/children/*";
    else delete scope.childrenPath;
    commands.updateRule(record.id, { scope });
  } }), " Include recursive descendants"), own(record.scope || {}, "childrenPath") ? /* @__PURE__ */ React.createElement(Labeled, { label: "Recursive child JSON Pointer", hint: "Relative to each visited subject; use * to visit collection items." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Recursive child JSON Pointer", value: record.scope.childrenPath, onChange: (event) => commands.updateRule(record.id, { scope: { ...record.scope, childrenPath: event.target.value } }) })) : null), /* @__PURE__ */ React.createElement(ConditionFields, { value: record.scope?.when, path: "scope.when", record, commands, model, label: "Subject scope filter" }), /* @__PURE__ */ React.createElement("fieldset", { className: "declarative-nested" }, /* @__PURE__ */ React.createElement("legend", null, "Nested subject relationships"), nestedScopes(record).map((scope, index) => /* @__PURE__ */ React.createElement("div", { className: "declarative-nested-row", key: index }, /* @__PURE__ */ React.createElement(Labeled, { label: `Nested scope ${index + 1} JSON Pointer`, hint: "Relative to each parent subject." }, /* @__PURE__ */ React.createElement("input", { "aria-label": `Nested scope ${index + 1} JSON Pointer`, value: scope?.path ?? "", onChange: (event) => commands.setNested(record.id, index, { ...scope, path: event.target.value }) })), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": `Include recursive descendants in nested scope ${index + 1}`, checked: own(scope || {}, "childrenPath"), onChange: (event) => {
    const next = { ...scope };
    if (event.target.checked) next.childrenPath = "/children/*";
    else delete next.childrenPath;
    commands.setNested(record.id, index, next);
  } }), " Include recursive descendants"), own(scope || {}, "childrenPath") ? /* @__PURE__ */ React.createElement(Labeled, { label: `Nested scope ${index + 1} recursive child JSON Pointer` }, /* @__PURE__ */ React.createElement("input", { "aria-label": `Nested scope ${index + 1} recursive child JSON Pointer`, value: scope.childrenPath, onChange: (event) => commands.setNested(record.id, index, { ...scope, childrenPath: event.target.value }) })) : null, /* @__PURE__ */ React.createElement(ConditionFields, { value: scope.when, path: `scope.nested.${index}.when`, record, commands, model, label: `Nested scope ${index + 1} filter` }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.pick(record, pointerPrefix(record, index), (path) => commands.setNested(record.id, index, { ...scope, path })) }, "Choose nested path\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.removeNested(record.id, index) }, "Remove nested scope"))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", disabled: nestedScopes(record).length >= 16, onClick: () => commands.addNested(record.id) }, "Add nested scope")), /* @__PURE__ */ React.createElement(ConstraintFields, { value: record.constraint, path: "constraint", record, commands, model }), /* @__PURE__ */ React.createElement("div", { className: "declarative-form-grid" }, /* @__PURE__ */ React.createElement(Labeled, { label: "Diagnostic JSON Pointer", hint: record.constraint?.type === "keyMatchesField" ? "Relative to each keyed entry; empty identifies the entry." : "Relative to the final subject, without wildcards; empty identifies the subject." }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Diagnostic JSON Pointer", value: record.diagnostic?.path ?? "", onChange: (event) => commands.updateRule(record.id, { diagnostic: { ...record.diagnostic, path: event.target.value } }) })), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => commands.pick(record, pointerPrefix(record), (path) => commands.updateRule(record.id, { diagnostic: { ...record.diagnostic, path } })) }, "Choose diagnostic path\u2026"), /* @__PURE__ */ React.createElement(Labeled, { label: "Diagnostic message" }, /* @__PURE__ */ React.createElement("input", { "aria-label": "Diagnostic message", value: record.diagnostic?.message || "", onChange: (event) => commands.updateRule(record.id, { diagnostic: { ...record.diagnostic, message: event.target.value } }) }))), /* @__PURE__ */ React.createElement(ConditionFields, { value: record.when, record, commands, model }), /* @__PURE__ */ React.createElement("fieldset", { className: "declarative-condition" }, /* @__PURE__ */ React.createElement("legend", null, "Compare requirements"), /* @__PURE__ */ React.createElement(Labeled, { label: "Compare with", hint: "Compares validation conditions and scope; diagnostics can differ." }, /* @__PURE__ */ React.createElement("select", { "aria-label": "Compare with", value: comparisonId, onChange: (event) => setComparisonId(event.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose another requirement"), model.records.filter((item) => object(item) && item.id !== record.id).map((item) => /* @__PURE__ */ React.createElement("option", { key: item.id, value: item.id }, item.name || item.id, " (", item.id, ")")))), comparisonId && model.records.some((item) => item?.id === comparisonId) ? /* @__PURE__ */ React.createElement("p", { role: "status" }, compareDeclarativeObligations(record, model.records.find((item) => item?.id === comparisonId)) === "equivalent" ? "Equivalent validation requirements. Review their diagnostic locations and messages." : "Cannot determine equivalence with the supported identities.") : null)) : null, model.feedback || diagnostic ? /* @__PURE__ */ React.createElement("p", { className: "declarative-feedback", role: "alert" }, model.feedback || diagnostic) : null, /* @__PURE__ */ React.createElement("details", { className: "declarative-generated", open: generatedOpen, onToggle: (event) => setGeneratedOpen(event.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", null, "Generated executable rules \xB7 read only"), generatedOpen ? /* @__PURE__ */ React.createElement("pre", null, generated ? JSON.stringify(generated, null, 2) : "Correct the authored record diagnostics to generate executable rules.") : null));
}
function createDeclarativeRuleAuthoring({ onChange = () => {
}, onError = () => {
}, pickPath, getProgramKey = () => "x-fullmeta-rules", renderView } = {}) {
  const element = renderView ? null : document.createElement("div");
  if (element) element.className = "declarative-rule-authoring-host";
  const root = element ? createRoot(element) : null;
  let model = {
    original: { maximumErrors: 80, rules: [] },
    records: [],
    selectedId: null,
    programKey: getProgramKey(),
    dirty: false,
    convertLegacy: false,
    resolveStale: false,
    literalDrafts: {},
    idDrafts: {},
    feedback: ""
  };
  let batchDepth = 0;
  const render = () => {
    if (batchDepth) return;
    return renderView ? renderView({ model, commands }) : flushSync(() => root.render(/* @__PURE__ */ React.createElement(DeclarativeView, { model, commands })));
  };
  const changed = () => {
    model = { ...model, dirty: true, feedback: "" };
    render();
    if (!batchDepth) onChange();
  };
  const find = (id) => {
    const record = model.records.find((record2) => object(record2) && record2.id === id);
    if (!record) throw new Error(`Rule ${id} is not in this draft.`);
    return record;
  };
  const replaceRecord = (id, next) => {
    const previous = find(id);
    for (const key of Object.keys(model.literalDrafts)) {
      if (!key.startsWith(`${id}|`)) continue;
      const parts = key.slice(id.length + 1).split(".");
      const before = parts.reduce((value, part) => value?.[part], previous), after = parts.reduce((value, part) => value?.[part], next);
      if (JSON.stringify(before) !== JSON.stringify(after)) delete model.literalDrafts[key];
    }
    model.records = model.records.map((record) => object(record) && record.id === id ? next : record);
    if (model.selectedId === id) model.selectedId = next.id;
    changed();
  };
  const fail = (error) => {
    model.feedback = error.message || String(error);
    render();
    onError(error);
  };
  const commands = {
    materialize() {
      const records = clone(model.records);
      for (const record of records) {
        if (!object(record)) continue;
        for (const [key, text] of Object.entries(model.literalDrafts)) {
          if (!key.startsWith(`${record.id}|`)) continue;
          const parts = key.slice(record.id.length + 1).split(".");
          const operand = parts.reduce((value, part) => value?.[part], record);
          if (!object(operand) || !own(operand, "literal")) continue;
          try {
            operand.literal = JSON.parse(text);
          } catch {
            throw new Error(`Rule ${record.id}, ${parts.join(".")}: literal must be valid JSON.`);
          }
        }
        if (own(model.idDrafts, record.id)) record.id = model.idDrafts[record.id];
      }
      return records;
    },
    select(id) {
      find(id);
      model.selectedId = id;
      render();
    },
    addRule(overrides = {}) {
      const state = declarativeProgramState(model.original);
      if (state.kind === "legacy" && model.original.rules?.length && !model.convertLegacy)
        throw new Error("Choose Start declarative replacement before replacing a legacy program.");
      let serial = model.records.length + 1;
      while (model.records.some((item) => object(item) && (item.id === `requirement_${serial}` || model.idDrafts[item.id] === `requirement_${serial}`))) serial++;
      const record = createDeclarativeObligation({ id: `requirement_${serial}`, name: `Requirement ${serial}`, stage: model.records[0]?.stage || "model", ...overrides });
      model.records = [...model.records, record];
      model.selectedId = record.id;
      changed();
      return clone(record);
    },
    updateRule(id, patch) {
      const record = find(id), updates = clone(patch);
      if (own(updates, "id")) {
        model.idDrafts = { ...model.idDrafts, [id]: updates.id };
        delete updates.id;
      }
      replaceRecord(id, { ...record, ...updates });
    },
    removeRule(id) {
      find(id);
      model.records = model.records.filter((record) => !object(record) || record.id !== id);
      model.selectedId = model.records.find(object)?.id || null;
      changed();
    },
    removeRuleAt(index) {
      model.records = model.records.filter((_, row) => row !== index);
      model.selectedId = model.records.find(object)?.id || null;
      changed();
    },
    setAt(id, path, value) {
      const record = clone(find(id)), parts = path.split(".");
      let target = record;
      for (const part of parts.slice(0, -1)) target = target[part];
      if (value === void 0) delete target[parts.at(-1)];
      else target[parts.at(-1)] = clone(value);
      replaceRecord(id, record);
    },
    setLiteral(key, value) {
      model.literalDrafts = { ...model.literalDrafts, [key]: value };
      changed();
    },
    clearLiteral(key) {
      if (own(model.literalDrafts, key)) {
        delete model.literalDrafts[key];
        render();
      }
    },
    clearLiteralPrefix(prefix) {
      for (const key of Object.keys(model.literalDrafts)) if (key.startsWith(prefix)) delete model.literalDrafts[key];
      render();
    },
    addNested(id) {
      const record = find(id);
      commands.updateRule(id, { scope: { ...record.scope, nested: [...nestedScopes(record), { path: "" }] } });
    },
    setNested(id, index, value) {
      const record = find(id);
      commands.updateRule(id, { scope: { ...record.scope, nested: nestedScopes(record).map((scope, row) => row === index ? value : scope) } });
    },
    removeNested(id, index) {
      const record = find(id);
      commands.updateRule(id, { scope: { ...record.scope, nested: nestedScopes(record).filter((_, row) => row !== index) } });
    },
    pick(record, prefix, apply) {
      if (!pickPath) {
        fail(new Error("The host has no path picker; enter a JSON Pointer directly."));
        return;
      }
      pickPath({ representation: "dataPointer", onPick: (picked) => {
        const path = picked.dataPointer;
        if (typeof path !== "string") return;
        if (prefix && path !== prefix && !path.startsWith(`${prefix}/`)) {
          fail(new Error("Choose a path inside the selected subject, or enter its relative JSON Pointer directly."));
          return;
        }
        apply(prefix ? path.slice(prefix.length) : path);
      } });
    },
    startReplacement() {
      model.convertLegacy = true;
      model.records = [];
      model.selectedId = null;
      changed();
    },
    regenerate() {
      model.resolveStale = true;
      changed();
    },
    reset() {
      api.load(model.original, { programKey: model.programKey });
      onChange();
    }
  };
  const api = {
    element,
    load(program, { programKey = getProgramKey() } = {}) {
      const original = object(program) ? clone(program) : { maximumErrors: 80, rules: [] };
      const state = declarativeProgramState(original, { programKey });
      model = {
        original,
        records: clone(state.obligations),
        selectedId: state.obligations[0]?.id || null,
        programKey,
        dirty: false,
        convertLegacy: false,
        resolveStale: false,
        literalDrafts: {},
        idDrafts: {},
        feedback: ""
      };
      render();
    },
    read() {
      try {
        const state = declarativeProgramState(model.original, { programKey: model.programKey });
        if (!model.dirty && state.kind === "legacy") return clone(model.original);
        return programWithDeclarativeObligations(model.original, commands.materialize(), {
          programKey: model.programKey,
          convertLegacy: model.convertLegacy,
          resolveStale: model.resolveStale
        });
      } catch (error) {
        fail(error);
        throw error;
      }
    },
    isDirty: () => model.dirty,
    reset: commands.reset,
    addRule: commands.addRule,
    updateRule: commands.updateRule,
    removeRule: commands.removeRule,
    applyRuleBatch({ add = [], update = [], remove = [] } = {}) {
      const before = clone(model), ids = [];
      batchDepth++;
      try {
        for (const id of remove) commands.removeRule(id);
        for (const change of update) commands.updateRule(change.id, change.patch);
        for (const record of add) ids.push(commands.addRule(record).id);
        programWithDeclarativeObligations(model.original, commands.materialize(), { programKey: model.programKey, convertLegacy: model.convertLegacy, resolveStale: model.resolveStale });
      } catch (error) {
        model = before;
        throw error;
      } finally {
        batchDepth--;
        render();
      }
      onChange();
      return { added: ids, updated: update.map((change) => change.id), removed: [...remove] };
    },
    selectRule: commands.select,
    startReplacement: commands.startReplacement,
    regenerate: commands.regenerate,
    snapshot: () => ({ format: "fullmeta-declarative-authoring-state/1", ...clone(model) }),
    restore(snapshot) {
      if (snapshot?.format !== "fullmeta-declarative-authoring-state/1" || !object(snapshot.original) || !Array.isArray(snapshot.records)) throw new Error("Invalid declarative authoring state.");
      const { format, ...restored } = clone(snapshot);
      model = { ...restored, idDrafts: restored.idDrafts || {}, literalDrafts: restored.literalDrafts || {} };
      render();
      onChange();
    },
    dispose() {
      if (root) flushSync(() => root.unmount());
    }
  };
  render();
  return api;
}
export {
  DeclarativeView,
  createDeclarativeRuleAuthoring,
  sortDeclarativeRows
};

//# sourceMappingURL=declarative-editor.js.map
