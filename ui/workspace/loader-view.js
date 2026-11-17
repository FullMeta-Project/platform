// Generated from loader-view.jsx by scripts/build-frontend.mjs.
import React from "../widgets/shared/react/react-runtime.js";
import { mountReactComponent } from "../widgets/shared/react/mount.js";
function LoaderFailure({ message }) {
  return /* @__PURE__ */ React.createElement("p", { role: "alert" }, "Could not open the editor: ", message);
}
const mountLoaderFailure = (container, message) => mountReactComponent(container, LoaderFailure, { message });
export {
  LoaderFailure,
  mountLoaderFailure
};

//# sourceMappingURL=loader-view.js.map
