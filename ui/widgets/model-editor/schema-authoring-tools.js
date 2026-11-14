/** The interpreting schema chooses authoring tools; the host supplies document commands. */
export function declaredSchemaAuthoringTools(presentation, { widgetCatalog, commands } = {}) {
  const entries = presentation?.tools || [];
  if (!Array.isArray(entries)) throw new Error('Schema authoring tools must be a table.');
  const ids = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry !== 'object' || !/^[a-z][a-z0-9-]*$/.test(entry.id || '')
      || typeof entry.label !== 'string' || !entry.label || typeof entry.group !== 'string' || !entry.group
      || ids.has(entry.id)) throw new Error('Each authoring tool needs a unique command ID, label and group.');
    ids.add(entry.id);
    if (commands && (!Object.hasOwn(commands, entry.id) || typeof commands[entry.id] !== 'function')) throw new Error(`Unknown schema authoring command ${entry.id}.`);
    if (commands && (commands[entry.id].widget !== entry.widget || commands[entry.id].entry !== entry.entry)) {
      throw new Error(`Authoring command ${entry.id} does not implement the declared widget entry.`);
    }
    if (entry.widget !== undefined || entry.entry !== undefined) {
      const widget = widgetCatalog?.widgets.find(widget => widget.id === entry.widget);
      if (!widget || !widget.exports.includes(entry.entry)
        || !widget.authoring?.tools?.some(tool => tool.entry === entry.entry)) {
        throw new Error(`Authoring tool ${entry.id} must name an authoring entry in widget ${entry.widget}.`);
      }
    }
    return { ...entry };
  });
}
