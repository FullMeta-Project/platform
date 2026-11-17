// Generated from widget.jsx by scripts/build-frontend.mjs.
import { createValidationExpressionDialog } from "./expression-dialog.js";
import { createValidationExpressionInput } from "./expression-input.js";
import { validationOperationNames, validationTextCompletions, sameValidationExpression, parseValidationExpression, printableValidationExpression, losslessValidationExpression, validationExpressionVariables, validationExpressionReadTargets, validationAssertionEditIssue } from "./expression-language.js";
import { validationEditDraftIssue, validationRulePointerParts, validationRuleAtPointer, documentWithValidationAssertion, documentWithValidationEdits } from "./expression-source.js";
import { validationRuleRecipeFromRule, validationRuleFromRecipe, createValidationRuleRecipeTable } from "./recipe-editor.js";
import { semanticAssertions, createValidationProgramDesigner } from "./runtime.js";
import { createValidationProgramTableDialog, validationStatementFromDraft, validationProgramDraft } from "./table-editor.js";
import { validationRulesFromJson, validationRuleImportTemplates, validationRuleChangeCounts } from "./json-import.js";
import { validationProgramWithImportedRules } from "./table-editor.js";
import { validationRuleRecipeTemplates, createValidationRuleRecipeRow } from "./recipe-editor.js";
import { validationProgramDiagnostics, assertValidationProgramSemantics } from "./semantic-validation.js";
import { fullMetaValidationProgramKeys, isFullMetaValidationProgram, isFullMetaValidationProgramKey } from "./program-contract.js";
import {
  declarativeValidationFormat,
  declarativeRuleSources,
  declarativeConstraintTypes,
  createDeclarativeObligation,
  compileDeclarativeValidation,
  declarativeValidationDiagnostics,
  declarativeProgramState,
  equivalentDeclarativeObligations,
  compareDeclarativeObligations,
  compareConditions,
  programWithDeclarativeObligations,
  declarativeDocumentDiagnostics,
  assertDeclarativeDocument
} from "./declarative-rules.js";
import { createDeclarativeRuleAuthoring } from "./declarative-editor.js";
import { declarativeValidationDefinitions, declarativeValidationProgramSchema } from "./declarative-schema.js";
import React, { useLayoutEffect, useReducer, useRef } from "../shared/react/react-runtime.js";
import { mountReactComponent } from "../shared/react/mount.js";
import { DeclarativeView, createDeclarativeRuleAuthoring as createDeclarativeRuleAuthoring2 } from "./declarative-editor.js";
import { DeclarativeView as DeclarativeView2, sortDeclarativeRows } from "./declarative-editor.js";
import { ValidationProgramTable } from "./table-editor.js";
import { ValidationDialog, ValidationRecipeRow, ValidationRecipeTable } from "./recipe-editor.js";
import { ValidationExpressionInput, validationExpressionTokens } from "./expression-input.js";
import { ValidationExpressionDialog } from "./expression-dialog.js";
import { ValidationDesignerTree, ValidationDesignerSettings } from "./designer.js";
function ValidationProgram({ view, onCommand, program, pickPath }) {
  const [, refresh] = useReducer((value) => value + 1, 0), presentation = useRef(null), controller = useRef(null), live = useRef(false), command = useRef(onCommand);
  command.current = onCommand;
  if (!controller.current) controller.current = createDeclarativeRuleAuthoring2({
    renderView(next) {
      presentation.current = next;
      if (live.current) refresh();
    },
    pickPath,
    onChange() {
      command.current?.({ type: "widget.action", widget: "validationProgram", path: view?.path || [], action: "draftChanged", args: { snapshot: controller.current.snapshot() } });
    }
  });
  useLayoutEffect(() => {
    live.current = true;
    controller.current.load(view?.program || view?.value || program || { maximumErrors: 80, rules: [] }, { programKey: view?.programKey || "x-fullmeta-rules" });
    return () => {
      live.current = false;
    };
  }, [view?.program, view?.value, program]);
  return /* @__PURE__ */ React.createElement("section", { "data-jsx-widget": "validation-program" }, /* @__PURE__ */ React.createElement(DeclarativeView, { ...presentation.current }));
}
function Widget(props) {
  return /* @__PURE__ */ React.createElement(ValidationProgram, { ...props });
}
const mountWidget = (container, props) => mountReactComponent(container, Widget, props);
export {
  DeclarativeView2 as DeclarativeView,
  ValidationDesignerSettings,
  ValidationDesignerTree,
  ValidationDialog,
  ValidationExpressionDialog,
  ValidationExpressionInput,
  ValidationProgram,
  ValidationProgramTable,
  ValidationRecipeRow,
  ValidationRecipeTable,
  Widget,
  assertDeclarativeDocument,
  assertValidationProgramSemantics,
  compareConditions,
  compareDeclarativeObligations,
  compileDeclarativeValidation,
  createDeclarativeObligation,
  createDeclarativeRuleAuthoring,
  createValidationExpressionDialog,
  createValidationExpressionInput,
  createValidationProgramDesigner,
  createValidationProgramTableDialog,
  createValidationRuleRecipeRow,
  createValidationRuleRecipeTable,
  declarativeConstraintTypes,
  declarativeDocumentDiagnostics,
  declarativeProgramState,
  declarativeRuleSources,
  declarativeValidationDefinitions,
  declarativeValidationDiagnostics,
  declarativeValidationFormat,
  declarativeValidationProgramSchema,
  documentWithValidationAssertion,
  documentWithValidationEdits,
  equivalentDeclarativeObligations,
  fullMetaValidationProgramKeys,
  isFullMetaValidationProgram,
  isFullMetaValidationProgramKey,
  losslessValidationExpression,
  mountWidget,
  parseValidationExpression,
  printableValidationExpression,
  programWithDeclarativeObligations,
  sameValidationExpression,
  semanticAssertions,
  sortDeclarativeRows,
  validationAssertionEditIssue,
  validationEditDraftIssue,
  validationExpressionReadTargets,
  validationExpressionTokens,
  validationExpressionVariables,
  validationOperationNames,
  validationProgramDiagnostics,
  validationProgramDraft,
  validationProgramWithImportedRules,
  validationRuleAtPointer,
  validationRuleChangeCounts,
  validationRuleFromRecipe,
  validationRuleImportTemplates,
  validationRulePointerParts,
  validationRuleRecipeFromRule,
  validationRuleRecipeTemplates,
  validationRulesFromJson,
  validationStatementFromDraft,
  validationTextCompletions
};

//# sourceMappingURL=widget.js.map
