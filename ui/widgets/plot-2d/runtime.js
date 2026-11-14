import { drawScalarPlot } from "../shared/plots/scalar-surface.js";
import { beginRasterPlot2dFrame, drawRasterPlot2d } from "./raster.js";

export function beginPlot2dFrame(canvas, frame) {
  beginRasterPlot2dFrame(canvas, frame);
}

/** Render either a scalar raster or scalar surfaces in a 2D coordinate domain. */
export function drawPlot2d(options = {}) {
  if (options?.data?.grid || options?.grid) return drawRasterPlot2d(options);
  return drawScalarPlot({ ...options, dimension: 2 });
}
