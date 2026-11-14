import contract from "./fullmeta-ui-keyedChoiceMatrix-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

/** Validate an x-fullmeta-ui-keyedChoiceMatrix declaration. */
export function validateKeyedChoiceMatrixAnnotation(annotation, path = "x-fullmeta-ui-keyedChoiceMatrix") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-keyedChoiceMatrix"], path);
}
