/** Construct a vector value from application-provided component descriptions. */
export function initialQuantityVectorValue(descriptors) {
  return (descriptors || []).map(descriptor => ({
    expression: "",
    unit: descriptor.unit || "1",
  }));
}
