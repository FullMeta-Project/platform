import uiTreeContract from "./fullmeta-ui-tree-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-tree annotation using the shared UI contract schema. */
export function validateUiTreeAnnotation(annotation, path = "x-fullmeta-ui-tree") {
  return validateUiContractValue(annotation, uiTreeContract, uiTreeContract.properties["x-fullmeta-ui-tree"], path);
}
