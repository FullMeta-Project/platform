import contract from "./fullmeta-ui-dynamicPropertySet-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-dynamicPropertySet declaration. */
export function validateDynamicPropertySetAnnotation(annotation, path = "x-fullmeta-ui-dynamicPropertySet") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-dynamicPropertySet"], path);
}
