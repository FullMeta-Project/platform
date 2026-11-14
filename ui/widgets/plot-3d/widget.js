// Generated from widget.jsx by scripts/build-frontend.mjs.
import{drawPlot3d as D}from"./runtime.js";import a from"../shared/react/react-runtime.js";import{mountReactComponent as i}from"../shared/react/mount.js";import{CanvasSurface as p}from"../scene-view/widget.js";import{drawPlot3d as u}from"./runtime.js";function c({label:o="3D scalar plot",width:t,height:r,style:m,className:e,onDraw:d,onError:l,...f}){return a.createElement(p,{draw:u,options:f,label:o,width:t,height:r,style:m,className:e,onDraw:d,onError:l})}function n({view:o,onCommand:t,...r}){return a.createElement(c,{...r,...o,data:o?.data||o?.value||r.data})}const h=(o,t)=>i(o,n,t);export{n as Plot3d,n as Widget,D as drawPlot3d,h as mountWidget};

//# sourceMappingURL=widget.js.map
