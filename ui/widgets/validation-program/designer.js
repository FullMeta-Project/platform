// Generated from designer.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { discoverPrograms, semanticAssertions, countRules, pathsRelated } from "./program-projection.js";
import { semanticAssertions as semanticAssertions2 } from "./program-projection.js";
const pointer = (parts) => "#/" + parts.map((part) => String(part).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
const get = (value, target) => target.replace(/^#\/?/, "").split("/").filter(Boolean).map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~")).reduce((at, part) => at?.[part], value);
const assertionCache = /* @__PURE__ */ new WeakMap();
function cachedAssertions(program) {
  const declaration = program?.declaration;
  if (!declaration || typeof declaration !== "object") return semanticAssertions(program);
  let assertions = assertionCache.get(declaration);
  if (!assertions) {
    assertions = semanticAssertions(program);
    assertionCache.set(declaration, assertions);
  }
  return assertions;
}
function ruleRows(program) {
  const rows = [];
  const walk = (rules, path, depth) => (rules || []).forEach((rule, index) => {
    const current = [...path, index];
    rows.push({ pointer: pointer(current), label: rule.message || rule.let || rule.check || `Rule ${index + 1}`, depth });
    if (rule.rules) walk(rule.rules, [...current, "rules"], depth + 1);
    for (const key of ["then", "else"]) if (rule[key]) walk(rule[key], [...current, key], depth + 1);
  });
  walk(program.declaration.rules, [program.key, "rules"], 0);
  return rows;
}
function ValidationProgramSection({ program, model, commands }) {
  const [expanded, setExpanded] = React.useState(false);
  const rows = expanded ? ruleRows(program) : [];
  return /* @__PURE__ */ React.createElement("details", { onToggle: (event) => setExpanded(event.currentTarget.open) }, /* @__PURE__ */ React.createElement("summary", { onClick: () => commands.select(program.file, program.pointer), "aria-current": model.selected?.file === program.file && model.selected?.pointer === program.pointer }, program.label, " \xB7 ", program.declaration.rules.length, " top-level rules"), rows.map((row) => /* @__PURE__ */ React.createElement("div", { key: row.pointer, className: "vp-tree-row", style: { paddingLeft: `${row.depth}em` } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "vp-tree-select", "aria-current": model.selected?.file === program.file && model.selected?.pointer === row.pointer, onClick: () => commands.select(program.file, row.pointer) }, row.label))));
}
function ValidationDesignerTree({ model, commands }) {
  return /* @__PURE__ */ React.createElement("div", { className: "vp-tree" }, model.programs.filter((program) => !model.search || JSON.stringify(program.declaration).toLowerCase().includes(model.search.toLowerCase()) || program.label.toLowerCase().includes(model.search.toLowerCase())).map((program) => /* @__PURE__ */ React.createElement(ValidationProgramSection, { key: `${program.file}|${program.pointer}`, program, model, commands })));
}
function ValidationDesignerSettings({ model }) {
  return model.draft ? /* @__PURE__ */ React.createElement("section", { className: "vp-editor" }, /* @__PURE__ */ React.createElement("h3", null, model.selected.label), /* @__PURE__ */ React.createElement("p", null, model.derived ? "Derived rules are read only. Edit the declarative records in Validation requirements." : "Existing native rules are preserved and read only here. Use Validation requirements for declarative authoring."), /* @__PURE__ */ React.createElement("pre", null, JSON.stringify(model.value, null, 2))) : /* @__PURE__ */ React.createElement("p", null, "Select a validation program or rule to inspect its declaration.");
}
function createValidationProgramDesigner({ treeParent = null, settingsParent, onApply = () => {
}, onSelection = () => {
} }) {
  let sources = [], model = { programs: [], selected: null, search: "", draft: null, value: null, derived: false, error: "" }, treeMount, settingsMount;
  const render = () => {
    treeMount?.update({ model, commands });
    settingsMount?.update({ model, commands });
  };
  const selectAt = (file, target) => {
    const program = model.programs.find((program2) => program2.file === file && (target === program2.pointer || target.startsWith(program2.pointer + "/")));
    if (!program) return false;
    const value = get(program.source.value, target);
    if (value === void 0) return false;
    const selected = { file, pointer: target, label: target === program.pointer ? program.label : "Validation rule", kind: "validation", programKey: program.key };
    model = { ...model, selected, value, draft: true, derived: Object.hasOwn(program.declaration, "declarative"), error: "" };
    onSelection(selected);
    render();
    return true;
  };
  const commands = { select: selectAt };
  if (treeParent) treeMount = mountReactComponent(treeParent, ValidationDesignerTree, { model, commands });
  if (settingsParent) settingsMount = mountReactComponent(settingsParent, ValidationDesignerSettings, { model, commands });
  return { update(next) {
    sources = next || [];
    model.programs = discoverPrograms(sources);
    const selected = model.selected;
    if (selected && !selectAt(selected.file, selected.pointer)) {
      model = { ...model, selected: null, draft: null, value: null, derived: false, error: "" };
      onSelection(null);
      render();
    } else if (!selected) {
      model.value = null;
      model.draft = null;
      render();
    }
  }, render, renderTree(search = "") {
    model.search = String(search);
    render();
    return model.programs.reduce((sum, program) => sum + countRules(program.declaration.rules), 0);
  }, rulesForBinding(binding, input = sources) {
    if (!Array.isArray(binding)) return [];
    const target = binding.map(String);
    return discoverPrograms(input).flatMap((program) => cachedAssertions(program).filter((rule) => rule.readPaths.some((path) => pathsRelated(target, path))));
  }, listPrograms(input = sources) {
    return discoverPrograms(input).map((program) => ({ file: program.file, pointer: program.pointer, key: program.key, label: program.label, topLevelRules: program.declaration.rules.length, ruleCount: countRules(program.declaration.rules) }));
  }, revealSelected() {
    treeParent?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: "center" });
  }, selectAt, selectProgramAt: selectAt, selectRuleAt: selectAt, dispose() {
    treeMount?.dispose();
    settingsMount?.dispose();
  } };
}
export {
  ValidationDesignerSettings,
  ValidationDesignerTree,
  createValidationProgramDesigner,
  semanticAssertions2 as semanticAssertions
};

//# sourceMappingURL=designer.js.map
