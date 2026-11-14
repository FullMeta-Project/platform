/** SVG declarations are image resources, never inserted into the live document as markup. */
export function svgIconSource(value){
  if(typeof value!=='string'||value.length>65536||!/^<svg(?:\s|>)[\s\S]*<\/svg>\s*$/i.test(value.trim()))return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value.trim())}`;
}
