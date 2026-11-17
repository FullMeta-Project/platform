# Application specification convention

Use an application specification to describe the application to build, independently of the session that produced it. Another developer or agent should be able to implement and assess that application from the specification and its identified platform dependencies.

Each application's domain requirements belong to that application and need not apply to others.

## Folder ownership

```text
applications/<application-id>/
  AGENTS.md                       # instructions for application-owned work
  <application>.schema.json       # interpreting application schema
  docs/
    README.md                     # public guide for users/model-authoring agents
  specification/
    README.md                     # target, scope and reading order
    REQUIREMENTS.md               # required capabilities and requirement IDs
    ARCHITECTURE.md                # components, ownership and interfaces
    DATA_MODEL.md                 # persisted values and preservation rules
    UI.md                         # user-visible behavior
    VALIDATION.md                 # predicates, stages and diagnostics
    RUNTIME.md                    # operations, storage and external programs
    ACCEPTANCE.md                 # cases, evidence and completion criteria
    PLATFORM.md                   # this application's platform dependency profile
    contracts/                    # detailed domain contracts, when needed
```

Create implementation folders such as `js/`, `ui/` and native-program directories when the application needs them. Shared platform services and reusable widget implementations stay under `platform/`; project documents and their artifacts follow the application's declared storage contract.

## Application author metadata

An application interpreting schema can declare a top-level `author` string identifying its author or authors. This is schema-document metadata, separate from project metadata. Schema Editor presents it in the schema document's ordinary Settings alongside the other root metadata. Add and maintain it through Schema Editor, and preserve the author names as written.

## Document roles

| Document | Responsibility |
| --- | --- |
| Application `AGENTS.md` | Explain how to work in the application: scope, ownership, fixed dependencies, source-editing/build conventions, verification and failure attribution. Keep domain requirements in the specification. Placing this file at the application root also covers later `js/` and `ui/` work. |
| Specification `README.md` | Define the target application and application identity, name authoritative documents, and give a useful reading order. |
| `REQUIREMENTS.md` | State observable capabilities, invariants, exclusions and supported variants with stable IDs. Link each requirement to detailed contracts and acceptance. |
| `ARCHITECTURE.md` | Identify the schema, package, projections, widgets, native programs, storage and their interfaces. Define which component owns each effect. |
| `DATA_MODEL.md` | Identify the authoritative data-format contract and version, supported variants, round-trip and compatibility obligations. A published fixed format belongs in the application's reference documentation; link it instead of duplicating its field definitions. Separate stored values from presentation and runtime state. |
| `UI.md` | Define tree, Settings, graphics and action behavior, including availability, diagnostics and persisted effects. Refer to shared controls instead of specifying a second implementation. |
| `VALIDATION.md` | Assign each predicate its source, stage, inputs, applicability, diagnostic and repair path. Distinguish structural, declarative, native and numerical evidence. |
| `RUNTIME.md` | Define application operations and bindings, execution context, artifacts, terminal states, cancellation, recovery and output interpretation. |
| `ACCEPTANCE.md` | Define contract-derived focused and composite cases, candidate/dependency identity, required observations, failure ownership and completion. |
| `PLATFORM.md` | Declare this application's selected shared interfaces, versions, providers and supported options. Link the platform's contracts and tooling documentation rather than copying them. |
| `contracts/` | Hold detailed tables and domain-specific contracts too large for the entry documents. The entry documents must link them and state whether they are normative. |

The two README entry points have distinct audiences: `docs/README.md` is the implemented application's user guide, and `specification/README.md` is the builder's target-requirements entry point. `AGENTS.md` supplies working rules for agents and does not replace either README. No additional application-root README is required.

The entry-document structure shown above provides a common starting point. Keep each document concise when the application is small; state when a concern is not applicable. Add detailed contract files when a requirement needs its own stable, linked definition.

## Shared platform requirements

React/JSX presentation, cataloged public providers, shared state/commands, WebMCP access, schema interpretation, workspace services and native boundary rules are established platform interfaces. Start with the [application platform contract](application-platform-contract.md) and its [frontend provider](frontend-provider-contract.md), [native operation](native-operation-contract.md) and [workspace integration](workspace-application-contract.md) references. Use the [application development guide](application-development.md) for registration and package setup.

An application's specification records how it uses those interfaces: selected widget IDs, action IDs, routes, operation versions, data projections, layout defaults and required outcomes. It does not copy numbered migration handovers, platform implementation history, tool counts or another application's physics requirements. Current dependency identities belong in the candidate evidence; historical migration records remain historical evidence.

Write one current requirement where older statements conflict. Replace superseded prose instead of making every builder reconcile a chain of precedence notices. Keep historical text in an archive when it is needed to explain an earlier identity. Changes to a dependency or application requirement must identify the affected application checks to repeat.

## Retesting passed acceptance

A recorded **PASS** remains valid for the candidate and behavior it assessed; do not rerun passed checks without a relevant cause. Repeat the smallest set of checks affected by a schema, application-code, runtime, dependency or requirement change, a reported defect, or new evidence that challenges the result. Documentation-only or unrelated metadata changes do not invalidate behavior replay. A schema metadata change may require schema validation, but does not by itself require numerical replay. Keep prior evidence and record any focused rerun against its candidate rather than replacing unrelated results.
## Specifications and user documentation

The specification describes the target application for its builder and may remain private. `docs/README.md` is public: it serves users and agents creating documents interpreted by the application schema. Publish complete data-format and interface references there, with the guide to the capabilities actually delivered. Public model authoring must not require access to private specification files or historical examples. A placeholder guide must not present planned behavior as implemented; completing and checking the public guide is an application delivery requirement.

Every interpreting schema owns a sibling public `docs/` folder and may have a sibling builder-only `specification/` folder. Help resolves `docs/README.md` relative to the active interpreting schema for any opened JSON document, including a schema document. A project model therefore uses its application guide. Editing that application's schema uses the guide beside its own interpreter, normally the shared Schema Editor schema. Help does not select a guide from an application ID or the opened model's directory. Verify that public documentation still works when the specification is omitted from a distribution. The specification references the public contracts in one direction, avoiding duplicate definitions.

## Building and assessing an application

The application builder owns defects in the application's schema, JavaScript, JSX, projections, actions and adapters. Repair those defects and repeat affected checks. A correctly declared request blocked by an identified fixed platform or native dependency remains a dependency blocker with a minimal reproduction; it is not a schema workaround or a passing case.

Derive focused and composite cases from the requirements before assessing behavior. Cover stored data, validation, visible controls, normal commands and runtime outputs as applicable. Shared platform acceptance does not replace an application's own integration, domain or numerical acceptance. Use stable requirement IDs and links to evidence rather than treating file counts, schema counters or a single successful operation as completion.




