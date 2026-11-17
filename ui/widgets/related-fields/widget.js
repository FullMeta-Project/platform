// Generated from widget.jsx by scripts/build-frontend.mjs.
import React from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { renderLegacyWidgetMarkup } from "../shared/react/render-markup.js";
import { relatedFieldsDesignLabel, renderRelatedFieldsDesignEditor } from "./design-editor.js";
import { validateRelatedFieldsAnnotation } from "./fullmeta-ui-relatedFields-1.schema.js";
function RelatedFields({ label, value, path = [], schema = {}, context = {}, ui = {}, renderObject, onCommand, siblings }) {
  const related = siblings || (ui.siblings || []).flatMap(({ path: siblingPath, label: siblingLabel }) => {
    const siblingSchema = context.schemaAtPath?.(siblingPath);
    if (!siblingSchema) return [];
    const resolved = context.resolveSchema?.(siblingSchema) || {};
    return [{
      label: siblingLabel || resolved.title || siblingPath.at(-1),
      value: siblingPath.reduce((current, key) => current?.[key], context.rootValue) ?? {},
      path: siblingPath,
      schemaNode: siblingSchema,
      context
    }];
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, label)), renderObject?.({ value, path, schemaNode: schema, context, onCommand }), related.map((sibling, index) => {
    const onSiblingCommand = (command, event) => onCommand?.({ ...command, rootPath: true }, event);
    const rows = renderObject?.({ ...sibling, context: { ...sibling.context, rootSettingPath: true }, onCommand: onSiblingCommand });
    if (!rows) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, { key: sibling.id || JSON.stringify(sibling.path) || index }, /* @__PURE__ */ React.createElement("tr", { className: "settings-group" }, /* @__PURE__ */ React.createElement("th", { colSpan: 2 }, sibling.label)), rows);
  }));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(RelatedFields, { ...props, ...props.view });
}
const renderRelatedFields = (props) => renderLegacyWidgetMarkup(RelatedFields, props, ["renderObject"]);
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  RelatedFields,
  Widget,
  mountWidget,
  relatedFieldsDesignLabel,
  renderRelatedFields,
  renderRelatedFieldsDesignEditor,
  validateRelatedFieldsAnnotation
};

//# sourceMappingURL=widget.js.map
