// Generated from document-views.jsx by scripts/build-frontend.mjs.
import r from"../../shared/react/react-runtime.js";import{renderOwnedView as l}from"../../../runtime/owned-view.js";function t(n,i){return l(n,r.createElement(r.Fragment,null,i.map(o=>r.createElement("option",{key:o.id,value:o.id},o.label||o.id))))}function u(n,i,o){return l(n,r.createElement(r.Fragment,null,i.map((e,d)=>r.createElement("button",{key:typeof e=="string"?e:e.folder+"/"+e.file+"/"+d,type:"button",className:"button",onClick:()=>o(e)},typeof e=="string"?e:e.folder==="."?e.file:`${e.folder}/${e.file}`))))}export{u as renderMatchingModels,t as renderNewModelChoices};

//# sourceMappingURL=document-views.js.map
