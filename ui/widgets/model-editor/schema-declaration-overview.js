/** Read-only, source-anchored summaries of schema declaration fields. */
import { schemaWidgetDesignContext } from './schema-widget-context.js';
import { schemaWidget } from "../shared/schema-widget.js";
import { legacyFieldUiView } from "../../annotation-language.js";

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim() ? value.trim() : '';

function readableKey(key) {
  return String(key ?? 'Schema').replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ').replace(/^./, first => first.toUpperCase());
}

function configuredProfile(parts, widgetProfiles) {
  if (!isRecord(widgetProfiles)) return null;
  for (const part of parts) {
    const widget = schemaWidget(part.schema);
    if (widget && isRecord(widgetProfiles[widget])) return widgetProfiles[widget];
    const matches = Object.values(widgetProfiles).filter(profile =>
      isRecord(profile) && nonempty(profile.annotation)
      && Object.hasOwn(part.schema, profile.annotation));
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function resolvedText(parts, key) {
  return parts.map(part => nonempty(part.schema?.[key])).find(Boolean) || '';
}

function declarationLabel(parts, key) {
  return resolvedText(parts, 'title') || readableKey(key);
}

function variantLabel(parts, index) {
  const title = resolvedText(parts, 'title');
  if (title) return title;

  // A single constant, often the object discriminator, gives an otherwise
  // unnamed branch a useful label without interpreting application fields.
  const constants = new Set();
  for (const part of parts) {
    const schemas = [part.schema, ...Object.values(isRecord(part.schema.properties)
      ? part.schema.properties : {})];
    for (const schema of schemas) {
      if (!isRecord(schema)) continue;
      const value = schema.const ?? (Array.isArray(schema.enum) && schema.enum.length === 1
        ? schema.enum[0] : undefined);
      if (typeof value === 'string' && value.trim()) constants.add(value.trim());
    }
  }
  return constants.size === 1 ? readableKey([...constants][0]) : `Option ${index + 1}`;
}

function ambiguous(parts) {
  return parts.some(part => ['oneOf', 'anyOf', 'prefixItems']
    .some(key => Object.hasOwn(part.schema, key)));
}

function fieldsFrom(parts, context, widgetProfiles, options) {
  const required = new Set(parts.flatMap(part =>
    Array.isArray(part.schema.required) ? part.schema.required.filter(name => typeof name === 'string') : []));
  const fields = new Map();
  for (const part of parts) {
    if (!isRecord(part.schema.properties)) continue;
    for (const key of Object.keys(part.schema.properties)) {
      if (fields.has(key)) continue;
      const declaration = context.child(part, 'properties', key);
      const propertyParts = declaration ? context.resolve(declaration).parts : [];
      fields.set(key, {
        key,
        label: options.propertyLabels === true
          ? declarationLabel(propertyParts, key) : key,
        description: options.propertyDescriptions === true
          ? resolvedText(propertyParts, 'description') : '',
        required: required.has(key),
        previewable: !propertyParts.some(propertyPart =>
          Object.hasOwn(propertyPart.schema, 'const')
          || (Array.isArray(propertyPart.schema.enum) && propertyPart.schema.enum.length === 1)
          || legacyFieldUiView(propertyPart.schema)['x-fullmeta-ui']?.hidden === true),
        file: part.file,
        path: [...part.path, 'properties', key],
      });
    }
  }
  return [...fields.values()];
}

/**
 * Describe the immediate fields of an object or of one array item. The overview
 * is only a presentation of existing schema declarations; field paths always
 * point to the document that owns the editable property declaration.
 */
export function schemaDeclarationOverview({
  document, file, path = [], configuration, widgetProfiles,
} = {}) {
  const context = schemaWidgetDesignContext({ document, file, path });
  const source = context.parts[0];
  const parts = source ? context.resolve(source).parts : [];
  const globalOptions = isRecord(configuration?.declarationOverview)
    ? configuration.declarationOverview : isRecord(configuration) ? configuration : {};
  const profile = configuredProfile(parts, widgetProfiles);
  const options = { ...globalOptions, ...(isRecord(profile?.declarationOverview) ? profile.declarationOverview : {}) };
  const fallbackKey = path.at(-1) ?? 'Schema';
  const result = {
    label: declarationLabel(parts, fallbackKey),
    description: resolvedText(parts, 'description'),
    kind: null,
    heading: '',
    fields: [],
    variants: [],
    maxPreviewFields: Number.isInteger(options.maxPreviewFields) && options.maxPreviewFields >= 0
      ? options.maxPreviewFields : 0,
  };
  if (!parts.length) return result;

  // Describe only one unambiguous choice group. Multiple oneOf/anyOf groups
  // can combine through allOf, so listing their branches as one menu would
  // misrepresent the source schema.
  if (options.variantOptions === true) {
    const groups = parts.flatMap(part => ['oneOf', 'anyOf']
      .filter(key => Array.isArray(part.schema[key]))
      .map(key => ({ part, key, branches: part.schema[key] })));
    if (groups.length === 1 && groups[0].branches.length >= 2) {
      const { part, key, branches } = groups[0];
      const variants = branches.map((_, index) => {
        const branch = context.child(part, key, index);
        if (!branch) return null;
        const branchParts = context.resolve(branch).parts;
        return {
          label: variantLabel(branchParts, index),
          description: resolvedText(branchParts, 'description'),
          file: branch.file,
          path: branch.path,
          fields: ambiguous(branchParts) ? [] : fieldsFrom(branchParts, context, widgetProfiles, options),
        };
      });
      if (variants.every(Boolean)) {
        result.kind = 'choices';
        result.heading = nonempty(options.variantHeading);
        result.variants = variants;
        return result;
      }
    }
  }
  if (ambiguous(parts)) return result;

  const itemParts = [];
  for (const part of parts) {
    if (!isRecord(part.schema.items)) continue;
    const item = context.child(part, 'items');
    if (item) itemParts.push(...context.resolve(item).parts);
  }
  if (itemParts.length) {
    if (options.arrayItemFields !== true || ambiguous(itemParts)) return result;
    result.fields = fieldsFrom(itemParts, context, widgetProfiles, options);
    if (!result.fields.length) return result;
    result.kind = 'array';
    result.heading = nonempty(options.arrayHeading);
    return result;
  }

  if (parts.some(part => part.schema.type === 'array' || Object.hasOwn(part.schema, 'items'))) return result;
  if (options.nestedObjectFields !== true) return result;
  result.fields = fieldsFrom(parts, context, widgetProfiles, options);
  if (!result.fields.length) return result;
  result.kind = 'object';
  result.heading = nonempty(options.nestedHeading);
  return result;
}
