# Native operation boundary contracts

This crate provides application-neutral parsing, identities and JSON Schema checking for `fullmeta-native-operations/1` registries. It embeds no application operation definitions. Each application supplies its own registry next to its model schema; the schema names it with `x-fullmeta-runtime.operationRegistry`.

`Registry::from_bytes` parses a registry and records the SHA-256 digest of its exact bytes. The Kernel retains a registry with each bound operation and checks the selected executable's self-description, input, output, events and required artifacts against that registry. Multiple applications may use separate registries and operation identities.

An application executable can install its own compiled registry with `install_default_registry`; the public compatibility functions then use that registry. Application code owns the embedded bytes. The generic platform code does not depend on an application source tree.

Run the generic Rust checks with:

```text
cargo test --offline --manifest-path platform/operation-contracts-rust/Cargo.toml
```
