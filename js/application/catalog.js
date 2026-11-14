const applicationDiscoveryUrl = new URL("../../../api/applications", import.meta.url);
const applicationIdPattern = /^[a-z][a-z0-9-]{0,47}$/;

function workspacePath(value, label, extension) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.startsWith("/")
    || /[:?#]/.test(value) || !value.endsWith(extension)
    || value.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error(`An application descriptor has an invalid ${label} path.`);
  }
  return value;
}

export function validateApplicationCatalog(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.format !== "fullmeta-application-discovery/1" || !Array.isArray(value.applications)) {
    throw new Error("The application discovery response has an unsupported format.");
  }
  const ids = new Set();
  const applications = value.applications.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)
      || entry.format !== "fullmeta-application/1"
      || typeof entry.id !== "string" || !applicationIdPattern.test(entry.id) || ids.has(entry.id)
      || typeof entry.name !== "string" || !entry.name.trim()) {
      throw new Error("Application discovery found an invalid or duplicate application descriptor.");
    }
    ids.add(entry.id);
    const base = `applications/${entry.id}/`;
    const schema = workspacePath(entry.schema ?? `${base}${entry.id}.schema.json`, "model schema", ".json");
    const draft = entry.runtimePackage !== true
      && entry.schemaLoader === undefined && entry.package === undefined;
    const schemaLoader = draft ? undefined : workspacePath(entry.schemaLoader ?? `${base}schema-documents.js`, "schema loader", ".js");
    const packageModule = draft ? undefined : workspacePath(entry.package ?? `${base}package.js`, "package module", ".js");
    if (![schema, schemaLoader, packageModule].filter(Boolean).every(path => path.startsWith(base))) {
      throw new Error(`Application ${entry.id} must keep its schema and package inside ${base}.`);
    }
    if (entry.description !== undefined && typeof entry.description !== "string") {
      throw new Error(`Application ${entry.id} has an invalid description.`);
    }
    if (entry.runtimePackage !== undefined && typeof entry.runtimePackage !== "boolean") {
      throw new Error(`Application ${entry.id} has an invalid runtimePackage flag.`);
    }
    if (draft && (entry.runtimePackage === true || entry.runtimeBuild !== undefined)) {
      throw new Error(`Draft application ${entry.id} cannot register a runtime before its package exists.`);
    }
    const runtimeBuild = entry.runtimeBuild === undefined
      ? (entry.runtimePackage === true ? `${base}runtime-build.json` : undefined)
      : workspacePath(entry.runtimeBuild, "runtime build plan", ".json");
    if (runtimeBuild !== undefined && !runtimeBuild.startsWith(base)) {
      throw new Error(`Application ${entry.id} must keep its runtime build plan inside ${base}.`);
    }
    return { ...entry, schema, ...(draft ? {} : { schemaLoader, package: packageModule }), ...(runtimeBuild ? { runtimeBuild } : {}) };
  });
  return { ...value, applications };
}

/** Discover descriptors stored in immediate application folders. */
export async function loadApplicationCatalog({ fetcher = globalThis.fetch } = {}) {
  if (typeof fetcher !== "function") throw new Error("This environment cannot discover applications.");
  const response = await fetcher(applicationDiscoveryUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not discover applications (${response.status}).`);
  return validateApplicationCatalog(await response.json());
}

export function applicationModuleUrl(path) {
  return new URL(`../../../${path}`, import.meta.url);
}
