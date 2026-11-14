/** Versioned development transport. All behavior still goes through the editor controller. */
export const editorBridgeFormat = 'fullmeta-editor-bridge/1';
export const editorBridgeActions = Object.freeze(['inspect', 'state', 'command', 'replay', 'checkpoint', 'restore', 'mode']);
export const editorBridgeReadActions = Object.freeze(['inspect', 'state']);
export function assertEditorBridgeRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== editorBridgeFormat) throw new Error(`Use ${editorBridgeFormat} requests.`);
  if (!editorBridgeActions.includes(value.action)) throw new Error('Choose a supported editor bridge action.');
  if (!value.args || typeof value.args !== 'object' || Array.isArray(value.args)) throw new Error('Bridge action args must be a JSON record.');
  if (typeof value.revision !== 'string' || !value.revision) throw new Error('Include the visible browser frontend revision.');
  return value;
}
