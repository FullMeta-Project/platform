const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const at=(source,path)=>path.reduce((value,key)=>value?.[key],source);

export function schemaObjectTables(schema) {
  const tables = [];
  const visit = (node, path, depth = 0) => {
    if (!isObject(node) || depth > 32) return;
    if (isObject(node.properties) && Object.keys(node.properties).length) {
      tables.push({ path, title: node.title || path.at(-1) || "Schema root",
        count: Object.keys(node.properties).length });
    }
    for (const key of ["$defs", "properties", "patternProperties"]) {
      if (!isObject(node[key])) continue;
      for (const [name, child] of Object.entries(node[key])) visit(child, [...path, key, name], depth + 1);
    }
    for (const key of ["items", "additionalProperties", "not", "if", "then", "else"]) {
      if (isObject(node[key])) visit(node[key], [...path, key], depth + 1);
    }
    for (const key of ["oneOf", "anyOf", "allOf", "prefixItems"]) {
      if (Array.isArray(node[key])) node[key].forEach((child, index) => visit(child, [...path, key, index], depth + 1));
    }
  };
  visit(schema, []);
  return tables;
}

export function simpleFilter(reference) {
  const filter = reference?.targetSchema;
  if (!isObject(filter) || filter.type !== "object" || !isObject(filter.properties)
    || Object.keys(filter.properties).length !== 1 || !Array.isArray(filter.required)
    || filter.required.length !== 1) return null;
  const key = Object.keys(filter.properties)[0];
  if (filter.required[0] !== key || typeof filter.properties[key]?.const !== "string") return null;
  return { property: key, value: filter.properties[key].const };
}

export function annotationDraft(declaration) {
  const hasBehavior = isObject(declaration["x-fullmeta-ui-behavior"]);
  const behavior = hasBehavior
    ? declaration["x-fullmeta-ui-behavior"] : {};
  const payload = isObject(behavior.payload) ? behavior.payload : {};
  const presentation = isObject(payload.presentation) ? payload.presentation
    : !hasBehavior && isObject(declaration["x-fullmeta-ui"]) ? declaration["x-fullmeta-ui"] : {};
  const widget = isObject(payload.widget) ? payload.widget : {};
  const reference = isObject(declaration["x-fullmeta-modelReference"])
    ? declaration["x-fullmeta-modelReference"] : {};
  const filter = simpleFilter(reference);
  return {
    widget: typeof widget.type === "string" ? widget.type : "",
    hidden: presentation.hidden === true,
    choiceSource: typeof presentation.choicesBySiblingProperty === "string"
      ? presentation.choicesBySiblingProperty : "",
    unitGroup: typeof widget.settings?.unitGroup === "string" ? widget.settings.unitGroup : "",
    defaultJson: Object.hasOwn(declaration, "default") ? JSON.stringify(declaration.default) : "",
    referenceScope: typeof reference.scope === "string" ? reference.scope : "",
    referencePath: Array.isArray(reference.targetPath) ? reference.targetPath.join(".") : "",
    referenceLabel: typeof reference.targetLabel === "string" ? reference.targetLabel : "",
    filterProperty: filter?.property || "",
    filterValue: filter?.value || "",
    complexFilter: Object.hasOwn(reference, "targetSchema") && !filter,
    sliceSettings: widget.type === "tabularSliceSelector" && isObject(widget.settings)
      ? clone(widget.settings) : null,
    quantityValidation: isObject(declaration["x-fullmeta-quantityValidation"])
      ? clone(declaration["x-fullmeta-quantityValidation"]) : null,
    description: typeof declaration.description === "string" ? declaration.description : "",
  };
}

