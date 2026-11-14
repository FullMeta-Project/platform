import { createJsonChoiceTable } from "../json-choice-table/widget.js";

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Mount the shared typed-choice editor for a JSON Schema declaration's local
 * enum. The snapshot retains unfinished rows across settings rerenders; read
 * and commit reject invalid rows before the document can be saved.
 */
export function mountSchemaChoiceAuthoring({
  container, declaration, state, onDraftChange,
} = {}) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new Error("Choose a container for the allowed-values editor.");
  }
  if (!isObject(declaration)) {
    throw new Error("Allowed values belong to a JSON Schema object.");
  }

  const editor = createJsonChoiceTable({
    value: declaration.enum,
    state,
    label: "Allowed values",
    onChange: snapshot => onDraftChange?.(snapshot),
  });
  container.replaceChildren(editor.element);

  return {
    element: editor.element,
    snapshot: () => editor.snapshot(),
    read: () => editor.read(),
    dispose: () => editor.dispose?.(),
    commit(source = declaration) {
      if (!isObject(source)) throw new Error("Allowed values belong to a JSON Schema object.");
      const values = editor.read();
      const next = structuredClone(source);
      if (values === undefined) delete next.enum;
      else next.enum = values;
      return next;
    },
  };
}
