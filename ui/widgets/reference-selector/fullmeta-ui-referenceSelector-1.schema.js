import contract from "./fullmeta-ui-referenceSelector-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-referenceSelector declaration. */
export function validateReferenceSelectorAnnotation(annotation, path = "x-fullmeta-ui-referenceSelector") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-referenceSelector"], path);
}

/** Validate the generic option records supplied by an application host. */
export function validateReferenceSelectorOptions(options, path = "options") {
  return validateUiContractValue(options, contract, contract.$defs.optionList, path);
}