export function setPresentation(declaration, draft, baseline) {
  const presentationChanged = draft.hidden !== baseline.hidden
    || draft.choiceSource !== baseline.choiceSource;
  const widgetTypeChanged = draft.widget !== baseline.widget;
  const unitGroupChanged = draft.unitGroup !== baseline.unitGroup;
  const sliceChanged = !same(draft.sliceSettings, baseline.sliceSettings);
  const widgetChanged = widgetTypeChanged || unitGroupChanged || sliceChanged;
  if (!presentationChanged && !widgetChanged) return;
  const existingBehavior = isObject(declaration["x-fullmeta-ui-behavior"]);
  const behavior = existingBehavior
    ? clone(declaration["x-fullmeta-ui-behavior"]) : {
      format: "fullmeta-ui-behavior/1", target: { kind: "field" },
      context: "projectEditing", payload: {},
    };
  if (!isObject(behavior.payload)) behavior.payload = {};
  if (presentationChanged || (!existingBehavior && isObject(declaration["x-fullmeta-ui"]))) {
    const presentation = isObject(behavior.payload.presentation) ? clone(behavior.payload.presentation)
      : isObject(declaration["x-fullmeta-ui"]) ? clone(declaration["x-fullmeta-ui"]) : {};
    if (draft.hidden !== baseline.hidden) {
      if (draft.hidden) presentation.hidden = true;
      else delete presentation.hidden;
    }
    if (draft.choiceSource !== baseline.choiceSource) {
      if (draft.choiceSource.trim()) presentation.choicesBySiblingProperty = draft.choiceSource.trim();
      else delete presentation.choicesBySiblingProperty;
    }
    if (Object.keys(presentation).length) behavior.payload.presentation = presentation;
    else delete behavior.payload.presentation;
  }
  if (widgetChanged) {
    const widget = isObject(behavior.payload.widget) ? clone(behavior.payload.widget) : {};
    if (draft.widget) {
      if (widgetTypeChanged) widget.settings = {};
      widget.type = draft.widget;
      if (!isObject(widget.settings)) widget.settings = {};
      if (draft.widget === "tabularSliceSelector" && isObject(draft.sliceSettings))
        widget.settings = clone(draft.sliceSettings);
      if (unitGroupChanged || widgetTypeChanged) {
        if (draft.unitGroup.trim()) widget.settings.unitGroup = draft.unitGroup.trim();
        else delete widget.settings.unitGroup;
      }
      behavior.payload.widget = widget;
    } else delete behavior.payload.widget;
  }
  if (Object.keys(behavior.payload).length || isObject(declaration["x-fullmeta-ui"]))
    declaration["x-fullmeta-ui-behavior"] = behavior;
  else delete declaration["x-fullmeta-ui-behavior"];
}

export function setReference(declaration, draft, baseline) {
  const keys = ["referenceScope", "referencePath", "referenceLabel", "filterProperty", "filterValue"];
  if (!keys.some(key => draft[key] !== baseline[key])) return;
  const pathChanged = draft.referencePath !== baseline.referencePath;
  const filterChanged = draft.filterProperty !== baseline.filterProperty || draft.filterValue !== baseline.filterValue;
  const existing = isObject(declaration['x-fullmeta-modelReference']);
  if ((pathChanged || !existing) && !draft.referencePath.trim()) {
    if ([draft.referenceScope, draft.referenceLabel, draft.filterProperty, draft.filterValue]
      .some(value => value.trim())) throw new Error("Enter a reference target path before setting its scope, label, or filter.");
    delete declaration["x-fullmeta-modelReference"];
    return;
  }
  if (filterChanged && Boolean(draft.filterProperty.trim()) !== Boolean(draft.filterValue.trim())) {
    throw new Error("Enter both the reference filter property and its value.");
  }
  const reference = isObject(declaration["x-fullmeta-modelReference"])
    ? clone(declaration["x-fullmeta-modelReference"]) : {};
  if (pathChanged || !existing) {
    const targetPath = draft.referencePath.trim().split('.').map(part => part.trim());
    if (targetPath.some(part => !part || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(part)))
      throw new Error('Reference source paths must use dotted property keys, such as mesh.periodicPairs.');
    reference.targetPath = targetPath;
  }
  if (draft.referenceScope !== baseline.referenceScope) {
    if (draft.referenceScope) reference.scope = draft.referenceScope;
    else delete reference.scope;
  }
  if (draft.referenceLabel !== baseline.referenceLabel) {
    if (draft.referenceLabel.trim()) reference.targetLabel = draft.referenceLabel.trim();
    else delete reference.targetLabel;
  }
  if (baseline.complexFilter && filterChanged) {
    throw new Error("This field has a compound reference filter. Edit it in the structured field editor.");
  }
  if (!baseline.complexFilter && filterChanged) {
    if (draft.filterProperty.trim()) {
      const property = draft.filterProperty.trim();
      const previous = isObject(reference.targetSchema) ? reference.targetSchema : {};
      const oldProperty = previous.properties?.[baseline.filterProperty];
      reference.targetSchema = { ...clone(previous), type: 'object', required: [property],
        properties: { [property]: { ...(isObject(oldProperty) ? clone(oldProperty) : {}), const: draft.filterValue.trim() } } };
    } else delete reference.targetSchema;
  }
  declaration["x-fullmeta-modelReference"] = reference;
}

