# Core native libraries

Windows x64: `fullmeta_core.dll` is the distributed core runtime. The crate's
`target/` directory is a rebuildable cache and is not needed for distribution.

`core-native.h` describes the DLL's typed, batched expression interface. Applications
can use the DLL via the public `platform/sdk-rust/core/` adapter without a
prebuilt core `.rlib` or core implementation source.
