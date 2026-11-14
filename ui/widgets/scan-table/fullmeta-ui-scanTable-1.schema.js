import contract from "./fullmeta-ui-scanTable-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-scanTable declaration. */
export function validateScanTableAnnotation(annotation, path = "x-fullmeta-ui-scanTable") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-scanTable"], path);
}
