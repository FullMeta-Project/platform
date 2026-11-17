// Generated from design-labels.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
function WidgetLabelsEditor({ view, onCommand }) {
  return /* @__PURE__ */ React.createElement("section", { className: "sd-widget-detail" }, /* @__PURE__ */ React.createElement("h3", null, view.heading), /* @__PURE__ */ React.createElement("div", { className: "sd-scan-setting-grid" }, view.labels.map(([key, caption]) => /* @__PURE__ */ React.createElement("label", { key }, caption, /* @__PURE__ */ React.createElement("input", { "aria-label": caption, type: "text", value: view.values[key] ?? "", onChange: (event) => onCommand({ type: "labels.change", key, value: event.target.value }, event) })))));
}
function createWidgetLabelsEditor(parent, current, { heading, labels = [] }) {
  const host = document.createElement("div");
  parent.append(host);
  let values = Object.fromEntries(labels.map(([key]) => [key, current.labels?.[key] ?? ""])), mount;
  const props = () => ({ view: { heading, labels, values }, onCommand(command, event) {
    event?.stopPropagation();
    if (command.type !== "labels.change" || !labels.some(([key]) => key === command.key)) throw new Error("Unknown label command.");
    values = { ...values, [command.key]: command.value };
    mount.update(props());
    host.dispatchEvent(new Event("input", { bubbles: true }));
  } });
  mount = mountReactComponent(host, WidgetLabelsEditor, props());
  return { element: host, applyTo(next) {
    const output = { ...next.labels || {} };
    for (const [key] of labels) {
      if (values[key].trim()) output[key] = values[key].trim();
      else delete output[key];
    }
    if (Object.keys(output).length) next.labels = output;
    else delete next.labels;
  }, dispose() {
    mount.dispose();
    host.remove();
  } };
}
export {
  WidgetLabelsEditor,
  createWidgetLabelsEditor
};

//# sourceMappingURL=design-labels.js.map
