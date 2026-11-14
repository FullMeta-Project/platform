const wasmUrl = new URL("../wasm/fullmeta-core.wasm", import.meta.url);
const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);

let wasmBytes;
if (isNode) {
  const { readFile } = await import("node:fs/promises");
  wasmBytes = await readFile(wasmUrl);
} else {
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`Could not load the expression core (${response.status}).`);
  wasmBytes = await response.arrayBuffer();
}

const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const wasm = instance.exports;
if (!wasm.memory || !wasm.core_alloc || !wasm.core_execute || !wasm.core_output_pointer) {
  throw new Error("The expression core WASM file does not expose the expected API.");
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function coreRequest(operation, fields = {}) {
  const requestBytes = encoder.encode(JSON.stringify({ operation, ...fields }));
  const requestPointer = wasm.core_alloc(requestBytes.length) >>> 0;
  new Uint8Array(wasm.memory.buffer, requestPointer, requestBytes.length).set(requestBytes);
  try {
    wasm.core_execute(requestPointer, requestBytes.length);
  } finally {
    wasm.core_dealloc(requestPointer, requestBytes.length);
  }

  const responsePointer = wasm.core_output_pointer() >>> 0;
  const responseLength = wasm.core_output_length() >>> 0;
  const responseBytes = new Uint8Array(wasm.memory.buffer, responsePointer, responseLength).slice();
  wasm.core_clear_output();
  let response;
  try {
    response = JSON.parse(decoder.decode(responseBytes));
  } catch (error) {
    throw new Error(`The expression core returned invalid data: ${error.message}`);
  }
  if (!response.ok) throw new Error(response.error || "The expression core failed.");
  return response.value;
}

export function inspectExpression(expression) {
  return coreRequest("inspect_expression", { expression: String(expression ?? "0") });
}

export function evaluateExpression(expression, symbols = {}, definitions = [], stack = []) {
  return coreRequest("evaluate_expression", {
    expression: String(expression ?? "0"),
    symbols,
    definitions,
    stack,
  });
}

export function validateExpression(expression, symbols = {}, definitions = [], evaluate = false) {
  return coreRequest("validate_expression", {
    expression: String(expression ?? "0"),
    symbols,
    definitions,
    evaluate,
  });
}

export function getCoreUnit(unit) {
  return coreRequest("get_unit", { unit });
}

export function getCoreSupportedUnits() {
  return coreRequest("supported_units");
}

export function evaluateQuantityExpression(expression, symbols = {}, path = "expression", allowedFunctions = [], evaluationPolicy) {
  return coreRequest("evaluate_model_expression", { expression, symbols, path, allowedFunctions, evaluationPolicy });
}

export function evaluateQuantity(quantity, symbols = {}, path = "quantity", allowedFunctions = [], evaluationPolicy) {
  return coreRequest("evaluate_quantity", { quantity, symbols, path, allowedFunctions, evaluationPolicy });
}

export function inferQuantityDimension(quantity, symbols = {}, path = "quantity", allowedFunctions = []) {
  return coreRequest("infer_quantity_dimension", { quantity, symbols, path, allowedFunctions });
}

export function resolveParameterTable(parameters = [], reservedSymbols = [], allowedFunctions = [], parameterPath = "parameters", evaluationPolicy) {
  return coreRequest("resolve_parameters", { parameters, reservedSymbols, allowedFunctions, parameterPath, evaluationPolicy });
}

export function analyzeExpressionDefinitions(input) {
  return coreRequest("analyze_expression_definitions", { input });
}

export function evaluatePointwiseFields(input) {
  return coreRequest("evaluate_pointwise_fields", input);
}
