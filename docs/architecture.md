# FullMeta platform architecture

FullMeta separates shared document and language services from application-owned schemas, user interfaces and domain computations. Applications use the same platform without placing their domain-specific rules in the Kernel.

## Components

| Component | Responsibility |
| --- | --- |
| Workspace and document loader | Discover applications and documents, resolve interpreting schemas and open the selected editor. |
| Model Editor and shared UI | Present schema-directed fields and controls, document actions, graphics and Help. |
| Kernel | Serve the local workspace, coordinate document-bound operations and execute registered native programs through checked contracts. |
| Core | Provide expressions, quantities, units and field evaluation through native and WebAssembly interfaces. |
| Model | Provide schema-directed validation, navigation and model operations through native and WebAssembly interfaces. |
| Operation contracts | Describe and validate declared native-operation bindings and messages. |
| Rust SDK | Provide Rust adapters to the platform's native DLL interfaces. |
| Applications | Supply their own schemas, domain behavior, documentation and any application-specific native programs. |

## Schemas and execution

An opened document's `x-fullmeta-schema` identifies its interpreting schema. An application may declare its editor configuration, storage, API bindings and registered external programs in that schema. The Kernel checks a registered executable and its allowed entries, handles declared JSON or NDJSON transport, and applies the relevant workspace and operation checks. The application owns the meaning of its inputs, outputs and domain calculations.

The browser uses the shared WebAssembly modules for supported operations. Native applications can use the platform DLLs via the [Rust SDK](native-sdk.md); these interfaces have their own contracts and do not expose every internal Rust function. The Kernel has its own native dependencies.

The Kernel's document contexts coordinate file identity and operations. Core's compiled language contexts and expression handles support language evaluation. These are separate responsibilities; see [Document Kernels and interpreting schemas](kernel-contexts-and-interpreting-schemas.md).

See [application development](application-development.md), [API and executable registries](api-and-executable-registries.md), and the [native operation contract](native-operation-contract.md).
