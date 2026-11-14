// Generated from legend.jsx by scripts/build-frontend.mjs.
import o,{renderToStaticMarkup as d}from"../shared/react/react-runtime.js";function s({series:r=[]}){return o.createElement(o.Fragment,null,r.map((e,l)=>o.createElement("span",{key:l},o.createElement("i",{className:"legend-swatch","aria-hidden":"true",style:{color:e.color,borderColor:e.color,borderTopStyle:["dashed","dotted"].includes(e.style)?e.style:"solid"}}),e.label||"Series")))}function n(r){return d(o.createElement(s,{series:r}))}export{s as PlotLegend,n as renderPlotLegend};

//# sourceMappingURL=legend.js.map
