// Generated from default-editor.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
function QuantityVectorDefaultEditor({ view, onCommand }) {
  const { row, values, present, open, commonExpression, commonUnit } = view;
  return /* @__PURE__ */ React.createElement("div", { className: "schema-vector-default" }, /* @__PURE__ */ React.createElement("div", { className: "schema-vector-default-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => onCommand({ type: "vector.open" }) }, present ? "Edit component defaults" : "Set component defaults"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => onCommand({ type: "vector.clear" }) }, "Clear default"), /* @__PURE__ */ React.createElement("span", { className: "settings-empty" }, present ? values.length + " component values" : "No default")), /* @__PURE__ */ React.createElement("div", { className: "schema-vector-default-editor", hidden: !open }, /* @__PURE__ */ React.createElement("div", { className: "schema-vector-default-common" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: commonExpression,
      "aria-label": row.key + " expression for all components",
      placeholder: "Expression for all",
      onChange: (event) => onCommand({ type: "vector.common", key: "commonExpression", value: event.target.value })
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: commonUnit,
      "aria-label": row.key + " unit for all components",
      placeholder: "Unit for all",
      onChange: (event) => onCommand({ type: "vector.common", key: "commonUnit", value: event.target.value })
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "button", onClick: () => onCommand({ type: "vector.fill" }) }, "Fill all rows")), /* @__PURE__ */ React.createElement("table", { className: "schema-vector-default-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Component"), /* @__PURE__ */ React.createElement("th", null, "Expression"), /* @__PURE__ */ React.createElement("th", null, "Unit"))), /* @__PURE__ */ React.createElement("tbody", null, values.map((value, index) => {
    const label = typeof row.vectorLabels?.[index] === "string" && row.vectorLabels[index].trim() ? row.vectorLabels[index] : "Component " + (index + 1);
    return /* @__PURE__ */ React.createElement("tr", { key: index }, /* @__PURE__ */ React.createElement("td", null, label), ["expression", "unit"].map((key) => /* @__PURE__ */ React.createElement("td", { key }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: value[key],
        "aria-label": row.key + " " + label + " " + key,
        onChange: (event) => onCommand({ type: "vector.value", index, key, value: event.target.value })
      }
    ))));
  })))));
}
function mountQuantityVectorDefaultEditor({ cell, row, control }) {
  const count = Number(row.itemCount), current = row.defaultValue;
  if (!Number.isInteger(count) || count < 1 || count > 64 || current !== void 0 && (!Array.isArray(current) || current.length !== count || current.some((value) => value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => key !== "expression" && key !== "unit") || typeof value.expression !== "string" || typeof value.unit !== "string"))) return false;
  control.type = "hidden";
  const host = document.createElement("div");
  cell.append(host);
  let view = {
    row,
    values: current ? structuredClone(current) : Array.from({ length: count }, () => ({ expression: "", unit: "" })),
    present: current !== void 0,
    open: false,
    commonExpression: "",
    commonUnit: ""
  }, mount;
  const sync = () => {
    control.value = view.present ? JSON.stringify(view.values.map((value) => ({ expression: value.expression.trim(), unit: value.unit.trim() }))) : "";
  };
  const onCommand = (command) => {
    view = { ...view, values: view.values.map((value) => ({ ...value })) };
    if (command.type === "vector.open") view.open = !view.open;
    else if (command.type === "vector.clear") {
      view.present = false;
      view.open = false;
    } else if (command.type === "vector.common") view[command.key] = command.value;
    else if (command.type === "vector.value") {
      view.values[command.index][command.key] = command.value;
      view.present = true;
    } else if (command.type === "vector.fill") {
      if (!view.commonExpression.trim() || !view.commonUnit.trim()) return;
      view.values = view.values.map(() => ({ expression: view.commonExpression.trim(), unit: view.commonUnit.trim() }));
      view.present = true;
    } else throw new Error("Unknown vector default command " + command.type);
    sync();
    mount.update({ view, onCommand });
    if (["vector.clear", "vector.value", "vector.fill"].includes(command.type)) control.dispatchEvent(new Event("input", { bubbles: true }));
  };
  mount = mountReactComponent(host, QuantityVectorDefaultEditor, { view, onCommand });
  return {
    update(next) {
      view = { ...view, ...next };
      sync();
      mount.update({ view, onCommand });
    },
    snapshot: () => structuredClone(view),
    dispose() {
      mount.dispose();
      host.remove();
    }
  };
}
export {
  QuantityVectorDefaultEditor,
  mountQuantityVectorDefaultEditor
};

//# sourceMappingURL=default-editor.js.map
