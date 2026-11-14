import contract from "./fullmeta-ui-valueControl-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

export function validateValueControlAnnotation(annotation, path = "x-fullmeta-ui-valueControl") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-valueControl"], path);
}
