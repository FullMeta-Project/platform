# Operation contracts Rust SDK

This crate calls `fullmeta_operation_contracts.dll` through its versioned JSON
interface. It needs the DLL at runtime but does not use the platform's core,
model, or operation-contracts Rust source or `.rlib` files. It uses Cargo's
ordinary `serde` and `serde_json` dependencies. The current DLL and SDK target
Windows; the supplied DLL is built for x86-64 Windows GNU.

Add this SDK crate as a Cargo dependency, then supply the DLL path and the exact
bytes of the application-owned registry:

```rust,no_run
use fullmeta_operation_contracts_sdk::{Contracts, Error};
use serde_json::json;

let registry = std::fs::read("native-operations.json")?;
let contracts = Contracts::open("fullmeta_operation_contracts.dll", &registry)?;
let identity = contracts.resolve_binding(&json!({"id":"mesh.check", "version":1}))?;
match contracts.validate_input(&identity.id, &json!({"model":{}})) {
    Ok(()) => println!("valid"),
    Err(Error::Validation(issues)) => println!("{:?}", issues),
    Err(error) => return Err(error.into()),
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

The path is canonicalized before loading; arrange for the DLL to be present at
that path. The SDK checks the DLL interface version. No DLL import library is
needed because the SDK loads it at runtime. `Contracts` clones may be used from
multiple threads. A validation failure carries `Error::Validation` with
structured diagnostics; a binding or descriptor failure carries
`Error::Diagnostic`. Loading and protocol failures use `Error::Interface`.

The SDK currently sends the registry bytes with each registry operation; the
DLL parses the registry on each call. Keep the exact original registry bytes
because the contract digest identifies those bytes. Environment binding installs
the DLL's process-wide default registry and therefore cannot be used with two
different default registries in the same process.

Build the DLL using [the platform instructions](../../NATIVE-DLLS.md), then run:

```powershell
$env:FULLMETA_CONTRACTS_DLL = (Resolve-Path platform/operation-contracts-rust/lib/fullmeta_operation_contracts.dll).Path
cargo +stable-x86_64-pc-windows-gnu test --locked --manifest-path platform/sdk-rust/operation-contracts/Cargo.toml
```

Applications can use this SDK alongside the core and model SDKs to access the
matching platform DLLs without building the platform implementation crates.
