# Native DLLs and the Rust SDK

FullMeta provides native Windows x64 DLL interfaces for core language services, model services and operation contracts. The Rust SDK contains adapters for these interfaces. Native applications supply the matching DLLs at runtime and must follow the public interface's ownership, lifetime and threading rules.

The SDK's `core`, `model` and `operation-contracts` crates contain generated low-level declarations and hand-maintained higher-level APIs. The higher-level APIs handle such things as opaque handles, errors, callbacks and typed batches. The platform implementation remains in the DLLs.

## Compatibility

Use compatible SDK and DLL versions and follow the published interface contracts. A DLL can add an interface over time; an application can use it after its SDK provides the corresponding binding. Typed batches and opaque handles allow applications to reuse prepared language expressions without transferring their implementation.

The SDK and headers are development resources distributed with the platform SDK; they are not required for ordinary use of the installed workspace. Temporary Cargo build directories are not needed for distribution.
