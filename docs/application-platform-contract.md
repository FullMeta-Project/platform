# FullMeta application platform contract

This is the shared integration contract for applications built on FullMeta. An application's specification describes its domain behavior and names this contract as a dependency. It links these references instead of copying platform requirements or migration notes into its own specification.

The Model Editor's optional `graphicsControlAvailability({model, scene, inputs})`
hook returns a map keyed by declared graphics control ID, with `{disabled,
reason}` values. The host refreshes these states when drawing, retains disabled
controls' checked preferences, and keys visibility preferences by the canonical
opened document path.

The declarative `storageCleanup` workflow may target an `actionApi` without a
directory-delete selector when that registered API owns cleanup. Its optional
`transport.bodyInputs` maps body properties to declared execution inputs;
reserved operation fields cannot be overridden. Confirmation rechecks both the
identity and folder and rejects a newly busy document. `confirmation.copy`
selects declared confirmation text. `refreshResults` invalidates and reloads
the active result after a checked response. Endpoint-based directory cleanup
continues to require its schema-owned storage selector.

| Reference | Governs |
| --- | --- |
| [Frontend providers](frontend-provider-contract.md) | React/JSX, compiled public modules, catalog bindings, state, commands, lifecycle, validation authoring and visible replay. |
| [Native operations](native-operation-contract.md) | Runtime declarations, executable bindings, operation identity, transport, diagnostics, completion, artifacts, retries and cancellation. |
| [Workspace integration](workspace-application-contract.md) | Universal document routing, interpreting schemas, in-application files, menus, layouts, contextual Help and presentation checkpoints. |
| [Application specification convention](application-specifications.md) | Application-owned requirements, architecture, detailed contracts, builder instructions and acceptance. |

These are established platform interfaces. Application work does not include migrating the platform to React/JSX or WebMCP. A platform test result establishes only its stated shared scope; each application still needs its own schema, provider, workflow, native and domain acceptance.

The installed interface versions are explicit. They identify different boundaries and do not replace an application's backend compatibility declaration:

| Boundary | Contract |
| --- | --- |
| Widget registration and visual provider | `fullmeta-widget-catalog/1`, `fullmeta-react-widget/1` |
| Frontend publication and host command session | `fullmeta-frontend-build/1`, `fullmeta-host-session/1` |
| Editor inspection, serializable state and scenario | `fullmeta-editor-debug/1`, `fullmeta-editor-state/1`, `fullmeta-editor-scenario/1` |
| Optional local development transport | `fullmeta-editor-bridge/1` |
| Public tools and browser registration status | `fullmeta-tools/1`, `fullmeta-webmcp-registration/1` |
| Native operation authority | `fullmeta-native-operations/1` |
| Declarative validation authoring | `fullmeta-declarative-rules/1` |

Use the installed contract definitions and actual resolved capability response when identifying a candidate. Do not copy volatile tool counts, build timestamps or historical acceptance revisions into an application's normative requirements.

## Documents, declarations and code

A project JSON document stores application data and a relative `x-fullmeta-schema` reference. The selected schema defines stored structure, constraints, references, UI declarations, validation obligations and declared operations. Cataloged components and application code implement presentation and behavior. JSX is source code for components; it is not embedded in project JSON or schema declarations.

Every owned standalone schema is also an editable document. It declares `$schema`, `$id` and `x-fullmeta-schema`, and its interpreting chain must resolve to confined existing workspace schemas. A direct self-reference is permitted; a non-self cycle is rejected. The build preflight applies to authoritative standalone schemas, including generated ones before publication. Embedded fragments, fixtures, dependencies and archives are outside that source inventory. A schema's logical `$id` need not equal its physical path.

Keep field presentation in the established `x-fullmeta-ui-behavior` envelope, using `fullmeta-ui-behavior/1`, the appropriate target and context, `payload.presentation`, and `payload.widget.settings`. A field selects a widget ID and configuration; it does not repeat executable module/component/mount declarations. Catalogs own the compiled module binding. Do not invent an alternative annotation envelope or a second model representation.

