import {legacyFieldUiView} from '../annotation-language.js';
import {schemaWidgetOptions} from '../widgets/shared/schema-widget.js';
/** Visibility and optional-presence projection shared by object headings and child controls. */
export function projectSchemaObjectFields({value,path=[],schemaNode,context={},skip=[]}){
  const schema=legacyFieldUiView(context.resolveSchema?.(schemaNode)||schemaNode||{}),fields=[];
  for(const [key,propertyNode] of Object.entries(schema.properties||{})){
    if(skip.includes(key)||context.resolveSchema?.(propertyNode)===false)continue;
    const propertySchema=legacyFieldUiView(context.resolveSchema?.(propertyNode)||propertyNode||{}),ui=schemaWidgetOptions(propertySchema);
    if(ui.hidden||ui.hiddenWhenSiblingPropertyEquals&&value?.[ui.hiddenWhenSiblingPropertyEquals.property]===ui.hiddenWhenSiblingPropertyEquals.value)continue;
    const present=Object.hasOwn(value||{},key),showDefault=(ui.showDefault===true||ui.defaultWhenSiblingPropertyPresent&&Object.hasOwn(value||{},ui.defaultWhenSiblingPropertyPresent))&&Object.hasOwn(propertySchema,'default');
    const toggle=Boolean(ui.optionalToggleLabel&&(present||!showDefault));
    const discriminator=key==='type'&&(Object.hasOwn(propertySchema,'const')||propertySchema.enum?.length===1);
    const showField=(present||showDefault)&&!discriminator;
    if(toggle||showField)fields.push({key,propertyNode,propertySchema,ui,present,showDefault,toggle,showField,path:[...path,key],value:present?value[key]:propertySchema.default});
  }
  return fields;
}
