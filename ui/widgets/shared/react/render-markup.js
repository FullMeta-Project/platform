// Generated from render-markup.jsx by scripts/build-frontend.mjs.
import React, { renderWidgetMarkup } from "./react-runtime.js";
function renderLegacyWidgetMarkup(Component, props, recursiveKeys = ["renderField", "renderObject"]) {
  const replacements = [];
  const salt = globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2);
  const adapted = { ...props };
  for (const key of recursiveKeys) if (typeof props[key] === "function") {
    adapted[key] = (...args) => {
      const value = props[key](...args);
      if (typeof value !== "string") return value;
      if (!value) return null;
      const token = `FULLMETA_SERIALIZED_SLOT_${salt}_${replacements.length}_END`;
      replacements.push([token, value]);
      return token;
    };
  }
  let result = renderWidgetMarkup(/* @__PURE__ */ React.createElement(Component, { ...adapted }));
  for (const [token, markup] of replacements) result = result.replaceAll(token, () => markup);
  return result;
}
export {
  renderLegacyWidgetMarkup
};

//# sourceMappingURL=render-markup.js.map
