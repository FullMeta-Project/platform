import contract from "./fullmeta-ui-scan-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-scan declaration. */
export function validateScanAnnotation(annotation, path = "x-fullmeta-ui-scan") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-scan"], path);
}
