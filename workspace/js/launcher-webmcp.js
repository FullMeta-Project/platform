/** Public launcher tools. All effects are delegated to the launcher's normal action handlers. */
const objectSchema = properties => ({ type: 'object', properties, additionalProperties: false });
const text = description => ({ type: 'string', minLength: 1, description });
const choice = values => ({ type: 'string', enum: values });

export function createLauncherWebMcpTools({ inspect, actions }) {
  const invoke = name => async input => {
    const result = await actions[name](input || {});
    if (result?.error) throw new Error(result.error);
    return result;
  };
  return [
    { name: 'fullmeta_workspace_inspect', description: 'Inspect registered applications, available profiles, projects, launcher status and visible dialogs. Returns plain state and action availability without changing files.', inputSchema: objectSchema({}), annotations: { readOnlyHint: true }, execute: async () => inspect() },
    { name: 'fullmeta_workspace_refresh', description: 'Refresh the normal Applications or Projects panels from the workspace catalog and project listing.', inputSchema: objectSchema({ scope: choice(['applications', 'projects', 'all']) }), execute: invoke('refresh') },
    { name: 'fullmeta_workspace_open_application', description: 'Activate an existing application card action: edit its schema or open its normal Create Project form. Only currently registered and enabled card actions are available.', inputSchema: { ...objectSchema({ applicationId: text('Registered application ID from workspace inspection.'), action: choice(['edit', 'create-project']) }), required: ['applicationId', 'action'] }, execute: invoke('openApplication') },
    { name: 'fullmeta_workspace_open_project', description: 'Activate Open project. The normal handler refreshes its model files, opens a sole model, or displays the same model-choice dialog used by a person.', inputSchema: { ...objectSchema({ projectId: text('Project ID from workspace inspection.') }), required: ['projectId'] }, execute: invoke('openProject') },
    { name: 'fullmeta_workspace_choose_model', description: 'Open one of the model files currently displayed in the Open project dialog. The file must be an existing visible choice.', inputSchema: { ...objectSchema({ file: text('Exact model filename from the visible model-choice dialog.') }), required: ['file'] }, execute: invoke('chooseModel') },
    { name: 'fullmeta_workspace_dialog', description: 'Use normal launcher dialogs. Open creation or a delete confirmation; update creation form fields; submit or cancel the visible dialog. Delete open only requests confirmation; a separate submit action activates its visible Delete button. Form validity, busy controls and normal error messages are preserved.', inputSchema: { ...objectSchema({ dialog: choice(['application-create', 'project-create', 'application-delete', 'project-delete', 'project-open']), action: choice(['open', 'update', 'submit', 'cancel']), applicationId: text('Registered application ID for project creation or application deletion.'), projectId: text('Project ID for deletion or project folder text for creation.'), name: { type: 'string', description: 'Raw new application name.' }, profileId: { type: 'string', description: 'Profile ID offered in the visible project creation form.' } }), required: ['dialog', 'action'] }, annotations: { consequentialHint: true }, execute: invoke('dialog') },
  ];
}
