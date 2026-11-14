const safeFilename = /^(?![ .])(?!CON\.|PRN\.|AUX\.|NUL\.|COM[1-9]\.|LPT[1-9]\.)(?!.*[<>:"/\\|?*\u0000-\u001f])[^/\\]{1,195}\.json$/i;
const safeDirectory = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function requireName(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`Model Editor storage ${label} must be a safe name.`);
  }
  return value;
}

/** Validate and normalize schema-owned model file and artifact names. */
export function applicationProjectStorage(declaration) {
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration)) {
    throw new Error("The model schema must declare Model Editor storage names.");
  }
  const modelFile = requireName(declaration.modelFile, safeFilename, "modelFile");
  const runsDirectory = requireName(declaration.runsDirectory, safeDirectory, "runsDirectory");
  const resultsDirectory = requireName(declaration.resultsDirectory, safeDirectory, "resultsDirectory");
  return Object.freeze({
    modelFile,
    runsDirectory,
    resultsDirectory,
  });
}

export function isApplicationModelFile(storage, filename) {
  return storage.modelFile === filename;
}
