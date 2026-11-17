// Generated from expression-dialog.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { ValidationExpressionInput } from "./expression-input.js";
import { parseValidationExpression, printableValidationExpression, sameValidationExpression, validationAssertionEditIssue, validationExpressionReadTargets, validationExpressionVariables } from "./expression-language.js";
const fieldsFor = (rule) => [{ pointer: `${rule.pointer}/assert`, field: "assert", value: rule.assertion, label: "Assertion", availableVariables: rule.availableVariables || [], isAssertion: true }, ...new Map((rule.controls || []).map((control) => [control.pointer, control])).values()];
const sameReads = (left, right) => sameValidationExpression([...validationExpressionReadTargets(left)].sort(), [...validationExpressionReadTargets(right)].sort());
function ValidationExpressionDialog({ model, commands }) {
  return /* @__PURE__ */ React.createElement("div", { className: "schema-validation-rules", "data-jsx-widget": "validation-expressions" }, !model.entry?.rules.length ? /* @__PURE__ */ React.createElement("p", null, "No checks currently match this field.") : model.entry.rules.map((rule, index) => /* @__PURE__ */ React.createElement("article", { className: "schema-validation-rule", key: rule.pointer }, /* @__PURE__ */ React.createElement("strong", null, rule.message || rule.label || "Validation check"), rule.generatedOwner ? /* @__PURE__ */ React.createElement("p", { className: "schema-validation-readonly" }, "Generated rule; edit its owning authoring table.") : null, /* @__PURE__ */ React.createElement("details", { className: "schema-validation-logic", open: true }, /* @__PURE__ */ React.createElement("summary", null, "Rule logic"), fieldsFor(rule).map((field) => {
    const printed = printableValidationExpression(field.value);
    return printed === null ? /* @__PURE__ */ React.createElement("code", { key: field.pointer }, JSON.stringify(field.value)) : /* @__PURE__ */ React.createElement(ValidationExpressionInput, { key: field.pointer, label: `Rule ${index + 1} ${field.label.toLowerCase()}`, value: model.raw[field.pointer] ?? printed, variables: field.availableVariables, readOnly: Boolean(rule.generatedOwner), onChange: (value) => commands.change(field.pointer, value) });
  }), /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: Boolean(model.rootConfirm[rule.pointer]), disabled: Boolean(rule.generatedOwner), onChange: (event) => commands.confirm(rule.pointer, event.target.checked) }), "Keep the root diagnostic location if the assertion reads a different field"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => commands.openStructured(rule) }, "Open structured rule"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: Boolean(rule.generatedOwner) || model.busy, onClick: () => commands.apply(rule) }, "Apply rule changes")))), model.status ? /* @__PURE__ */ React.createElement("p", { className: "schema-validation-dialog-status", role: "status" }, model.status) : null, model.error ? /* @__PURE__ */ React.createElement("p", { role: "alert" }, model.error) : null);
}
function createValidationExpressionDialog({ dialog, title, note, body, onApply, onOpenRule }) {
  let model = { entry: null, raw: {}, rootConfirm: {}, error: "", status: "", busy: false }, epoch = 0, mounted;
  const render = () => mounted.update({ model, commands });
  const commands = { change(pointer, value) {
    model = { ...model, raw: { ...model.raw, [pointer]: value }, error: "" };
    render();
  }, confirm(pointer, value) {
    model.rootConfirm[pointer] = value;
    render();
  }, openStructured(rule) {
    dialog.close();
    try {
      if (onOpenRule(rule) === false) throw new Error("Could not open this rule.");
    } catch (error) {
      model.error = error.message;
      dialog.showModal();
      render();
    }
  }, async apply(rule) {
    const version = epoch;
    try {
      const edits = [];
      for (const field of fieldsFor(rule)) {
        if (!Object.hasOwn(model.raw, field.pointer)) continue;
        const value = parseValidationExpression(model.raw[field.pointer]);
        const issue = field.isAssertion || ["if", "when"].includes(field.field) ? validationAssertionEditIssue(field.value, value, field.availableVariables || [], { allowReadTargetChange: true }) : [...validationExpressionVariables(value)].find((name) => !field.availableVariables?.includes(name));
        if (issue) throw new Error(issue);
        if (!sameValidationExpression(value, field.value)) edits.push({ pointer: field.pointer, original: field.value, value, field: field.field });
      }
      if (!edits.length) return;
      const assertion = edits.find((edit) => edit.field === "assert");
      if (assertion && !sameReads(rule.assertion, assertion.value) && !edits.some((edit) => fieldsFor(rule).find((field) => field.pointer === edit.pointer)?.diagnostic) && !model.rootConfirm[rule.pointer]) throw new Error("Edit its diagnostic path or collection selector, or confirm the root diagnostic location.");
      model.busy = true;
      render();
      const updated = await onApply({ rule, edits, entry: model.entry });
      if (version !== epoch || !dialog.open) return;
      model = { ...model, entry: { ...model.entry, rules: updated?.rules || [] }, raw: {}, status: "Rule changes applied. Save to write them to disk.", busy: false, error: "" };
    } catch (error) {
      model = { ...model, busy: false, error: error.message };
    }
    render();
  } };
  mounted = mountReactComponent(body, ValidationExpressionDialog, { model, commands });
  return { open(entry) {
    epoch++;
    model = { entry: { ...entry, rules: entry.rules.slice() }, raw: {}, rootConfirm: {}, error: "", status: "", busy: false };
    title.textContent = `${entry.label || "Validation"} \xB7 ${entry.rules.length}`;
    note.textContent = entry.note || "";
    note.hidden = !entry.note;
    render();
    dialog.showModal();
  }, snapshot: () => structuredClone(model), restore(value) {
    epoch++;
    model = structuredClone(value);
    render();
  }, dispose: () => mounted.dispose() };
}
export {
  ValidationExpressionDialog,
  createValidationExpressionDialog
};

//# sourceMappingURL=expression-dialog.js.map
