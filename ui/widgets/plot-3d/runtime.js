import { drawScalarPlot } from "../shared/plots/scalar-surface.js";

/** Render application-neutral scalar surfaces in a 3D coordinate domain. */
export function drawPlot3d(options = {}) { return drawScalarPlot({ ...options, dimension: 3 }); }
