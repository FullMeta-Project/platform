function displayVersion(value) {
  return value === undefined || value === null || value === "" ? "not reported" : String(value);
}

export function compareEditorRuntime(expected, actual, labels = {}) {
  const mismatches = Object.keys(expected || {})
    .map(key => [labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(), key])
    .filter(([, key]) => expected[key] !== actual?.[key])
    .map(([label, key]) => ({ label, expected: displayVersion(expected?.[key]), actual: displayVersion(actual?.[key]) }));
  return { compatible: mismatches.length === 0, mismatches };
}

export function describeEditorRuntimeMismatches(mismatches) {
  return mismatches.map(({ label, expected, actual }) => `${label}: server reports ${actual}; this page expects ${expected}`).join(". ");
}
