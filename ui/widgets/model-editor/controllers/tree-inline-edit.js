// Generated from tree-inline-edit.jsx by scripts/build-frontend.mjs.
import r from"../../shared/react/react-runtime.js";import{TreeInlineRename as a}from"../../tree/widget.js";import{renderOwnedView as d}from"../../../runtime/owned-view.js";function p(e,{label:o,onChange:n,onCommit:m,onCancel:i}){const t=e.$(".tree-root-heading h2");t&&d(t,e.treeRename?.nodeId==="@root"?r.createElement(a,{rename:e.treeRename,onChange:n,onCommit:m,onCancel:i}):r.createElement("button",{id:"tree-home",className:"tree-home-button tree-root-title",type:"button",title:`Show model overview for ${o}`,...e.activeApplicationPackage?.kind==="schemaDocument"?{"data-model-path":"[]"}:{},onClick:e.showModelOverview},o))}export{p as renderTreeRootTitle};

//# sourceMappingURL=tree-inline-edit.js.map
