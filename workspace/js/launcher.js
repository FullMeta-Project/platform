/** The root page uses the same schema-selected editor host as every document. */
import {mountRegisteredEditor} from '../../js/editor-host.js';
import {mountLoaderFailure} from '../../ui/workspace/loader-view.js';
const container=document.getElementById('workspace-host');
let editor;
try{editor=await mountRegisteredEditor(container,{modelPath:'index.json'});}catch(error){mountLoaderFailure(container,error.message);}
export const inspectLauncher=()=>editor?.inspect();
export const launcherActions=editor?.actions;
export const launcherWebMcpTools=editor?.tools;
export const launcherWebMcpStatus=()=>editor?.webMcpStatus();
export const disposeLauncherUi=()=>editor?.dispose();
export const disposeLauncherWebMcp=()=>editor?.dispose();
