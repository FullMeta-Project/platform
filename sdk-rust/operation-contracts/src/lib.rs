//! Windows client for the FullMeta operation-contracts DLL.
//!
//! The DLL is loaded from an explicit path. Requests and responses cross the
//! boundary as JSON; no Rust types or allocators are shared between modules.
pub mod native;

#[cfg(not(windows))]
compile_error!("The operation contracts SDK currently supports Windows only");

use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use std::{
    ffi::{OsStr, c_char, c_void},
    fmt,
    os::windows::ffi::OsStrExt,
    path::Path,
    sync::Arc,
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContractIdentity {
    pub id: String,
    pub version: u64,
    pub digest: String,
}
impl ContractIdentity {
    pub fn as_json(&self) -> Value { json!({"id": self.id, "version": self.version, "digest": self.digest}) }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Diagnostic {
    pub code: String,
    pub message: String,
    pub path: Option<String>,
    pub stage: String,
    #[serde(rename = "operationId", skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    #[serde(rename = "runId", skip_serializing_if = "Option::is_none")]
    pub run_id: Option<String>,
}
impl Diagnostic {
    pub fn new(code: &str, message: impl Into<String>, path: Option<String>, stage: &str) -> Self {
        Self { code: code.into(), message: message.into(), path, stage: stage.into(), operation_id: std::env::var("FULLMETA_OPERATION_ID").ok(), run_id: None }
    }
}
impl fmt::Display for Diagnostic {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for Diagnostic {}

#[derive(Debug)]
pub enum Error {
    /// Loading the DLL, the JSON protocol, or request construction failed.
    Interface(String),
    /// A contract binding or lookup failed with a structured diagnostic.
    Diagnostic(Diagnostic),
    /// Schema validation produced one or more structured diagnostics.
    Validation(Vec<Diagnostic>),
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Interface(message) => f.write_str(message),
            Self::Diagnostic(issue) => issue.fmt(f),
            Self::Validation(issues) => {
                for (index, issue) in issues.iter().enumerate() {
                    if index > 0 {
                        writeln!(f)?;
                    }
                    write!(f, "{issue}")?;
                }
                Ok(())
            }
        }
    }
}
impl std::error::Error for Error {}

type Execute = unsafe extern "C" fn(*const u8, usize);
type OutputPointer = unsafe extern "C" fn() -> *const u8;
type OutputLength = unsafe extern "C" fn() -> usize;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn LoadLibraryW(path: *const u16) -> *mut c_void;
    fn GetProcAddress(module: *mut c_void, name: *const c_char) -> *mut c_void;
    fn FreeLibrary(module: *mut c_void) -> i32;
}

