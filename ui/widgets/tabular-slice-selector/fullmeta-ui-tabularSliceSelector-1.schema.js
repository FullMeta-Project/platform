import contract from "./fullmeta-ui-tabularSliceSelector-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-tabularSliceSelector declaration. */
export function validateTabularSliceSelectorAnnotation(annotation, path = "x-fullmeta-ui-tabularSliceSelector") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-tabularSliceSelector"], path);
}
