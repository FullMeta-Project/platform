/** Safe Markdown subset shared by the in-dialog preview and browser documentation viewer. */
export function parseDocumentationMarkdown(text){
  const lines=String(text).replace(/\r\n/g,'\n').split('\n'),blocks=[];let index=0;
  const inline=value=>{const nodes=[],pattern=/(`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s)]+)\))/g;let last=0,match;while((match=pattern.exec(value))){if(match.index>last)nodes.push({type:'text',text:value.slice(last,match.index)});if(match[2])nodes.push({type:'code',text:match[2]});else if(match[3])nodes.push({type:'strong',text:match[3]});else nodes.push({type:'link',text:match[4],href:match[5]});last=pattern.lastIndex;}if(last<value.length)nodes.push({type:'text',text:value.slice(last)});return nodes;};
  while(index<lines.length){const line=lines[index];if(!line.trim()){index++;continue;}
    const fence=/^\s*```([\w-]*)\s*$/.exec(line);if(fence){const code=[];index++;while(index<lines.length&&!/^\s*```/.test(lines[index]))code.push(lines[index++]);if(index<lines.length)index++;blocks.push({type:fence[1].toLowerCase()==='math'?'math':'codeblock',text:code.join('\n')});continue;}
    const heading=/^(#{1,6})\s+(.+)$/.exec(line);if(heading){blocks.push({type:'heading',level:heading[1].length,children:inline(heading[2])});index++;continue;}
    const separator=/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index+1]||'');
    if(line.includes('|')&&separator){const cells=value=>value.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>inline(cell.trim()));const header=cells(line);index+=2;const rows=[];while(index<lines.length&&lines[index].includes('|')&&lines[index].trim()){const row=cells(lines[index]);while(row.length<header.length)row.push([]);rows.push(row.slice(0,header.length));index++;}blocks.push({type:'table',header,rows});continue;}
    const list=/^\s*(?:[-*+]\s+|\d+[.]\s+)/.exec(line);if(list){const items=[],ordered=/^\s*\d/.test(line);while(index<lines.length&&/^\s*(?:[-*+]\s+|\d+[.]\s+)/.test(lines[index])){items.push(inline(lines[index].replace(/^\s*(?:[-*+]\s+|\d+[.]\s+)/,'')));index++;}blocks.push({type:'list',ordered,items});continue;}
    if(/^>\s?/.test(line)){const quote=[];while(index<lines.length&&/^>\s?/.test(lines[index]))quote.push(lines[index++].replace(/^>\s?/,''));blocks.push({type:'quote',children:inline(quote.join(' '))});continue;}
    const paragraph=[];while(index<lines.length&&lines[index].trim()&&!/^(?:#{1,6}\s|\s*```|\s*[-*+]\s|\s*\d+[.]\s|>)/.test(lines[index]))paragraph.push(lines[index++]);
    if(paragraph.length)blocks.push({type:'paragraph',children:inline(paragraph.join(' '))});else{blocks.push({type:'paragraph',children:inline(line)});index++;}
  }
  return blocks;
}

export function documentationViewerUrl(path,workspaceRoot){const root=new URL(workspaceRoot);if(!root.pathname.endsWith('/'))root.pathname+='/';const url=new URL('platform/ui/workspace/documentation.html',root);url.searchParams.set('path',path);url.searchParams.set('root',root.href);return url.href;}

let mathJaxLoadPromise;
export function typesetDocumentationMath(container){
  const blocks=container?.querySelectorAll?.('.math-block');if(!blocks?.length)return Promise.resolve();
  const doc=container.ownerDocument,view=doc.defaultView;
  if(view.MathJax?.typesetPromise)return view.MathJax.typesetPromise([container]);
  view.MathJax={tex:{inlineMath:[['\\(','\\)']],displayMath:[['\\[','\\]']],processEscapes:true}};
  if(!mathJaxLoadPromise)mathJaxLoadPromise=new Promise((resolve,reject)=>{const script=doc.createElement('script');script.src='https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-chtml.js';script.async=true;script.onload=()=>resolve(view.MathJax);script.onerror=()=>reject(new Error('Could not load MathJax.'));doc.head.append(script);});
  return mathJaxLoadPromise.then(mathJax=>mathJax.typesetPromise([container])).catch(error=>{for(const block of blocks)block.classList.add('math-unrendered');throw error;});
}

export function documentationLinkTarget(href,currentPath,workspaceRoot){
  try{const root=new URL(workspaceRoot);if(!root.pathname.endsWith('/'))root.pathname+='/';const current=new URL(currentPath,root),url=new URL(href,current);
    if(!['http:','https:'].includes(url.protocol))return null;
    if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return {href:url.href,external:true};
    const relative=decodeURIComponent(url.pathname.slice(root.pathname.length));if(!relative||relative.split('/').some(part=>part==='..'))return null;
    if(!/\.md$/i.test(relative))return {href:url.href,external:false};
    const target=documentationViewerUrl(relative,root);const viewer=new URL(target);if(url.hash)viewer.hash=url.hash;return {href:viewer.href,external:false};
  }catch{return null;}
}

export function renderDocumentationMarkdown(container,text,{path,workspaceRoot,hideFirstHeading=false}){
  const document=container.ownerDocument,appendInline=(parent,nodes)=>{for(const node of nodes){if(node.type==='text')parent.append(document.createTextNode(node.text));else if(node.type==='code'||node.type==='strong'){const element=document.createElement(node.type);element.textContent=node.text;parent.append(element);}else if(node.type==='link'){const target=documentationLinkTarget(node.href,path,workspaceRoot);if(!target){parent.append(document.createTextNode(node.text));continue;}const anchor=document.createElement('a');anchor.textContent=node.text;anchor.href=target.href;if(target.external){anchor.target='_blank';anchor.rel='noopener noreferrer';}parent.append(anchor);}}};
  const fragment=document.createDocumentFragment();let hidden=false;for(const block of parseDocumentationMarkdown(text)){if(hideFirstHeading&&!hidden&&block.type==='heading'&&block.level===1){hidden=true;continue;}let element;if(block.type==='heading')element=document.createElement('h'+block.level);else if(block.type==='math'){element=document.createElement('div');element.className='math-block';element.textContent=`\\[${block.text}\\]`;}else if(block.type==='codeblock'){element=document.createElement('pre');const code=document.createElement('code');code.textContent=block.text;element.append(code);}else if(block.type==='table'){element=document.createElement('table');const thead=document.createElement('thead'),headRow=document.createElement('tr');for(const cell of block.header){const th=document.createElement('th');appendInline(th,cell);headRow.append(th);}thead.append(headRow);element.append(thead);const tbody=document.createElement('tbody');for(const row of block.rows){const tr=document.createElement('tr');for(const cell of row){const td=document.createElement('td');appendInline(td,cell);tr.append(td);}tbody.append(tr);}element.append(tbody);}else if(block.type==='list'){element=document.createElement(block.ordered?'ol':'ul');for(const item of block.items){const li=document.createElement('li');appendInline(li,item);element.append(li);}}else if(block.type==='quote')element=document.createElement('blockquote');else element=document.createElement('p');if(block.children)appendInline(element,block.children);fragment.append(element);}container.replaceChildren(fragment);
}