struct Library {
    handle: *mut c_void,
    execute: Execute,
    output_pointer: OutputPointer,
    output_length: OutputLength,
}
// Windows module references may be shared between threads. Calls use only
// immutable function pointers; the DLL keeps its output in thread-local storage.
unsafe impl Send for Library {}
unsafe impl Sync for Library {}
impl Drop for Library {
    fn drop(&mut self) {
        unsafe {
            FreeLibrary(self.handle);
        }
    }
}
impl Library {
    fn load(path: &Path) -> Result<Self, Error> {
        let path = path
            .canonicalize()
            .map_err(|e| Error::Interface(format!("Cannot resolve DLL path: {e}")))?;
        let wide: Vec<u16> = OsStr::new(&path).encode_wide().chain(Some(0)).collect();
        let handle = unsafe { LoadLibraryW(wide.as_ptr()) };
        if handle.is_null() {
            return Err(Error::Interface(format!(
                "Cannot load {}: {}",
                path.display(),
                std::io::Error::last_os_error()
            )));
        }
        let symbol = |name: &'static [u8]| -> Result<*mut c_void, Error> {
            let value = unsafe { GetProcAddress(handle, name.as_ptr().cast()) };
            if value.is_null() {
                Err(Error::Interface(format!(
                    "DLL is missing {}",
                    String::from_utf8_lossy(&name[..name.len() - 1])
                )))
            } else {
                Ok(value)
            }
        };
        let loaded = (|| {
            let execute = symbol(b"contracts_execute\0")?;
            let output_pointer = symbol(b"contracts_output_pointer\0")?;
            let output_length = symbol(b"contracts_output_length\0")?;
            Ok(Self {
                handle,
                execute: unsafe { std::mem::transmute::<*mut c_void, Execute>(execute) },
                output_pointer: unsafe {
                    std::mem::transmute::<*mut c_void, OutputPointer>(output_pointer)
                },
                output_length: unsafe {
                    std::mem::transmute::<*mut c_void, OutputLength>(output_length)
                },
            })
        })();
        if loaded.is_err() {
            unsafe {
                FreeLibrary(handle);
            }
        }
        loaded
    }
    fn request<T: DeserializeOwned>(&self, request: Value) -> Result<T, Error> {
        let input = serde_json::to_vec(&request).map_err(|e| Error::Interface(e.to_string()))?;
        let output = unsafe {
            (self.execute)(input.as_ptr(), input.len());
            let pointer = (self.output_pointer)();
            let length = (self.output_length)();
            if pointer.is_null() || length > isize::MAX as usize {
                return Err(Error::Interface(
                    "DLL returned an invalid output buffer".into(),
                ));
            }
            std::slice::from_raw_parts(pointer, length).to_vec()
        };
        let response: Value = serde_json::from_slice(&output)
            .map_err(|e| Error::Interface(format!("Invalid DLL response: {e}")))?;
        match response.get("ok").and_then(Value::as_bool) {
            Some(true) => serde_json::from_value(
                response
                    .get("value")
                    .cloned()
                    .ok_or_else(|| Error::Interface("DLL response has no value".into()))?,
            )
            .map_err(|e| Error::Interface(format!("Invalid DLL result: {e}"))),
            Some(false) => {
                if let Some(diagnostic) = response.get("diagnostic") {
                    let issue = serde_json::from_value(diagnostic.clone())
                        .map_err(|e| Error::Interface(format!("Invalid DLL diagnostic: {e}")))?;
                    Err(Error::Diagnostic(issue))
                } else {
                    Err(Error::Interface(
                        response
                            .get("error")
                            .and_then(Value::as_str)
                            .unwrap_or("DLL request failed")
                            .into(),
                    ))
                }
            }
            None => Err(Error::Interface("DLL response has no status".into())),
        }
    }
}

