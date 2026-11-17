// Generated from legend.jsx by scripts/build-frontend.mjs.
import React, { renderToStaticMarkup } from "../shared/react/react-runtime.js";
function PlotLegend({ series = [] }) {
  return /* @__PURE__ */ React.createElement(React.Fragment, null, series.map((entry, index) => /* @__PURE__ */ React.createElement("span", { key: index }, /* @__PURE__ */ React.createElement(
    "i",
    {
      className: "legend-swatch",
      "aria-hidden": "true",
      style: { color: entry.color, borderColor: entry.color, borderTopStyle: ["dashed", "dotted"].includes(entry.style) ? entry.style : "solid" }
    }
  ), entry.label || "Series")));
}
function renderPlotLegend(series) {
  return renderToStaticMarkup(/* @__PURE__ */ React.createElement(PlotLegend, { series }));
}
export {
  PlotLegend,
  renderPlotLegend
};

//# sourceMappingURL=legend.js.map
