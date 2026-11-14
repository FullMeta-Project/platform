import contract from "./fullmeta-ui-quantity-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-quantity declaration. */
export function validateQuantityAnnotation(annotation, path = "x-fullmeta-ui-quantity") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-quantity"], path);
}