/// A registry-scoped client. Clones share the DLL and can be used from other threads.
#[derive(Clone)]
pub struct Contracts {
    library: Arc<Library>,
    registry_json: Arc<str>,
}
#[cfg(test)]
mod generated_native_tests {
    use super::*;
    #[test]
    fn generated_bindings_call_contracts_dll() {
        let path=std::env::var_os("FULLMETA_CONTRACTS_DLL").expect("set FULLMETA_CONTRACTS_DLL");
        let library=Library::load(Path::new(&path)).unwrap();
        let api=unsafe { native::NativeApi::load(|name| {
            let name=std::ffi::CString::new(name).unwrap();
            let pointer=GetProcAddress(library.handle,name.as_ptr());
            if pointer.is_null(){Err("missing symbol".into())}else{Ok(pointer.cast_const())}
        }).unwrap() };
        let request=br#"{"operation":"sdk_api_version"}"#;
        unsafe {
            (api.contracts_execute)(request.as_ptr(),request.len());
            let output=std::slice::from_raw_parts((api.contracts_output_pointer)(),(api.contracts_output_length)());
            let result:Value=serde_json::from_slice(output).unwrap();
            assert_eq!(result["value"],1);
        }
    }
}
impl Contracts {
    /// Invoke an operation exposed by the contracts DLL's JSON interface.
    /// The caller supplies all operation fields, including registryJson where required.
    pub fn execute_json(&self, value: Value) -> Result<Value, Error> {
        self.library.request(value)
    }
    /// Load a DLL and validate the exact UTF-8 registry bytes without installing a global registry.
    pub fn open(dll: impl AsRef<Path>, registry: &[u8]) -> Result<Self, Error> {
        let registry = std::str::from_utf8(registry)
            .map_err(|e| Error::Interface(format!("Registry is not UTF-8: {e}")))?;
        let client = Self {
            library: Arc::new(Library::load(dll.as_ref())?),
            registry_json: Arc::from(registry),
        };
        let version: u32 = client
            .library
            .request(json!({"operation":"sdk_api_version"}))?;
        if version != 1 {
            return Err(Error::Interface(format!(
                "Unsupported DLL SDK interface version: {version}"
            )));
        }
        let _: Value = client.registry_request(json!({"operation":"document"}))?;
        Ok(client)
    }
    fn registry_request<T: DeserializeOwned>(&self, mut request: Value) -> Result<T, Error> {
        request["registryJson"] = json!(&*self.registry_json);
        self.library.request(request)
    }
    pub fn install_default_registry(&self) -> Result<(), Error> {
        let _: bool = self.registry_request(json!({"operation":"install_default_registry"}))?;
        Ok(())
    }
    pub fn digest(&self, bytes: &[u8]) -> Result<String, Error> {
        self.library
            .request(json!({"operation":"digest", "bytes":bytes}))
    }
    pub fn contract_digest(&self) -> Result<String, Error> {
        self.registry_request(json!({"operation":"contract_digest"}))
    }
    pub fn document(&self) -> Result<Value, Error> {
        self.registry_request(json!({"operation":"document"}))
    }
    pub fn describe(&self, program: Option<&str>) -> Result<Value, Error> {
        self.registry_request(json!({"operation":"describe", "program":program}))
    }
    pub fn descriptor(&self, id: &str) -> Result<Value, Error> {
        self.registry_request(json!({"operation":"descriptor", "id":id}))
    }
    pub fn resolve_binding(&self, binding: &Value) -> Result<ContractIdentity, Error> {
        self.registry_request(json!({"operation":"resolve_binding", "binding":binding}))
    }
    pub fn binding_from_environment(
        &self,
        program: &str,
        entry: &str,
    ) -> Result<Option<ContractIdentity>, Error> {
        self.registry_request(
            json!({"operation":"binding_from_environment", "program":program, "entry":entry}),
        )
    }
    fn validate(&self, operation: &str, id: &str, value: &Value) -> Result<(), Error> {
        #[derive(Deserialize)]
        struct Validation {
            valid: bool,
            diagnostics: Vec<Diagnostic>,
        }
        let result: Validation =
            self.registry_request(json!({"operation":operation, "id":id, "value":value}))?;
        if result.valid && result.diagnostics.is_empty() {
            Ok(())
        } else if !result.valid && !result.diagnostics.is_empty() {
            Err(Error::Validation(result.diagnostics))
        } else {
            Err(Error::Interface(
                "DLL returned inconsistent validation results".into(),
            ))
        }
    }
    pub fn validate_input(&self, id: &str, value: &Value) -> Result<(), Error> {
        self.validate("validate_input", id, value)
    }
    pub fn validate_result(&self, id: &str, value: &Value) -> Result<(), Error> {
        self.validate("validate_result", id, value)
    }
    pub fn validate_event(&self, id: &str, value: &Value) -> Result<(), Error> {
        self.validate("validate_event", id, value)
    }
    pub fn diagnostic(
        &self,
        code: &str,
        message: &str,
        path: Option<&str>,
        stage: &str,
    ) -> Result<Diagnostic, Error> {
        self.library.request(json!({"operation":"diagnostic_new", "code":code, "message":message, "path":path, "stage":stage}))
    }
    pub fn error_response(&self, diagnostics: &[Diagnostic]) -> Result<Value, Error> {
        self.library
            .request(json!({"operation":"error_response", "diagnostics":diagnostics}))
    }
    pub fn error_event(&self, diagnostics: &[Diagnostic]) -> Result<Value, Error> {
        self.library
            .request(json!({"operation":"error_event", "diagnostics":diagnostics}))
    }
}
