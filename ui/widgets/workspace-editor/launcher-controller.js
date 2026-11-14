/** Mount-scoped launcher commands. The workspace widget supplies all presentation. */
import { applicationModuleUrl, loadApplicationCatalog, loadApplicationPackage } from '../../../js/services.js';
import { registerWebMcpTools } from '../../runtime/webmcp.js';
import { createLauncherWebMcpTools } from '../../../workspace/js/launcher-webmcp.js';
import {mountLauncherApplications,mountLauncherProjects,mountProjectModelChoices,mountLauncherSelectOptions} from '../../workspace/launcher-views.js';
import { createSchemaBasedProject } from '../model-editor/schema-project-initializer.js';

export function createLauncherController(container,{workspaceUrl=new URL('../../../../',import.meta.url),navigate,fetcher=globalThis.fetch,loadPackage=loadApplicationPackage,extraTools=[],inspectExtra=()=>({}),showProjects=async()=>{},refreshDocuments=async()=>{}}={}){
const document=container.ownerDocument,window=document.defaultView,navigator=window.navigator,CSS=window.CSS||globalThis.CSS;
const lifetime=new window.AbortController();
const listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:lifetime.signal});
const byId=id=>container.querySelector('#'+CSS.escape(id));
const location={href:window.location.href,assign(url){if(lifetime.signal.aborted)throw new Error('The workspace editor has been disposed.');if(navigate)return navigate(url);window.location.assign(url);}};
const fetch=(input,options={})=>fetcher(input,{...options,signal:lifetime.signal});
const profileGrid = container.querySelector('#profile-grid');
const projectGrid = container.querySelector('#project-grid');
const status = container.querySelector('#launcher-status');
const applicationCreateDialog = container.querySelector('#application-create-dialog');
const applicationCreateForm = container.querySelector('#application-create-form');
const applicationCreateName = container.querySelector('#application-create-name');
const applicationCreateConfirm = container.querySelector('#application-create-confirm');
const projectCreateDialog = container.querySelector('#project-create-dialog');
const projectCreateForm = container.querySelector('#project-create-form');
const projectCreateProfile = container.querySelector('#project-create-profile');
const projectCreateId = container.querySelector('#project-create-id');
const projectCreateConfirm = container.querySelector('#project-create-confirm');
const projectDeleteDialog = container.querySelector('#project-delete-dialog');
const applicationDeleteDialog = container.querySelector('#application-delete-dialog');
const projectOpenDialog = container.querySelector('#project-open-dialog');
const exampleDialog = container.querySelector('#example-create-dialog');
const exampleForm = container.querySelector('#example-create-form');
const exampleChoice = container.querySelector('#example-create-choice');
const exampleName = container.querySelector('#example-create-name');
const exampleConfirm = container.querySelector('#example-create-confirm');
const exampleCancel = container.querySelector('#example-create-cancel');
const applicationExamples = new Map();
let exampleApplication = null, creatingExample = false;
const applicationPackages = new Map();
const applicationRegistrations = new Map();
const applicationControls = new Map();
const projectControls = new Map();
const pendingDeletes = new Map();
let applicationModuleRetrySequence = 0;
let projectModels = [];
let projectChoices = null;
let workspaceRegistration = null;
let creatingApplication = null;
let creatingPackage = null;
let creatingProfile = null;
let creatingButton = null;
let creatingProject = false;
let creatingProjectRoot = 'projects';
let creatingApplicationFolder = false;
let openingProject = false;
let applicationRows=[],applicationSurface=null,projectSurface=null,modelChoiceSurface=null,profileSurface=null,launcherUiDisposed=false;
const applicationViewCommands={onCreate:(id,button)=>openProjectCreateDialog(id,button),onExamples:id=>openExamples(id),onDelete:(id,card,button)=>requestDelete('application-delete',()=>deleteApplication(applicationRegistrations.get(id),card,button)),onControls:(id,controls)=>{if(controls)applicationControls.set(id,controls);else applicationControls.delete(id);}};
function openExamples(id){
  const examples=applicationExamples.get(id)||[]; if(!examples.length||creatingExample)return;
  exampleApplication=id; exampleChoice.replaceChildren(...examples.map(example=>{const option=document.createElement('option');option.value=example.id;option.textContent=example.title;return option;}));
  exampleName.value=examples[0].id; setExampleBusy(false); const message=container.querySelector('#example-create-status');message.hidden=true;message.textContent='';message.classList.remove('error');
  container.querySelector('#example-create-title').textContent=`${applicationRegistrations.get(id)?.name||id} examples`;
  exampleDialog.showModal();exampleChoice.focus();
}
function setExampleBusy(busy){creatingExample=busy;for(const control of [exampleChoice,exampleName,exampleConfirm,exampleCancel])control.disabled=busy;exampleConfirm.textContent=busy?'Creating…':'Create and open';}
listen(exampleChoice,'change',()=>{exampleName.value=exampleChoice.value;});
listen(exampleCancel,'click',()=>{if(!creatingExample)exampleDialog.close('cancel');});
listen(exampleDialog,'cancel',event=>{if(creatingExample)event.preventDefault();});
listen(exampleForm,'submit',async event=>{
  event.preventDefault();if(creatingExample||!exampleApplication||!exampleForm.reportValidity())return;
  setExampleBusy(true);const message=container.querySelector('#example-create-status');message.hidden=true;message.classList.remove('error');
  try{
    const response=await fetch('/api/workspace/examples',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({application:exampleApplication,example:exampleChoice.value,projectName:exampleName.value.trim()})});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Could not create the project (${response.status}).`);
    location.assign(documentLoaderUrl(`${result.folder}/${result.file}`).href);
  }catch(error){message.textContent=error.message;message.hidden=false;message.classList.add('error');setExampleBusy(false);}
});
const projectViewCommands={onOpen:(id,link,event)=>openProject(projectControls.get(id).project,link,event),onDelete:(id,card,button)=>requestDelete('project-delete',()=>deleteProject(projectControls.get(id).project,card,button)),onControls:(id,controls)=>{if(controls)projectControls.set(id,{...controls,project:projectModels.find(project=>String(project.id)===id)});else projectControls.delete(id);}};
function renderApplicationsView(){if(launcherUiDisposed)return;const props={entries:[...applicationRows],...applicationViewCommands};if(applicationSurface?.inspect().mounted)applicationSurface.update(props);else applicationSurface=mountLauncherApplications(profileGrid,props);}
function renderProjectProfileOptions(choices){const props={choices};if(profileSurface?.inspect().mounted)profileSurface.update(props);else profileSurface=mountLauncherSelectOptions(projectCreateProfile,props);}
function renderProjectModelChoices(entries){const props={entries},host=container.querySelector('#project-model-list');if(modelChoiceSurface?.inspect().mounted)modelChoiceSurface.update(props);else modelChoiceSurface=mountProjectModelChoices(host,props);}
function disposeLauncherUi(){if(launcherUiDisposed)return;launcherUiDisposed=true;applicationControls.clear();projectControls.clear();}

async function loadApplicationPackageFromLauncher(applicationId, options) {
  try {
    return await loadPackage(applicationId, options);
  } catch (error) {
    // Browsers cache a failed module-map entry by URL. Reusing the same URL
    // can therefore repeat the failure even after the transient network error
    // has cleared; the loader gives the retry a fresh module URL. Validation
    // and package-contract errors still surface immediately.
    if (!/Failed to fetch dynamically imported module/i.test(String(error?.message || error))) throw error;
    await new Promise(resolve => window.setTimeout(resolve, 120));
    const retryKey = `${Date.now()}-${++applicationModuleRetrySequence}`;
    return loadPackage(applicationId, { ...options, __fullmetaModuleRetryKey: retryKey });
  }
}

function applicationFolderId(name) {
  return name.trim().toLowerCase().replace(/[ _-]+/g, '-').replace(/-$/, '');
}

function setApplicationCreateBusy(busy) {
  creatingApplicationFolder = busy;
  applicationCreateName.disabled = busy;
  applicationCreateConfirm.disabled = busy;
  applicationCreateConfirm.textContent = busy ? 'Creating…' : 'Create application';
  container.querySelector('#application-create-cancel').disabled = busy;
}

function openApplicationCreateDialog() {
  applicationCreateForm.reset();
  container.querySelector('#application-create-folder').textContent = 'applications/<name>/';
  container.querySelector('#application-create-schema').textContent = 'applications/<name>/<name>.schema.json';
  const message = container.querySelector('#application-create-status');
  message.hidden = true;
  message.textContent = '';
  message.classList.remove('error');
  applicationCreateDialog.showModal();
  applicationCreateName.focus();
}
listen(container.querySelector('#new-application'),'click', openApplicationCreateDialog);
function updateApplicationCreateName() {
  const id = applicationFolderId(applicationCreateName.value);
  container.querySelector('#application-create-folder').textContent = id ? `applications/${id}/` : 'applications/<name>/';
  container.querySelector('#application-create-schema').textContent = id
    ? `applications/${id}/${id}.schema.json` : 'applications/<name>/<name>.schema.json';
}
listen(applicationCreateName,'input', updateApplicationCreateName);
listen(container.querySelector('#application-create-cancel'),'click', () => applicationCreateDialog.close('cancel'));
listen(applicationCreateDialog,'cancel', event => {
  if (creatingApplicationFolder) event.preventDefault();
});
async function submitApplicationCreate(event) {
  event.preventDefault();
  if (creatingApplicationFolder) return { error: 'Application creation is already in progress.' };
  if (!applicationCreateForm.reportValidity()) return { error: applicationCreateName.validationMessage || 'Complete the application name before submitting.' };
  const message = container.querySelector('#application-create-status');
  message.hidden = true;
  message.textContent = '';
  message.classList.remove('error');
  setApplicationCreateBusy(true);
  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: applicationCreateName.value.trim() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || (response.status === 404
      ? 'Restart the FullMeta server, then refresh this page to create applications.'
      : `Could not create the application (${response.status}).`));
    status.classList.remove('error');
    applicationCreateDialog.close('created');
    setApplicationCreateBusy(false);
    status.classList.remove('error');
    status.textContent = `Created ${result.folder}.`;
    try {
      await loadApplications();
      status.textContent = `Created ${result.folder}. The new application is ready in Applications.`;
      profileGrid.querySelector(`[data-application-id="${CSS.escape(result.id)}"] [data-create-project]`)?.focus();
    } catch (error) {
      status.textContent = `Created ${result.folder}, but the Applications panel could not refresh: ${error.message}`;
      status.classList.add('error');
    }
    return { created: true, id: result.id, folder: result.folder };
  } catch (error) {
    message.textContent = error.message;
    message.hidden = false;
    message.classList.add('error');
    status.textContent = error.message;
    status.classList.add('error');
    setApplicationCreateBusy(false);
    return { error: error.message };
  }
}
listen(applicationCreateForm,'submit', submitApplicationCreate);

listen(container.querySelector('#project-create-cancel'),'click', () => projectCreateDialog.close('cancel'));
listen(projectCreateProfile,'change', updateProjectCreateProfile);
function updateProjectCreateId() {
  const projectId = projectCreateId.value.trim();
  container.querySelector('#project-create-folder').textContent = projectId ? `${creatingProjectRoot}/${projectId}` : `${creatingProjectRoot}/<id>`;
}
listen(projectCreateId,'input', updateProjectCreateId);
listen(projectCreateDialog,'cancel', (event) => {
  if (creatingProject) event.preventDefault();
});
listen(container.querySelector('#project-delete-cancel'),'click', () => projectDeleteDialog.close('cancel'));
listen(container.querySelector('#project-delete-confirm'),'click', () => projectDeleteDialog.close('delete'));
listen(container.querySelector('#application-delete-cancel'),'click', () => applicationDeleteDialog.close('cancel'));
listen(container.querySelector('#application-delete-confirm'),'click', () => applicationDeleteDialog.close('delete'));
listen(container.querySelector('#project-open-cancel'),'click', () => projectOpenDialog.close('cancel'));
listen(projectOpenDialog,'close', () => { projectChoices = null; });



function documentLoaderUrl(modelPath, action = null) {
  const target = new URL('platform/loader.html', workspaceUrl);
  target.searchParams.set('model', modelPath);
  if (action) target.searchParams.set('action', action);
  return target;
}

function projectTitle(project) {
  return String(project.modelId || project.id || 'Untitled project');
}

function profileProperty(applicationPackage, property, fallback) {
  return applicationPackage?.launcher?.[property] || fallback;
}

function availableProfiles(applicationPackage) {
  const declaration = applicationPackage.launcher || {};
  const statusProperty = profileProperty(applicationPackage, 'profileStatusProperty', 'status');
  const availableStatus = profileProperty(applicationPackage, 'availableStatus', 'available');
  return (Array.isArray(declaration.profiles) ? declaration.profiles : [])
    .filter(profile => profile && typeof profile === 'object' && profile[statusProperty] === availableStatus);
}

function selectedProfile(applicationPackage) {
  const idProperty = profileProperty(applicationPackage, 'profileIdProperty', 'id');
  return availableProfiles(applicationPackage).find(profile => String(profile[idProperty]) === projectCreateProfile.value) || null;
}

function updateProjectCreateProfile() {
  creatingProfile = creatingPackage ? selectedProfile(creatingPackage) : null;
  const descriptionProperty = profileProperty(creatingPackage, 'profileDescriptionProperty', 'description');
  container.querySelector('#project-create-profile-description').textContent = creatingProfile?.[descriptionProperty] || '';
  projectCreateConfirm.disabled = creatingProject || (!projectCreateProfile.hidden && !creatingProfile);
}

function setProjectCreateBusy(busy) {
  creatingProject = busy;
  for (const control of [projectCreateProfile, projectCreateId, container.querySelector('#project-create-cancel')]) {
    control.disabled = busy;
  }
  projectCreateConfirm.disabled = busy || (!projectCreateProfile.hidden && !creatingProfile);
  projectCreateConfirm.textContent = busy ? 'Creating…' : 'Create project';
  if (creatingButton) {
    creatingButton.disabled = busy;
    creatingButton.textContent = busy ? 'Creating…' : 'Create Project';
  }
}

function openProjectCreateDialog(applicationId, button) {
  const applicationPackage = applicationPackages.get(applicationId) || {};
  const registration = applicationRegistrations.get(applicationId);
  if (!registration || button.disabled) return;
  const profiles = typeof applicationPackage.createModelDocument === 'function' ? availableProfiles(applicationPackage) : [];

  creatingButton = button;
  creatingApplication = registration;
  creatingPackage = applicationPackage;
  creatingProjectRoot = 'projects';
  projectCreateForm.reset();
  const idProperty = profileProperty(applicationPackage, 'profileIdProperty', 'id');
  const labelProperty = profileProperty(applicationPackage, 'profileLabelProperty', 'name');
  renderProjectProfileOptions(profiles.map(profile=>({value:String(profile[idProperty]),label:String(profile[labelProperty]||profile[idProperty])})));
  const defaultProfileId = applicationPackage.launcher?.defaultProfileId;
  projectCreateProfile.hidden = !profiles.length; projectCreateProfile.required = Boolean(profiles.length);
  container.querySelector('#project-create-profile-label').hidden = !profiles.length;
  projectCreateProfile.value = profiles.some(profile => String(profile[idProperty]) === String(defaultProfileId))
    ? String(defaultProfileId) : profiles.length ? String(profiles[0][idProperty]) : '';
  container.querySelector('#project-create-title').textContent = `Create ${registration.name} project`;
  container.querySelector('#project-create-description').textContent = registration.description
    || applicationPackage.launcher?.description || '';
  container.querySelector('#project-create-folder').textContent = `${creatingProjectRoot}/<id>`;
  const message = container.querySelector('#project-create-status');
  message.textContent = '';
  message.hidden = true;
  message.classList.remove('error');
  setProjectCreateBusy(false);
  updateProjectCreateProfile();
  projectCreateDialog.showModal();
  (profiles.length ? projectCreateProfile : projectCreateId).focus();
}

async function submitProjectCreate(event) {
  event.preventDefault();
  if (!creatingApplication || !creatingPackage || (!projectCreateProfile.hidden && !creatingProfile) || projectCreateConfirm.disabled
    || !projectCreateForm.reportValidity()) return { error: creatingProject ? 'Project creation is already in progress.' : projectCreateId.validationMessage || 'Choose an available profile and complete the project folder.' };
  const applicationPackage = creatingPackage;
  const registration = creatingApplication;
  const profile = creatingProfile;
  const projectId = projectCreateId.value.trim();
  const message = container.querySelector('#project-create-status');
  message.textContent = '';
  message.hidden = true;
  message.classList.remove('error');
  setProjectCreateBusy(true);
  status.classList.remove('error');
  status.textContent = `Creating ${projectId} for ${registration.name}…`;
  try {
    const folder = `projects/${projectId}`;
    const profileId = profile ? String(profile[profileProperty(applicationPackage, 'profileIdProperty', 'id')]) : undefined;
    const schemaResponse = await fetch(applicationModuleUrl(registration.schema), {cache:'no-store'});
    if (!schemaResponse.ok) throw new Error(`Could not load the application schema (${schemaResponse.status}).`);
    const schema = await schemaResponse.json();
    const model = typeof applicationPackage.createModelDocument === 'function'
      ? applicationPackage.createModelDocument({modelId:projectId,profileId,folder})
      : createSchemaBasedProject(schema,{projectId,schemaReference:`../../${registration.schema}`,makeId:base=>`${base}-${window.crypto.randomUUID()}`,makeName:(_path,base)=>base});
    if (model.metadata && typeof model.metadata === 'object' && !schema.properties?.metadata?.properties?.id?.const) model.metadata.id=projectId;
    const response = await fetch('/api/workspace/projects/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ application:registration.id, projectName:projectId, model }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || (response.status === 404
      ? 'Restart the FullMeta server, then refresh this page to create projects.'
      : `Could not create the project (${response.status}).`));
    status.textContent = result.reusedProject
      ? `Added a ${registration.name} model to ${result.folder}. Opening it…`
      : `Created ${result.folder}. Opening it…`;
    location.assign(documentLoaderUrl(`${result.folder}/${result.file}`).href);
    return { created: true, folder: result.folder, file: result.file };
  } catch (error) {
    message.textContent = error.message;
    message.hidden = false;
    message.classList.add('error');
    status.textContent = error.message;
    status.classList.add('error');
    setProjectCreateBusy(false);
    return { error: error.message };
  }
}
listen(projectCreateForm,'submit', submitProjectCreate);

listen(projectCreateDialog,'close', () => {
  setProjectCreateBusy(false);
  creatingApplication = null;
  creatingPackage = null;
  creatingProfile = null;
  creatingButton = null;
  creatingProjectRoot = 'projects';
});

async function openProject(project, link, event) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (openingProject) return { error: 'A project is already being opened.' };
  openingProject = true;
  link.textContent = 'Opening…';
  link.setAttribute('aria-disabled', 'true');
  status.classList.remove('error');
  status.textContent = `Loading model files in projects/${project.id}…`;
  try {
    const response = await fetch(`/api/models?folder=${encodeURIComponent(`projects/${project.id}`)}`, { cache: 'no-store' });
    const listing = await response.json();
    if (!response.ok) throw new Error(listing.error || `Could not list model files (${response.status}).`);
    if (!Array.isArray(listing.documents)) throw new Error('Restart the FullMeta server, then refresh this page to choose project model files.');
    const documents = listing.documents;
    if (!documents.length) throw new Error(`No application model JSON files were found in projects/${project.id}. Refresh the project list if its files have changed.`);
    if (documents.length === 1) {
      const url = documentLoaderUrl(`projects/${project.id}/${documents[0].file}`).href;
      location.assign(url);
      return { navigating: true, url };
    }
    container.querySelector('#project-open-title').textContent = projectTitle(project);
    const list = container.querySelector('#project-model-list');
    renderProjectModelChoices(documents.map(document=>({file:document.file,href:documentLoaderUrl(`projects/${project.id}/${document.file}`).href,applicationLabel:applicationRegistrations.get(document.application)?.name||document.application||'Unknown application'})));
    status.textContent = `Choose a model file from ${project.id}.`;
    projectOpenDialog.showModal();
    projectChoices = { projectId: project.id, documents: structuredClone(documents) };
    list.querySelector('a').focus();
    return { choosingModel: true, projectId: project.id, documents: structuredClone(documents) };
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
    return { error: error.message };
  } finally {
    openingProject = false;
    link.textContent = 'Open project';
    link.removeAttribute('aria-disabled');
  }
}

async function deleteProject(project, card, button, requestedDocumentCount, workspaceFolder = false) {
  const id = String(project.id || '');
  const name = projectTitle(project);
  const projectRoot = 'projects';
  const folder = project.folder || `${projectRoot}/${id}`;
  const documentCount = Number.isSafeInteger(requestedDocumentCount) ? requestedDocumentCount : Array.isArray(project.documents) ? project.documents.length : 0;
  container.querySelector('#project-delete-title').textContent = workspaceFolder ? 'Delete folder?' : 'Delete project?';
  container.querySelector('#project-delete-confirm').textContent = workspaceFolder ? 'Delete folder' : 'Delete project';
  container.querySelector('#project-delete-description').textContent = `Delete “${name}” and the entire folder ${folder}? This permanently removes everything in that folder, including any subfolders.`;
  projectDeleteDialog.returnValue = '';
  const confirmed = await new Promise(resolve => {
    listen(projectDeleteDialog,'close', () => resolve(projectDeleteDialog.returnValue === 'delete'), { once: true });
    projectDeleteDialog.showModal();
  });
  if (!confirmed) return { cancelled: true };

  if (button) { button.disabled = true; button.textContent = 'Deleting…'; }
  status.classList.remove('error');
  status.textContent = `Deleting ${folder}…`;
  let deleteResult;
  try {
    const response = await fetch(workspaceFolder ? '/api/workspace/folder/delete' : '/api/workspace/projects/delete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(workspaceFolder ? { path: folder } : { folder }),
    });
    deleteResult = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(deleteResult.error || (response.status === 404
      ? 'The delete feature is not loaded by the server yet. Restart FullMeta, then refresh this page.'
      : `Could not delete the project (${response.status}).`));
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
    if (button) { button.disabled = false; button.textContent = 'Delete project'; }
    return { error: error.message };
  }

  let refreshError = '';
  try { await loadProjectLists(); } catch (error) { refreshError = error.message; }
  try { await refreshDocuments(folder); } catch (error) { refreshError = refreshError ? `${refreshError}; ${error.message}` : error.message; }
  if (refreshError) {
    projectModels=projectModels.filter(project=>String(project.id)!==String(id));
    renderProjectCards(projectModels,projectGrid,'No projects yet.');
    status.textContent = `The project folder was deleted, but the listing could not be fully refreshed: ${refreshError}`;
    status.classList.add('error');
  } else status.textContent = `Deleted ${deleteResult.folder || deleteResult.path || folder} and refreshed the project list.`;
  return { deleted: true, id, folder: deleteResult.folder || deleteResult.path || folder };
}

async function deleteApplication(registration, card, button) {
  const { id, name } = registration;
  container.querySelector('#application-delete-description').textContent =
    `Delete “${name}” and the entire folder applications/${id}/? Its catalog entry will also be removed. Existing projects are kept, but their ${name} models will need this application to open again.`;
  applicationDeleteDialog.returnValue = '';
  const confirmed = await new Promise(resolve => {
    listen(applicationDeleteDialog,'close', () => resolve(applicationDeleteDialog.returnValue === 'delete'), { once: true });
    applicationDeleteDialog.showModal();
  });
  if (!confirmed) return { cancelled: true };

  button.disabled = true;
  button.textContent = 'Deleting…';
  status.classList.remove('error');
  status.textContent = `Deleting applications/${id}/…`;
  let result;
  try {
    const response = await fetch('/api/applications/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || (response.status === 404
      ? 'Restart the FullMeta server, then refresh this page to delete applications.'
      : `Could not delete the application (${response.status}).`));
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
    button.disabled = false;
    button.textContent = 'Delete app';
    return { error: error.message };
  }
  try {
    await loadApplications();
    status.textContent = `Deleted ${result.folder} and removed it from the application catalog.`;
  } catch (error) {
    applicationRegistrations.delete(id);
    applicationPackages.delete(id);
    applicationRows=applicationRows.filter(entry=>entry.id!==id);renderApplicationsView();
    status.textContent = `Deleted ${result.folder}, but the application list could not be refreshed: ${error.message}`;
    status.classList.add('error');
  }
  return { deleted: true, id, folder: result.folder };
}

function requestDelete(dialogId, action) {
  if (pendingDeletes.has(dialogId)) throw new Error('This delete confirmation is already active.');
  const pending = Promise.resolve(action()).catch(error => { status.textContent = error.message; status.classList.add('error'); return { error: error.message }; });
  pendingDeletes.set(dialogId, pending);
  pending.finally(() => { if (pendingDeletes.get(dialogId) === pending) pendingDeletes.delete(dialogId); });
  return pending;
}



function renderApplicationCard(registration,applicationPackage){
  const launcher=applicationPackage.launcher||{},profiles=availableProfiles(applicationPackage);
  applicationRows.push({id:registration.id,title:launcher.name||applicationPackage.manifest?.name||registration.name,description:registration.description||launcher.description||'',tags:profiles.map(profile=>String(profile[profileProperty(applicationPackage,'profileLabelProperty','name')]||profile[profileProperty(applicationPackage,'profileIdProperty','id')])),exampleCount:(applicationExamples.get(registration.id)||[]).length,editHref:documentLoaderUrl(registration.schema).href,create:{kind:'button'}});
  renderApplicationsView();
}

function renderDraftApplicationCard(registration){
  applicationRows.push({id:registration.id,title:registration.name,description:registration.description||'Application schema draft. Define its model and UI in the schema editor.',tags:[],exampleCount:(applicationExamples.get(registration.id)||[]).length,editHref:documentLoaderUrl(registration.schema).href,create:{kind:'button'}});
  renderApplicationsView();
}

function renderApplicationLoadError(registration,error){
  applicationRows.push({id:registration.id,title:registration.name,error:`Could not load this application's package: ${error.message}`,description:'',tags:[],exampleCount:(applicationExamples.get(registration.id)||[]).length,editHref:documentLoaderUrl(registration.schema).href,create:{kind:'button'}});
  renderApplicationsView();
}

function renderProjectCards(models,grid,emptyMessage){
  if(launcherUiDisposed)return;
  const entries=models.map(project=>{const id=String(project.id),documents=Array.isArray(project.documents)?project.documents:[];return {id,title:projectTitle(project),applications:[...new Set(documents.map(document=>document.application))].map(id=>({id:id||'unknown',label:applicationRegistrations.get(id)?.name||id||'Unknown application'})),path:`projects/${id}/`,href:documents.length?documentLoaderUrl(`projects/${id}/${documents[0].file}`).href:new URL('platform/loader.html',workspaceUrl).href};});
  const props={entries,emptyMessage,...projectViewCommands};
  if(projectSurface?.inspect().mounted)projectSurface.update(props);else projectSurface=mountLauncherProjects(grid,props);
}

async function loadProjectLists() {
  const response = await fetch('/api/models?folder=projects', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not refresh the project list (${response.status}).`);
  const listing = await response.json();
  const models = listing.models || [];
  if (!Array.isArray(models)) throw new Error('The project listing has no model rows.');
  projectModels = structuredClone(models);
  projectControls.clear();
  renderProjectCards(models, projectGrid, 'No projects yet.');
  return models;
}

async function refreshProjects() {
  const button = container.querySelector('#refresh-projects');
  if (button.disabled) return { error: 'The project list is already being refreshed.' };
  button.disabled = true;
  button.textContent = 'Refreshing…';
  status.classList.remove('error');
  status.textContent = 'Refreshing projects…';
  try {
    await loadProjectLists();
    status.textContent = 'Project list refreshed.';
    await refreshDocuments();
    return { refreshed: 'projects' };
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
    return { error: error.message };
  } finally {
    button.disabled = false;
    button.textContent = 'Refresh list';
  }
}
listen(container.querySelector('#refresh-projects'),'click', refreshProjects);

async function loadApplications() {
  const catalog = await loadApplicationCatalog();
  const exampleErrors = [];
  applicationRegistrations.clear();
  applicationPackages.clear();
  applicationExamples.clear();
  applicationControls.clear();
  applicationRows=[];renderApplicationsView();
  for (const registration of catalog.applications) {
    applicationRegistrations.set(registration.id, registration);
    try { const response=await fetch(`/api/workspace/examples?application=${encodeURIComponent(registration.id)}`,{cache:'no-store'});if(!response.ok)throw new Error(`Could not discover examples (${response.status}).`);const data=await response.json();if(data.format!=='fullmeta-application-examples/1'||!Array.isArray(data.examples))throw new Error('Invalid examples listing.');applicationExamples.set(registration.id,data.examples); }
    catch(error) { applicationExamples.set(registration.id,[]); exampleErrors.push(`${registration.name}: ${error.message}`); }
    if (!registration.schemaLoader && !registration.package) {
      renderDraftApplicationCard(registration);
      continue;
    }
    try {
      const applicationPackage = await loadApplicationPackageFromLauncher(registration.id, {
        schemaUrl: applicationModuleUrl(registration.schema),
      });
      applicationPackages.set(registration.id, applicationPackage);
      renderApplicationCard(registration, applicationPackage);
    } catch (error) {
      renderApplicationLoadError(registration, error);
    }
  }
  if (exampleErrors.length) throw new Error(`Examples could not be loaded: ${exampleErrors.join(' ')}`);
}

const launcherDialogIds = ['application-create', 'project-create', 'example-create', 'application-delete', 'project-delete', 'project-open'];
const preventSubmit = () => {};
const plainClick = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault: preventSubmit };
const visibleLauncherDialogs = () => launcherDialogIds.filter(id => byId(`${id}-dialog`).open);
function assertLauncherReady(dialogId = null) {
  if (creatingApplicationFolder || creatingProject || creatingExample || openingProject || container.querySelector('#refresh-projects').disabled) throw new Error('Wait for the active launcher operation to finish.');
  if (visibleLauncherDialogs().some(id => id !== dialogId)) throw new Error('Complete or cancel the visible launcher dialog first.');
  if ([...pendingDeletes.keys()].some(id => id !== dialogId)) throw new Error('Wait for the active delete operation to finish.');
}
function enabledControl(control, description) {
  if (!control?.isConnected || control.disabled || control.getAttribute('aria-disabled') === 'true') throw new Error(`${description} is unavailable in the current launcher state.`);
  return control;
}
function launcherDialog(id) {
  if (!launcherDialogIds.includes(id)) throw new Error('Choose a known launcher dialog.');
  return byId(`${id}-dialog`);
}

function inspectLauncher() {
  const dialogs = visibleLauncherDialogs().map(id => {
    const dialog = launcherDialog(id), form = dialog.querySelector('form');
    return { id, title: dialog.querySelector('h2')?.textContent || '', status: dialog.querySelector('[role="status"]')?.textContent || '', valid: form ? form.checkValidity() : null,
      fields: [...dialog.querySelectorAll('input,select')].map(control => ({ id: control.id, value: control.value, disabled: control.disabled, valid: control.checkValidity(), validationMessage: control.validationMessage || '', ...(control.tagName === 'SELECT' ? { choices: [...control.options].map(option => ({ value: option.value, label: option.textContent, disabled: option.disabled })) } : {}) })),
      ...(id === 'project-open' ? { project: structuredClone(projectChoices) } : {}) };
  });
  return { format: 'fullmeta-workspace-state/1',
    applications: [...applicationRegistrations.values()].map(registration => {
      const applicationPackage = applicationPackages.get(registration.id), controls = applicationControls.get(registration.id), idKey = profileProperty(applicationPackage, 'profileIdProperty', 'id'), labelKey = profileProperty(applicationPackage, 'profileLabelProperty', 'name');
      return { id: registration.id, name: registration.name, description: registration.description || '', schema: registration.schema, packageLoaded: Boolean(applicationPackage), profiles: availableProfiles(applicationPackage || {}).map(profile => ({ id: String(profile[idKey]), label: String(profile[labelKey] || profile[idKey]) })), actions: { edit: Boolean(controls?.edit), createProject: Boolean(controls?.create && !controls.create.disabled), delete: Boolean(controls?.delete && !controls.delete.disabled) }, error: controls?.card.querySelector('.launcher-status.error')?.textContent || null };
    }),
    projects: projectModels.map(project => ({ ...structuredClone(project), title: projectTitle(project), actions: { open: Boolean(projectControls.get(String(project.id))?.open), delete: Boolean(projectControls.get(String(project.id))?.delete && !projectControls.get(String(project.id)).delete.disabled) } })),
    dialogs, busy: { applicationCreate: creatingApplicationFolder, projectCreate: creatingProject, projectOpen: openingProject, projectRefresh: container.querySelector('#refresh-projects').disabled, deleting: [...pendingDeletes.keys()] },
    status: { text: status.textContent || '', error: status.classList.contains('error') },
    webmcp: workspaceRegistration?.status() || null,
    ...inspectExtra(),
  };
}

const launcherActions = Object.freeze({
  async refresh({ scope = 'all' } = {}) {
    assertLauncherReady();
    if (!['all', 'applications', 'projects'].includes(scope)) throw new Error('Choose applications, projects or all to refresh.');
    if (scope === 'projects') return refreshProjects();
    try { await loadApplications(); if (scope === 'all') { const result = await refreshProjects(); if (result?.error) return result; } status.classList.remove('error'); status.textContent = scope === 'all' ? 'Applications and project lists refreshed.' : 'Applications refreshed.'; return { refreshed: scope }; }
    catch (error) { status.textContent = error.message; status.classList.add('error'); return { error: error.message }; }
  },
  openApplication({ applicationId, action }) {
    assertLauncherReady(); const controls = applicationControls.get(applicationId);
    if (!controls || !['edit', 'create-project'].includes(action)) throw new Error('Choose an existing registered application card action.');
    const control = enabledControl(action === 'edit' ? controls.edit : controls.create, `${action} for ${applicationId}`);
    if (control.tagName === 'A') { const url = control.href; control.click(); return { navigating: true, url }; }
    openProjectCreateDialog(applicationId, control); return { dialog: 'project-create', state: inspectLauncher() };
  },
  async openProject({ projectId }) {
    assertLauncherReady(); const entry = projectControls.get(projectId);
    if (!entry) throw new Error('Choose a project from the current workspace listing.');
    await showProjects();
    return openProject(entry.project, enabledControl(entry.open, 'Open project'), plainClick);
  },
  deleteProjectFolder({ folder, title, documentCount } = {}) {
    assertLauncherReady();
    if (typeof folder !== 'string' || !/^projects\/(?:[^/]+\/)*[^/]+$/.test(folder)) throw new Error('Choose a project folder inside projects.');
    if (title !== undefined && typeof title !== 'string') throw new Error('Project title must be text.');
    if (documentCount !== undefined && (!Number.isSafeInteger(documentCount) || documentCount < 0)) throw new Error('Project document count must be a non-negative integer.');
    const id = folder.slice('projects/'.length);
    const project = { ...(projectModels.find(candidate => String(candidate.id) === id) || { id, modelId: title || id, documents: [] }), folder };
    const entry = projectControls.get(id);
    requestDelete('project-delete', () => deleteProject(project, entry?.card || null, entry?.delete || null, documentCount));
    return { opened: 'project-delete', projectId: id, folder };
  },
  deleteWorkspaceFolder({ folder } = {}) {
    assertLauncherReady();
    if (typeof folder !== 'string' || !/^projects\/(?:[^/]+\/)*[^/]+$/.test(folder)) throw new Error('Choose a folder inside projects.');
    const id=folder.slice('projects/'.length), project={id,modelId:folder.split('/').at(-1),folder,documents:[]};
    requestDelete('project-delete',()=>deleteProject(project,null,null,undefined,true));
    return {opened:'project-delete',folder};
  },
  chooseModel({ file }) {
    assertLauncherReady('project-open');
    if (!projectOpenDialog.open || !projectChoices?.documents.some(document => document.file === file)) throw new Error('Choose a model file displayed in the current Open project dialog.');
    const link = [...container.querySelectorAll('#project-model-list a')].find(link => link.querySelector('.project-model-filename')?.textContent === file);
    enabledControl(link, 'Model file'); const url = link.href; link.click(); return { navigating: true, url };
  },
  async dialog({ dialog: id, action, applicationId, projectId, name, profileId }) {
    const dialog = launcherDialog(id); assertLauncherReady(action === 'open' ? null : id);
    for (const [key, value] of Object.entries({ applicationId, projectId, name, profileId })) if (value !== undefined && typeof value !== 'string') throw new Error(`${key} must be text.`);
    if (action === 'open') {
      if (visibleLauncherDialogs().length) throw new Error('A launcher dialog is already open.');
      if (id === 'application-create') openApplicationCreateDialog();
      else if (id === 'project-create') return launcherActions.openApplication({ applicationId, action: 'create-project' });
      else if (id === 'application-delete') { const controls = applicationControls.get(applicationId); if (!controls) throw new Error('Choose an application from the current catalog.'); enabledControl(controls.delete, 'Delete application'); requestDelete(id, () => deleteApplication(applicationRegistrations.get(applicationId), controls.card, controls.delete)); }
      else if (id === 'project-delete') { const entry = projectControls.get(projectId); if (!entry) throw new Error('Choose a project from the current listing.'); enabledControl(entry.delete, 'Delete project'); requestDelete(id, () => deleteProject(entry.project, entry.card, entry.delete)); }
      else throw new Error('Use Open project to display its model-choice dialog.');
      return { opened: id, state: inspectLauncher() };
    }
    if (!dialog.open) throw new Error('Open this launcher dialog first.');
    if (action === 'update') {
      if (id === 'application-create') { if (name !== undefined) { enabledControl(applicationCreateName, 'Application name'); applicationCreateName.value = name; updateApplicationCreateName(); } }
      else if (id === 'project-create') {
        if (profileId !== undefined && ![...projectCreateProfile.options].some(option => option.value === profileId && !option.disabled)) throw new Error('Choose a profile offered by this application.');
        if (profileId !== undefined) { enabledControl(projectCreateProfile, 'Model profile'); projectCreateProfile.value = profileId; updateProjectCreateProfile(); }
        if (projectId !== undefined) { enabledControl(projectCreateId, 'Project folder'); projectCreateId.value = projectId; updateProjectCreateId(); }
      } else throw new Error('Only creation dialogs have editable form fields.');
      return { updated: id, state: inspectLauncher() };
    }
    if (action === 'cancel') { const pending = pendingDeletes.get(id); enabledControl(byId(`${id}-cancel`), 'Cancel').click(); return pending ? await pending : { cancelled: true }; }
    if (action === 'submit') {
      enabledControl(byId(`${id}-confirm`), 'Submit');
      if (id === 'application-create') return submitApplicationCreate({ preventDefault: preventSubmit });
      if (id === 'project-create') return submitProjectCreate({ preventDefault: preventSubmit });
      const pending = pendingDeletes.get(id); if (!pending) throw new Error('Request a delete confirmation before submitting it.');
      byId(`${id}-confirm`).click(); return await pending;
    }
    throw new Error('Choose a supported launcher dialog action.');
  },
});

const launcherWebMcpTools = createLauncherWebMcpTools({ inspect: inspectLauncher, actions: launcherActions });
const projectForFolder=folder=>{if(typeof folder!=='string'||!/^projects\/[^/]+$/.test(folder))return null;const id=folder.slice('projects/'.length),project=projectModels.find(project=>String(project.id)===id),controls=projectControls.get(id);return project&&controls?.delete&&!controls.delete.disabled?{id,title:projectTitle(project),documentCount:Array.isArray(project.documents)?project.documents.length:0}:null;};
function registerLauncherWebMcp() { if(lifetime.signal.aborted)return Promise.resolve({state:'disposed'});workspaceRegistration?.dispose(); workspaceRegistration = registerWebMcpTools({ document, navigator, tools: [...launcherWebMcpTools,...extraTools] }); return workspaceRegistration.ready; }
function disposeLauncherWebMcp() { workspaceRegistration?.dispose(); }
function launcherWebMcpStatus() { return workspaceRegistration?.status() || null; }
listen(window,'pagehide', disposeLauncherWebMcp);
listen(window,'pageshow', event => { if (event.persisted) void registerLauncherWebMcp(); });

const ready=(async()=>{
const startupResults = await Promise.allSettled([loadApplications(), loadProjectLists()]);
const startupErrors = startupResults.filter(result => result.status === 'rejected')
  .map(result => result.reason?.message || String(result.reason));
if (startupErrors.length) {
  status.textContent = startupErrors.join(' ');
  status.classList.add('error');
} else {
  status.textContent = '';
}
await registerLauncherWebMcp();
return inspectLauncher();
})();
return Object.freeze({ready,inspect:inspectLauncher,assertReady:assertLauncherReady,projectForFolder,actions:launcherActions,tools:launcherWebMcpTools,webMcpStatus:launcherWebMcpStatus,dispose(){if(launcherUiDisposed)return;for(const id of launcherDialogIds){const dialog=launcherDialog(id);if(dialog?.open)dialog.close('cancel');}disposeLauncherWebMcp();disposeLauncherUi();lifetime.abort();applicationSurface?.dispose();projectSurface?.dispose();modelChoiceSurface?.dispose();profileSurface?.dispose();}});
}


