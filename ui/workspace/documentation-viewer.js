import {parseDocumentationMarkdown,renderDocumentationMarkdown,typesetDocumentationMath} from './documentation-markdown.js';

const params=new URLSearchParams(location.search),path=params.get('path'),rootValue=params.get('root');
const title=document.querySelector('#doc-title'),pathLabel=document.querySelector('#doc-path'),content=document.querySelector('#doc-content');
function fail(message){content.replaceChildren(Object.assign(document.createElement('p'),{className:'error',textContent:message}));}
try{
  const root=new URL(rootValue||'/',location.href);if(!root.pathname.endsWith('/'))root.pathname+='/';
  const viewerPath=new URL('platform/ui/workspace/documentation.html',root).pathname;
  if(root.origin!==location.origin||!location.pathname.endsWith('/platform/ui/workspace/documentation.html')||!path||!/^((?!\.\.)[A-Za-z0-9._/-])+$/.test(path)||!path.toLowerCase().endsWith('.md'))throw new Error('This documentation address is invalid.');
  const fileUrl=new URL(`api/workspace/file?path=${encodeURIComponent(path)}`,root);
  if(!location.pathname.startsWith(root.pathname)||!location.pathname.endsWith(viewerPath.slice(root.pathname.length)))throw new Error('This documentation is outside the current FullMeta workspace.');
  document.querySelector('#workspace-link').href=root.href;
  const response=await fetch(fileUrl,{cache:'no-store'}),result=await response.json();
  if(!response.ok||result?.format!=='fullmeta-workspace-file/1'||result.path!==path||typeof result.text!=='string'||result.bytes>2*1024*1024)throw new Error(result?.error||`Could not load ${path} (${response.status}).`);
  const firstHeading=parseDocumentationMarkdown(result.text).find(block=>block.type==='heading'&&block.level===1),headingText=firstHeading?.children?.map(node=>node.text||'').join('').trim();
  title.textContent=headingText||path.split('/').at(-1).replace(/\.md$/i,'');pathLabel.textContent=path;document.title=`${title.textContent} — FullMeta documentation`;
  content.className='documentation';renderDocumentationMarkdown(content,result.text,{path,workspaceRoot:root.href,hideFirstHeading:Boolean(headingText)});
  void typesetDocumentationMath(content).catch(()=>{});
}catch(error){title.textContent='Documentation unavailable';fail(error.message);}
