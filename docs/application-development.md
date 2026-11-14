# Create a FullMeta application

FullMeta discovers applications from a root `catalog.json` in each immediate folder under `applications/`. There is no shared catalog to update. Copy a complete application folder into `applications/` and refresh the launcher to make it available.

## Application types

Start with a **schema-only application** when JSON Schema can describe the project's structure, fields, defaults, tree, and validation rules. The platform supplies a generic editor package. Add a **runtime package** only when application-specific project creation, editor actions, API routes, external programs, results, or storage behavior are needed.

The launcher's **New** action creates a schema-only application folder with a starter schema and `catalog.json`. **Create Project** opens the generic schema project form; **Edit app** opens the schema editor; **Delete app** removes the application folder. **File → New…** while editing a schema creates another schema document and does not register another application.

## Folder structure and descriptor

```text
applications/
  weather-demo/
    catalog.json
    weather-demo.schema.json
    package.js                 # optional runtime package
    schema-documents.js        # optional runtime schema loader
    runtime-build.json         # optional native build plan
```

The per-application `catalog.json` uses format `fullmeta-application/1` and declares a stable ID, display name, optional description, and model schema:

```json
{
  "format": "fullmeta-application/1",
  "id": "weather-demo",
  "name": "Weather Demo",
  "description": "Example schema-only application.",
  "schema": "applications/weather-demo/weather-demo.schema.json"
}
```

The folder name must match `id`. IDs use lowercase letters, numbers, and hyphens. Descriptor paths are workspace-relative and must stay within `applications/<id>/`. The launcher and runtime builder discover only immediate application folders that contain a valid descriptor; folders without one are ignored.

Schema-only applications need no JavaScript runtime package. For a runtime application, set `runtimePackage` to `true`; `schemaLoader` and `package` default to `applications/<id>/schema-documents.js` and `applications/<id>/package.js`. An optional `runtimeBuild` points to a native build plan; for runtime packages it defaults to `applications/<id>/runtime-build.json`.

The application package can expose launcher profiles and `createModelDocument` for project creation. Application widgets belong in `applications/<id>/ui/widgets/` and are included by the frontend build. See [the application folder convention](../../applications/README.md).

## Define the project schema

Give the schema a JSON Schema dialect and unique absolute `$id`. Declare the application identifier as a constant in project data, and declare `x-fullmeta-schema` so each saved project identifies its interpreter. Resolve that path relative to the project JSON file. Keep application-owned schemas, runtime modules, build plans, UI widgets, and docs together under `applications/<id>/`.