Use the independent [declarative validation language](declarative-validation-language.md), `fullmeta-declarative-rules/1`, where it expresses the required predicate. The application's validation specification still defines predicate meaning, stages, diagnostics and coverage. Unsupported predicates use an explicitly supported legacy/native route; they are not silently approximated or omitted.

## Ownership

| Owner | Responsibility |
| --- | --- |
| `platform/js/` | Shared application/document/schema/runtime services, transactions, source resolution and data-only debug orchestration. Public compatibility facades retain their documented purpose. |
| `platform/ui/runtime/` | Host/session composition, shared state and commands, projection, mounting and resource lifetime. |
| `platform/ui/debug/` | Visible developer controls and the browser side of typed development transport. |
| `platform/ui/widgets/` | Shared visual widgets, widget-local contracts and explicit headless providers. |
| `platform/ui/schemas/` | Cross-widget annotation, catalog and editor contracts. Widget-specific contracts stay with their widget. |
| `applications/{APP_ID}/` | Application schema, domain logic, runtime/package integration, application widgets, native dependencies, documentation and acceptance. |

Application pure transforms and orchestration belong in `js/`; actual application presentation belongs in `ui/`, with widget packages under `ui/widgets/{widget}/`. Keep Rust/WASM bindings, numerical kernels, parsers, models and nonvisual providers in their appropriate language. A headless provider does not need an artificial React component.

Application builders repair their own schema, package, JavaScript, JSX and declared integration. A supplied fixed shared/native dependency is a separate owner: identify its version, reproduce the blocking behavior and record affected acceptance requirements. Do not conceal a dependency defect with an incorrect schema or bypass its public interface. A dependency block leaves that outcome unverified while independent application work continues.

## One editing and execution interface

Human controls and WebMCP dispatch the same normal session commands against one canonical document and draft state. Both retain parsing, validation, Preview, Apply, Save, source-hash/revision, availability, busy and service-mode guards. React owns rendering; its private Fiber/virtual-DOM state is not the application protocol.

Native effects follow declared actions and checked runtime registrations. Schema metadata alone does not create an executable capability. Restore/replay, a fixture response, a rendered widget or a successful schema Preview cannot establish native execution or domain correctness.

Preserve the application's declared data meanings, unknown supported metadata, optional-member absence and array order through UI editing, command dispatch, Save/reopen and native input. Shared frontend normalization must not insert domain defaults or rewrite data to make a request pass.

## Compatibility and evidence

The application dependency profile records the actual platform/frontend, schema/package and native interfaces it requires. Retain the application's declared backend API expectation; a frontend contract version is not a replacement backend API value. Verify the capability response and controlled mismatch/recovery behavior against the application candidate.

Identify candidate sources, frontend configuration and lockfile, generated modules, runtime/schema contracts and native executables in acceptance evidence. Record content revision and build mode rather than using a volatile build timestamp as identity. A recursive identity record excludes itself. Distinguish fixture from live checks, declaration/registration from actual discovery/invocation, and platform acceptance from application acceptance.

Minimum application acceptance includes structural and declaration checks, installed provider/module resolution, normal human and semantic command editing, invalid/stale draft guards, data-preserving Save/reopen, real rendered interactions, the required validation stages and every declared native/result workflow. Domain-specific profile, physical or numerical requirements belong to the application's own specification and remain required.

## Documentation ownership

`platform/docs/` owns shared application-building and platform integration references. `platform/schema-editor/docs/` owns instructions for using Schema Editor: authoring fields, annotations, rules, bindings and candidate transactions. The editor guide links shared developer references when needed rather than duplicating them.

An application owns its specification and its user guide. Its schema has a sibling `docs/README.md` describing the delivered application. Help always resolves beside the active interpreting schema: a project model opens its application's guide; editing that schema opens its Schema Editor interpreter's guide. The [workspace contract](workspace-application-contract.md#documentation-and-menus) defines lookup and error behavior.
