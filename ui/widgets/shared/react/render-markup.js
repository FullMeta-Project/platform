// Generated from render-markup.jsx by scripts/build-frontend.mjs.
import s,{renderWidgetMarkup as d}from"./react-runtime.js";function g(i,r,u=["renderField","renderObject"]){const n=[],f=globalThis.crypto?.randomUUID?.()||String(Math.random()).slice(2),l={...r};for(const e of u)typeof r[e]=="function"&&(l[e]=(...c)=>{const t=r[e](...c);if(typeof t!="string")return t;if(!t)return null;const a=`FULLMETA_SERIALIZED_SLOT_${f}_${n.length}_END`;return n.push([a,t]),a});let o=d(s.createElement(i,{...l}));for(const[e,c]of n)o=o.replaceAll(e,()=>c);return o}export{g as renderLegacyWidgetMarkup};

//# sourceMappingURL=render-markup.js.map
