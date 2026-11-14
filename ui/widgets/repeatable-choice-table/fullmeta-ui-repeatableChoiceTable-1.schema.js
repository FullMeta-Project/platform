import contract from "./fullmeta-ui-repeatableChoiceTable-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-repeatableChoiceTable declaration. */
export function validateRepeatableChoiceTableAnnotation(annotation, path = "x-fullmeta-ui-repeatableChoiceTable") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-repeatableChoiceTable"], path);
}
