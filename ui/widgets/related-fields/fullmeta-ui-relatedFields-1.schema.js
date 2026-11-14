import contract from "./fullmeta-ui-relatedFields-1.schema.json" with { type: "json" };
import { validateUiContractValue } from "../../schemas/contract-validation.js";

export function validateRelatedFieldsAnnotation(annotation, path = "x-fullmeta-ui-relatedFields") {
  return validateUiContractValue(annotation, contract, contract.properties["x-fullmeta-ui-relatedFields"], path);
}
