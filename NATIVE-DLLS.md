# Windows native DLLs

The following commands build the Windows GNU x86-64 release DLLs from the
current sources (use the same installed toolchain for all three):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File platform/core-rust/build-native.ps1
cargo +stable-x86_64-pc-windows-gnu build --locked --release --target x86_64-pc-windows-gnu --manifest-path platform/model-rust/Cargo.toml --target-dir platform/model-rust/.build/native --lib
cargo +stable-x86_64-pc-windows-gnu build --locked --release --target x86_64-pc-windows-gnu --manifest-path platform/operation-contracts-rust/Cargo.toml --target-dir platform/operation-contracts-rust/.build/native --lib
```

The core script publishes its DLL to `core-rust/lib/` and removes its
temporary `core-rust/.build/native/` and any old `core-rust/target/`.
The model and contracts commands place DLLs under their respective
crate-local `.build/` target directories. The
distributed copies live in each crate's `lib/` directory;
`applications/fem/fem-rust/prebuilt-tools/prepare.mjs` refreshes those copies.
The DLLs bundle their Rust dependencies; the model and contracts DLLs each
contain the portions of their upstream Rust dependencies that they use.
They still use standard Windows runtime DLLs.

Each DLL exports a JSON request interface with the prefixes `core`, `model`, or
`contracts`: `<prefix>_execute(const uint8_t *, size_t)`,
`<prefix>_output_pointer(void)`, `<prefix>_output_length(void)`,
`<prefix>_clear_output(void)`, `<prefix>_alloc(size_t)`, and
`<prefix>_dealloc(uint8_t *, size_t)`. Requests and responses are UTF-8 JSON;
responses contain `ok` and either `value` or `error`. The input buffer must be
valid for the duration of the execute call. Output belongs to the DLL and must
be copied before the next execute or clear call on the same thread. Allocation
and deallocation must use the same DLL, and the exact original allocation size.
Output and model handles are thread-local and must be used on the creating thread.

On Windows, model also exports `model_evaluate_compiled_complex_with`, a typed
callback interface for evaluating an existing compiled complex quantity without
serializing symbol values as JSON. The C types, ownership, callback and error
contract are documented in [model-native.h](model-rust/model-native.h).
Compilation and handle release use the existing JSON interface.

Core additionally exposes a versioned typed expression interface documented in
[core-native.h](core-rust/core-native.h). It compiles an expression once,
lists its numeric symbol slots, evaluates row-major batches of complex values,
and exposes the unevaluated argument of a registered host operator as its own
opaque expression handle. Applications supply the host operator result; the
platform evaluates its expression. Handles are released on their creating
thread. FEM also uses typed unit-aware batches and core-owned compiled
pointwise definition plans. The public core SDK loads the DLL for the remaining
core operations.

Core and model accept their existing Wasm JSON operations. The contracts DLL
supports `digest`, `document`, `contract_digest`, `describe`, `descriptor`,
`resolve_binding`, `validate_input`, `validate_result`, `validate_event`,
`install_default_registry`, `binding_from_environment`, `diagnostic_new`,
`error_response`, and `error_event`. Registry-based requests supply the exact
registry file contents as the string `registryJson`; this preserves the
registry's byte-based digest. `digest` accepts UTF-8 `text` or a `bytes` array.
Validation returns `valid` and `diagnostics` in the response value.
For contract binding, descriptor and environment-binding errors, the response
also carries a structured `diagnostic` alongside the existing error string.
The contracts DLL supports `sdk_api_version` to identify this interface.

The [operation contracts Rust SDK](sdk-rust/operation-contracts/README.md)
loads the DLL at runtime and provides typed wrappers and diagnostics.

All three SDKs also have low-level native bindings generated from their public
headers. See [SDK generation](sdk-rust/README.md) for the update command,
export checks and the limitations of automatic generation.

These interfaces do not expose every public Rust function or method. FEM uses
the three public SDKs and their DLLs; no prebuilt platform Rust library is
required. The three DLLs are staged beside the FEM executable as a matched set.
Cargo also produces GNU import libraries (`.dll.a`) for normal link-time DLL
linking; a consumer that loads the DLLs dynamically can resolve exports at runtime.
