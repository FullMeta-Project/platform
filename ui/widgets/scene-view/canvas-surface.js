// Generated from canvas-surface.jsx by scripts/build-frontend.mjs.
import React, { useLayoutEffect, useRef } from "../shared/react/react-runtime.js";
function CanvasSurface({
  draw,
  options = {},
  label = "Graphics view",
  width = 640,
  height = 360,
  className = "",
  style,
  onDraw,
  onError,
  ...events
}) {
  const reference = useRef(null);
  useLayoutEffect(() => {
    const canvas = reference.current;
    let active = true;
    const render = () => {
      if (!active) return;
      try {
        const result = draw?.({ ...options, canvas });
        onDraw?.(result, canvas);
      } catch (error) {
        if (onError) onError(error);
        else throw error;
      }
    };
    render();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(render) : null;
    observer?.observe(canvas);
    if (!observer) globalThis.addEventListener?.("resize", render);
    return () => {
      active = false;
      observer?.disconnect();
      if (!observer) globalThis.removeEventListener?.("resize", render);
    };
  }, [draw, options, onDraw, onError]);
  return /* @__PURE__ */ React.createElement(
    "canvas",
    {
      ref: reference,
      className,
      role: "img",
      "aria-label": label,
      width,
      height,
      style: { display: "block", width: "100%", height, ...style },
      ...events
    }
  );
}
export {
  CanvasSurface
};

//# sourceMappingURL=canvas-surface.js.map
