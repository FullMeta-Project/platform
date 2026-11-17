// Generated from document-views.jsx by scripts/build-frontend.mjs.
import React from "../../shared/react/react-runtime.js";
import { renderOwnedView } from "../../../runtime/owned-view.js";
function renderNewModelChoices(host, choices) {
  return renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, choices.map((choice) => /* @__PURE__ */ React.createElement("option", { key: choice.id, value: choice.id }, choice.label || choice.id))));
}
function renderMatchingModels(host, matches, onChoose) {
  return renderOwnedView(host, /* @__PURE__ */ React.createElement(React.Fragment, null, matches.map((match, index) => /* @__PURE__ */ React.createElement("button", { key: typeof match === "string" ? match : match.folder + "/" + match.file + "/" + index, type: "button", className: "button", onClick: () => onChoose(match) }, typeof match === "string" ? match : match.folder === "." ? match.file : `${match.folder}/${match.file}`))));
}
export {
  renderMatchingModels,
  renderNewModelChoices
};

//# sourceMappingURL=document-views.js.map
