// Generated from workspace-views.jsx by scripts/build-frontend.mjs.
import t from"../../shared/react/react-runtime.js";import{renderOwnedView as n}from"../../../runtime/owned-view.js";function m(o,r){return n(o,t.createElement(t.Fragment,null,[...r].sort((e,l)=>(e.order||0)-(l.order||0)).filter(e=>e.placement==="selection").map(e=>t.createElement("button",{key:e.id||e.selector,type:"button",id:e.selector.slice(1),className:`button ${e.tone||""} hidden`.trim(),"data-model-editor-selection-action":""},e.label))))}export{m as renderApplicationSelectionActions};

//# sourceMappingURL=workspace-views.js.map
