export function editorRuntimeContract(runtimeDeclaration, capabilities) {
  return Object.fromEntries(Object.entries(runtimeDeclaration?.compatibility || {}).map(([key, field]) => [key,
    Array.isArray(field?.capabilityPath)
      ? field.capabilityPath.reduce((value, part) => value?.[part], capabilities)
      : field?.value,
  ]));
}

