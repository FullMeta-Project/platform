// Generated from schema-authoring-workflow.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
function schemaAuthoringWorkflowState({
  dirty = false,
  jsonDirty = false,
  settingsDirty = false,
  renamePending = false,
  saving = false,
  validating = false,
  validation = null
} = {}) {
  const save = saving ? "Saving\u2026" : renamePending ? "Tree rename pending \xB7 Enter to apply or Escape to cancel" : jsonDirty ? "JSON draft pending Apply" : settingsDirty ? "Settings draft pending Apply" : dirty ? "Applied edits \xB7 unsaved" : "Saved";
  const validationLabel = validating ? "Validation running\u2026" : !validation ? "Validate not run" : !validation.current || jsonDirty || settingsDirty || renamePending ? "Validation is out of date" : validation.error ? "Validation failed" : validation.errors ? `Validation: ${validation.errors} issue(s)` : "Validation passed";
  return {
    save,
    validation: validationLabel,
    detail: validation?.summary || "Use Validate to check the current document.",
    kind: validating ? "pending" : validationLabel === "Validation passed" ? "good" : validation?.current && (validation.error || validation.errors) ? "error" : "pending"
  };
}
function SchemaAuthoringWorkflowIndicator({ ready }) {
  return /* @__PURE__ */ React.createElement("p", { "data-schema-authoring-workflow": "", "data-state": ready ? "ready" : "pending", className: "schema-authoring-dialog-workflow", role: "status" }, ready ? "Preview ready \xB7 Apply updates the draft. Save persists it. Validate checks the current document." : "Pending preview \xB7 Preview before Apply. Save and Validate remain separate.");
}
function observeSchemaAuthoringDialogs({ document, enabled, onChange = () => {
} }) {
  let queued = false, disposed = false;
  const surfaces = /* @__PURE__ */ new Map();
  const refresh = () => {
    queued = false;
    if (disposed) return;
    for (const [dialog, entry] of surfaces) if (!dialog.isConnected || !entry.host.isConnected) {
      entry.mount.dispose();
      entry.host.remove();
      surfaces.delete(dialog);
    }
    if (!enabled()) return;
    for (const dialog of document.querySelectorAll("dialog.schema-bulk-dialog[open]")) {
      const content = dialog.querySelector(".schema-bulk-content");
      if (!content) continue;
      const footer = content.querySelector(":scope > footer"), buttons = [...(footer || content).querySelectorAll("button")], preview = buttons.find((button) => /^Preview(?:\b|…)/.test(button.textContent.trim())), apply = buttons.find((button) => /^Apply(?:\b|…)/.test(button.textContent.trim()));
      if (!preview || !apply) continue;
      const ready = !apply.disabled;
      let entry = surfaces.get(dialog);
      if (!entry) {
        const host = document.createElement("div");
        host.dataset.schemaAuthoringWorkflowHost = "";
        content.querySelector("header")?.after(host);
        entry = { host, ready, mount: mountReactComponent(host, SchemaAuthoringWorkflowIndicator, { ready }) };
        surfaces.set(dialog, entry);
      } else if (entry.ready !== ready) {
        entry.ready = ready;
        entry.mount.update({ ready });
      }
    }
    onChange();
  };
  const schedule = () => {
    if (!queued && !disposed) {
      queued = true;
      queueMicrotask(refresh);
    }
  };
  const observer = new MutationObserver((records) => {
    if (records.some((record) => !(record.target instanceof Element && record.target.closest("[data-schema-authoring-workflow-host]")) && (record.target instanceof Element && record.target.closest("dialog.schema-bulk-dialog") || [...record.addedNodes].some((node) => node instanceof Element && node.matches("dialog.schema-bulk-dialog"))))) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "disabled", "hidden"] });
  const event = (event2) => {
    if (event2.target.closest?.("dialog.schema-bulk-dialog")) schedule();
  };
  for (const type of ["input", "change", "click", "close"]) document.addEventListener(type, event, true);
  schedule();
  return { refresh: schedule, dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const type of ["input", "change", "click", "close"]) document.removeEventListener(type, event, true);
    for (const entry of surfaces.values()) {
      entry.mount.dispose();
      entry.host.remove();
    }
    surfaces.clear();
  } };
}
export {
  SchemaAuthoringWorkflowIndicator,
  observeSchemaAuthoringDialogs,
  schemaAuthoringWorkflowState
};

//# sourceMappingURL=schema-authoring-workflow.js.map
