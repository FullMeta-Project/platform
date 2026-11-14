import contract from "./fullmeta-ui-quantityVector-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-quantityVector declaration. */
export function validateQuantityVectorAnnotation(annotation, path = "x-fullmeta-ui-quantityVector") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-quantityVector"], path);
}
