// Generated from schema-design-row-controls.jsx by scripts/build-frontend.mjs.
import React from "./react/react-runtime.js";
import { mountReactComponent } from "./react/mount.js";
import { createQuantityValueControl } from "./quantity-value-control.js";
function SchemaDesignRowControl({ kind, draft, label = "", onChange, disabled = false }) {
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      type: kind === "checkbox" ? "checkbox" : kind === "number" ? "number" : "text",
      "aria-label": label || void 0,
      disabled,
      ...kind === "checkbox" ? { checked: draft === true } : { value: draft },
      onChange: (event) => onChange(kind === "checkbox" ? event.target.checked : event.target.value, event)
    }
  );
}
function createSchemaDesignRowControl(name, options = {}) {
  if (name === "quantityValue") {
    const quantity = createQuantityValueControl(options);
    return {
      element: quantity.element,
      read: quantity.value,
      clear: quantity.clear,
      isComplete: () => !!quantity.value().expression.trim(),
      snapshot: quantity.snapshot,
      dispose: quantity.dispose
    };
  }
  if (!["checkbox", "text", "number"].includes(name)) throw new Error("Unsupported schema design row control: " + name);
  let draft = name === "checkbox" ? options.value === true : name === "number" ? typeof options.value === "number" && Number.isFinite(options.value) ? String(options.value) : "" : typeof options.value === "string" ? options.value : "", mount;
  const element = document.createElement("span");
  const props = () => ({ kind: name, draft, label: options.label, onChange(next, event) {
    draft = next;
    mount.update(props());
    options.onInput?.(event);
  } });
  mount = mountReactComponent(element, SchemaDesignRowControl, props());
  return {
    element,
    read: () => name === "checkbox" ? draft === true : name === "number" ? draft === "" ? null : Number(draft) : draft,
    clear() {
      draft = name === "checkbox" ? false : "";
      mount.update(props());
      options.onInput?.();
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    isComplete: () => name === "checkbox" || String(draft).trim() !== "" && (name !== "number" || Number.isFinite(Number(draft))),
    snapshot: () => draft,
    dispose: () => mount.dispose()
  };
}
export {
  SchemaDesignRowControl,
  createSchemaDesignRowControl
};

//# sourceMappingURL=schema-design-row-controls.js.map
