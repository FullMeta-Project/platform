# Model Rust SDK

This adapter exposes model operations through
`fullmeta_model.dll`. It uses the platform's core Rust types and ordinary
`serde`/`serde_json` dependencies. The current interface targets Windows.

The SDK looks for the DLL in `platform/model-rust/lib/`, then beside the
executable. `FULLMETA_MODEL_DLL` can select an explicit path. The SDK checks
the DLL interface version at load time.
Compiled complex quantities use the typed native callback in
[model-native.h](../../model-rust/model-native.h); symbol values are passed as
numbers without JSON conversion. The SDK creates DLL handles per thread and
releases them when no longer needed.

`SchemaContext` retains a prepared schema inside the DLL. Its validation,
rule and policy methods reuse that context instead of sending the full schema
with every request. Schema annotation results are cached per context.

Applications compile this adapter and the core SDK from their Rust sources,
using ordinary Cargo dependencies, and load the matching platform DLLs. They do
not require the platform model or core implementation source.
To run the SDK's tests after building the model DLL:

```powershell
$env:FULLMETA_MODEL_DLL = (Resolve-Path platform/model-rust/lib/fullmeta_model.dll).Path
cargo +stable-x86_64-pc-windows-gnu test --locked --manifest-path platform/sdk-rust/model/Cargo.toml
```
