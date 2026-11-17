// Generated from settings-header.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
function SettingsHeader({ title = "Settings", draft = "saved" }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { id: "selection-title" }, title), /* @__PURE__ */ React.createElement("span", { className: "jsx-surface-state", "data-draft-state": draft, "aria-live": "polite" }, draft === "pending" ? "Pending draft" : draft === "unsaved" ? "Unsaved changes" : ""));
}
const mountSettingsHeader = (container, props) => mountReactComponent(container, SettingsHeader, props);
export {
  SettingsHeader,
  mountSettingsHeader
};

//# sourceMappingURL=settings-header.js.map
