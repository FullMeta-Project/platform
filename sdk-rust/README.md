# Platform Rust SDK bindings

The `core`, `model` and `operation-contracts` crates are public Rust adapters
for the three platform DLLs. Their hand-written higher-level APIs include handle
ownership, error handling, callbacks and batching. The platform implementation
remains in the DLLs.

## Regenerate native declarations

After changing a public native DLL interface, update its C header and rebuild
the DLL in the corresponding `lib/` directory. From the FullMeta root run:

```powershell
node platform/sdk-rust/update.mjs
```

This regenerates each SDK's `src/native.rs` from the public headers and checks
that every declaration has an export with the same name in its matching DLL,
and that every export with that DLL's own prefix is declared in the header.
It uses `objdump` from the Windows GNU toolchain. Unsupported C syntax and
header/export mismatches fail with a diagnostic instead of producing guessed
bindings. `node platform/sdk-rust/update.mjs --check` checks without writing.
The full-source DLL preparation command at
`applications/fem/fem-rust/prebuilt-tools/prepare.mjs` runs the generator after
building and publishing the DLLs. Calling Cargo directly does not run it.

The generated `native::NativeApi` contains low-level, `unsafe` function
pointers. Its loader takes a symbol resolver; the application must keep the
library loaded and follow the public header's safety, ownership and threading
contracts. The DLL and C header must describe the same ABI. Export tables contain
names but not C types: the generator cannot prove a header signature matches
the Rust implementation, or infer semantics from either one.

Each SDK also offers `execute_json` for invoking the DLL's JSON operations,
including a newly added operation, without first adding a named convenience
wrapper. The operation's input and output contract must still be known. This
is not a replacement for typed batches in performance-sensitive code.

## What still needs developer review

Generation does not update the existing higher-level Rust methods or infer
handle lifetime, ownership, callback, JSON field or error semantics. A change
to any of those contracts may require updating and testing the hand-written SDK
wrappers and their consumers. New or changed DLL functions need an accurate
header before generation; adding a Rust-internal function does not expose it
through the DLL. The checks do not establish behavioral compatibility.

The generated files are public build inputs and belong in the SDK distribution.
Cargo `target/` directories are temporary build caches and are not required.
