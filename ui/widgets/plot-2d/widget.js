// Generated from widget.jsx by scripts/build-frontend.mjs.
import{beginPlot2dFrame as b,drawPlot2d as D}from"./runtime.js";import a from"../shared/react/react-runtime.js";import{mountReactComponent as f}from"../shared/react/mount.js";import{CanvasSurface as p}from"../scene-view/widget.js";import{drawPlot2d as u}from"./runtime.js";function c({label:o="2D scalar plot",width:t,height:r,style:e,className:m,onDraw:d,onError:l,...i}){return a.createElement(p,{draw:u,options:i,label:o,width:t,height:r,style:e,className:m,onDraw:d,onError:l})}function n({view:o,onCommand:t,...r}){return a.createElement(c,{...r,...o,data:o?.data||o?.value||r.data})}const h=(o,t)=>f(o,n,t);export{n as Plot2d,n as Widget,b as beginPlot2dFrame,D as drawPlot2d,h as mountWidget};

//# sourceMappingURL=widget.js.map
