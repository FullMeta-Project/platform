/** Workspace tools delegate only to the mounted provider's shared normal commands. */
const object = properties => ({ type: 'object', properties, additionalProperties: false });
const path = { type: 'string', minLength: 1, description: 'Canonical path inside FullMeta, from the current workspace listing.' };
const commandArguments = {
  'workspace.tree.toggle': { properties: { path, expanded: { type: 'boolean' } }, required: ['path'] },
  'workspace.file.select': { properties: { path }, required: ['path'] },
  'workspace.file.open': { properties: { path } },
  'workspace.files.refresh': { properties: { path } },
  'workspace.files.more': { properties: { path }, required: ['path'] },
  'workspace.layout.set': { properties: { layout: { type: 'string', enum: ['stacked', 'columns'] } }, required: ['layout'] },
  'workspace.file.choose': { properties: { path } },
  'workspace.picker.navigate': { properties: { path }, required: ['path'] },
  'workspace.picker.more': { properties: {} },
  'workspace.picker.select': { properties: { path }, required: ['path'] },
  'workspace.picker.accept': { properties: {} },
  'workspace.picker.cancel': { properties: {} },
  'workspace.application.new': { properties: {} },
  'workspace.discover.more': { properties: {} },
  'workspace.project.delete': { properties: { path, title: { type: 'string' }, documentCount: { type: 'integer', minimum: 0 } } },
  'workspace.folder.select': { properties: { path }, required: ['path'] },
  'edit.inspect': { properties: {} },
  'edit.copy': { properties: {} },
  'edit.cut': { properties: {} },
  'edit.paste': { properties: { text: { type: 'string' } }, required: ['text'] },
  'edit.selectAll': { properties: {} },
  'help.open': { properties: { section: { type: 'string', enum: ['docs', 'about'] } } },
  'help.close': { properties: {} },
};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function checkArguments(command, args) {
  const descriptor = commandArguments[command];
  if (!Object.hasOwn(commandArguments, command) || !record(args) || Object.keys(args).some(key => !Object.hasOwn(descriptor.properties, key))) throw new Error('Choose an exposed workspace command and its documented arguments.');
  if (descriptor.required?.some(key => !Object.hasOwn(args, key))) throw new Error('Supply the required workspace command arguments.');
  if (args.path !== undefined && (typeof args.path !== 'string' || !args.path || /[\\:\u0000-\u001f]/.test(args.path) || args.path.startsWith('/') || args.path.split('/').some(part => !part || part === '..' || part === '.' && args.path !== '.'))) throw new Error('Use a canonical path inside the FullMeta workspace.');
  if (args.expanded !== undefined && typeof args.expanded !== 'boolean') throw new Error('expanded must be a boolean.');
  if (command === 'workspace.layout.set' && !['stacked', 'columns'].includes(args.layout)) throw new Error('Choose stacked or columns.');
  if (command === 'edit.paste' && typeof args.text !== 'string') throw new Error('Supply explicit paste text; tool commands do not read the system clipboard.');
  if (command === 'help.open' && args.section !== undefined && !['docs', 'about'].includes(args.section)) throw new Error('Choose docs or about.');
  return args;
}

export function createWorkspaceWebMcpTools({ inspect, dispatch }) {
  if (typeof inspect !== 'function' || typeof dispatch !== 'function') throw new Error('Workspace tools require the mounted provider inspection and normal command dispatcher.');
  return [
    { name: 'fullmeta_workspace_files_inspect', description: 'Inspect the visible FullMeta Explorer: expanded folders, bounded directory pages, current selection/details and pane layout. Reading this state never opens a document or changes files.',
      inputSchema: object({}), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input = {}) => {
        if (!record(input) || Object.keys(input).length) throw new Error('Workspace file inspection takes no arguments.');
        const state = await inspect();
        return { format: 'fullmeta-workspace-files-state/1', ...(state.revision === undefined ? {} : { revision: state.revision }), explorer: state.explorer, layout: state.layout, ...(state.documents === undefined ? {} : { documents: state.documents }), ...(state.selectedProject === undefined ? {} : { selectedProject: state.selectedProject }), ...(state.picker === undefined ? {} : { picker: state.picker }), ...(state.standardMenus === undefined ? {} : { standardMenus: state.standardMenus }), ...(state.busy === undefined ? {} : { busy: state.busy }) };
      } },
    { name: 'fullmeta_workspace_command', description: 'Use the same Explorer, folder cards, pane layout and File menu as the visible workspace. Folder selection never chooses a document implicitly. Open can browse the in-app picker; New application and Delete project open their normal forms/confirmations and require a separate normal submit. Paths must be currently available and document Open uses registered routing. No arbitrary executable, filesystem-write or DOM command is exposed.',
      inputSchema: { ...object({ command: { type: 'string', enum: Object.keys(commandArguments) }, args: { type: 'object' } }), required: ['command'], oneOf: Object.entries(commandArguments).map(([command, descriptor]) => ({ properties: { command: { const: command }, args: { ...object(descriptor.properties), ...(descriptor.required ? { required: descriptor.required } : {}) } }, ...(descriptor.required ? { required: ['args'] } : {}) })) },
      annotations: { readOnlyHint: false, untrustedContentHint: true, consequentialHint: true }, execute: async (input = {}) => {
        if (!record(input) || Object.keys(input).some(key => !['command', 'args'].includes(key)) || typeof input.command !== 'string') throw new Error('Choose a named workspace command and its arguments.');
        return dispatch(input.command, checkArguments(input.command, input.args === undefined ? {} : input.args));
      } },
  ];
}
