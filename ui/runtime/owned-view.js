// Generated from owned-view.jsx by scripts/build-frontend.mjs.
import React from "../widgets/shared/react/react-runtime.js";
import { mountReactComponent, disposeReactChildren } from "../widgets/shared/react/mount.js";
const surfaces = /* @__PURE__ */ new WeakMap();
const retainedNodes = /* @__PURE__ */ new WeakMap();
function retainOwnedNodes(container, nodes) {
  retainedNodes.set(container, nodes.filter(Boolean));
}
function joinView(children, separator = "") {
  const items = (Array.isArray(children) ? children.flat(Infinity) : [children]).filter((child) => child !== null && child !== void 0 && typeof child !== "boolean");
  return items.map((child, index) => /* @__PURE__ */ React.createElement(React.Fragment, { key: React.isValidElement(child) && child.key !== null ? child.key : index }, index ? separator : null, child));
}
function OwnedView({ children }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, children);
}
function renderOwnedView(container, children) {
  const retain = retainedNodes.get(container) || [];
  disposeReactChildren(container, { retain });
  for (const node of retain) if (container.contains(node)) node.remove();
  let mount = surfaces.get(container);
  if (mount && mount.inspect().mounted) mount.update({ children });
  else {
    mount = mountReactComponent(container, OwnedView, { children });
    surfaces.set(container, mount);
  }
  return mount;
}
export {
  joinView,
  renderOwnedView,
  retainOwnedNodes
};

//# sourceMappingURL=owned-view.js.map