export function schemaWithBulkAnnotations(schema, targetPath, edits) {
  const candidate = clone(schema), table = at(candidate, targetPath);
  if (!isObject(table?.properties)) throw new Error("Choose an object declaration with property fields.");
  for (const edit of edits) {
    const declaration = table.properties[edit.key];
    if (!isObject(declaration)) throw new Error(`Field ${edit.key} changed after the table opened.`);
    const baseline = annotationDraft(at(schema, [...targetPath, "properties", edit.key]));
    const draft = edit.values;
    if (same(draft, baseline)) continue;
    if (draft.unitGroup !== baseline.unitGroup && draft.unitGroup.trim()
      && !["quantity", "quantityVector"].includes(draft.widget)) {
      throw new Error(`${edit.key}: a unit group requires the Quantity or Quantity vector widget.`);
    }
    if (draft.widget === "tabularSliceSelector") {
      const settings = draft.sliceSettings;
      const source = settings?.dataSource;
      if (!isObject(settings) || !["fixed", "slice"].includes(settings.selectionMode)
        || !isObject(source) || !["root", "document", "component", "engine", "runtime"].includes(source.scope)
        || !Array.isArray(source.path) || !source.path.length
        || source.path.some(part => typeof part !== "string" || !part.trim())) {
        throw new Error(`${edit.key}: enter a selection mode and a data source scope and path in Edit slice settings.`);
      }
      if (settings.selectionMode === "slice" && !settings.varyingColumnProperty) {
        throw new Error(`${edit.key}: slice mode needs a varying column property.`);
      }
    }
    if (draft.defaultJson !== baseline.defaultJson) {
      if (draft.defaultJson.trim()) {
        try { declaration.default = JSON.parse(draft.defaultJson); }
        catch { throw new Error(`${edit.key}: default must be valid JSON.`); }
      } else delete declaration.default;
    }
    if (draft.description !== baseline.description) {
      if (draft.description.trim()) declaration.description = draft.description.trim();
      else delete declaration.description;
    }
    if (!same(draft.quantityValidation, baseline.quantityValidation)) {
      if (draft.quantityValidation === null) delete declaration["x-fullmeta-quantityValidation"];
      else {
        if (!isObject(draft.quantityValidation)
          || typeof draft.quantityValidation.unit !== "string"
          || !draft.quantityValidation.unit.trim()) {
          throw new Error(`${edit.key}: quantity validation needs a unit.`);
        }
        declaration["x-fullmeta-quantityValidation"] = clone(draft.quantityValidation);
      }
    }
    setPresentation(declaration, draft, baseline);
    setReference(declaration, draft, baseline);
  }
  return candidate;
}

export function isSimpleAssert(rule) {
  return isObject(rule) && Object.hasOwn(rule, "assert")
    && Object.keys(rule).every(key => ["assert", "message", "when"].includes(key));
}

export function simpleRule(statement, index) {
  if (isSimpleAssert(statement)) return { index, rule: statement, source: "", path: "", alias: "" };
  if (!isObject(statement) || !isObject(statement.forEach) || !Array.isArray(statement.rules)
    || statement.rules.length !== 1 || !isSimpleAssert(statement.rules[0])
    || Object.keys(statement).some(key => !["forEach", "as", "rules"].includes(key))
    || Object.keys(statement.forEach).some(key => !["from", "path"].includes(key))
    || !["root", "model"].includes(statement.forEach.from)) return null;
  const path = Array.isArray(statement.forEach.path) ? statement.forEach.path.join("/")
    : String(statement.forEach.path || "").replace(/^\//, "");
  return { index, rule: statement.rules[0], source: statement.forEach.from,
    path, alias: statement.as || "item" };
}

export function statementFromRow(row) {
  let assertion;
  try { assertion = JSON.parse(row.assertion.trim()); }
  catch { throw new Error("Every assertion expression must be valid JSON."); }
  const rule = { assert: assertion };
  if (row.message.trim()) rule.message = row.message.trim();
  if (row.when.trim()) {
    try { rule.when = JSON.parse(row.when); }
    catch { throw new Error("A When expression must be valid JSON."); }
  }
  if (!row.path.trim()) return rule;
  if (!row.source) throw new Error("Choose the collection source for a scoped assertion.");
  const path = row.path.trim().replace(/^\//, "");
  if (!path || path.split("/").some(part => !part)) throw new Error("Enter a collection path such as model/physics/*.");
  const alias = row.alias.trim() || "item";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) throw new Error("The scope variable must be a valid name.");
  return { as: alias, forEach: { from: row.source, path: `/${path}` }, rules: [rule] };
}

export function schemaWithBulkValidationRules(schema, programKey, edits) {
  const candidate = clone(schema);
  if (!candidate[programKey]) candidate[programKey] = { maximumErrors: 80, rules: [] };
  const program = candidate[programKey];
  if (!isObject(program) || !Array.isArray(program.rules)) throw new Error("The selected validation program has no rules list.");
  const existing = new Map(edits.filter(edit => Number.isInteger(edit.index)).map(edit => [edit.index, edit]));
  program.rules = program.rules.flatMap((statement, index) => {
    const edit = existing.get(index);
    if (!edit) return [statement];
    if (!simpleRule(statement, index)) throw new Error("A complex rule changed after this table opened.");
    return edit.remove ? [] : [statementFromRow(edit)];
  });
  for (const edit of edits) if (!Number.isInteger(edit.index) && !edit.remove) program.rules.push(statementFromRow(edit));
  return candidate;
}