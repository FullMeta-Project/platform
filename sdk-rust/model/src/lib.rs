//! Rust adapter to the Windows FullMeta model DLL.
pub mod native;
use serde::{Deserialize, de::DeserializeOwned};
use serde_json::{Value, json};
use std::{
    cell::RefCell,
    collections::HashMap,
    ffi::{OsStr, c_char, c_void},
    os::windows::ffi::OsStrExt,
    path::{Path, PathBuf},
    sync::{
        Arc, OnceLock, RwLock, Weak,
        atomic::{AtomicU64, Ordering},
    },
};

type Execute = unsafe extern "C" fn(*const u8, usize);
type Pointer = unsafe extern "C" fn() -> *const u8;
type Length = unsafe extern "C" fn() -> usize;
#[repr(C)]
struct Symbol {
    value: f64,
    dimension: [f64; 5],
}
#[repr(C)]
struct Complex {
    re: f64,
    im: f64,
}
type Lookup = unsafe extern "C" fn(*mut c_void, *const u8, usize, *mut Symbol) -> i32;
type Evaluate =
    unsafe extern "C" fn(u64, *const u8, usize, Option<Lookup>, *mut c_void, *mut Complex) -> i32;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn LoadLibraryW(path: *const u16) -> *mut c_void;
    fn GetProcAddress(module: *mut c_void, name: *const c_char) -> *mut c_void;
    fn FreeLibrary(module: *mut c_void) -> i32;
}
struct Dll {
    handle: *mut c_void,
    execute: Execute,
    pointer: Pointer,
    length: Length,
    evaluate: Evaluate,
}
// The DLL's mutable output and handles are thread-local; pointers are immutable.
unsafe impl Send for Dll {}
unsafe impl Sync for Dll {}
impl Drop for Dll {
    fn drop(&mut self) {
        unsafe {
            FreeLibrary(self.handle);
        }
    }
}
impl Dll {
    fn load(path: &Path) -> Result<Self, String> {
        let path = path
            .canonicalize()
            .map_err(|e| format!("Cannot resolve model DLL path: {e}"))?;
        let wide: Vec<u16> = OsStr::new(&path).encode_wide().chain(Some(0)).collect();
        let handle = unsafe { LoadLibraryW(wide.as_ptr()) };
        if handle.is_null() {
            return Err(format!(
                "Cannot load model DLL {}: {}",
                path.display(),
                std::io::Error::last_os_error()
            ));
        }
        let symbol = |name: &'static [u8]| {
            let ptr = unsafe { GetProcAddress(handle, name.as_ptr().cast()) };
            if ptr.is_null() {
                Err(format!(
                    "Model DLL is missing {}",
                    String::from_utf8_lossy(&name[..name.len() - 1])
                ))
            } else {
                Ok(ptr)
            }
        };
        let loaded = (|| {
            Ok(Self {
                handle,
                execute: unsafe {
                    std::mem::transmute::<*mut c_void, Execute>(symbol(b"model_execute\0")?)
                },
                pointer: unsafe {
                    std::mem::transmute::<*mut c_void, Pointer>(symbol(b"model_output_pointer\0")?)
                },
                length: unsafe {
                    std::mem::transmute::<*mut c_void, Length>(symbol(b"model_output_length\0")?)
                },
                evaluate: unsafe {
                    std::mem::transmute::<*mut c_void, Evaluate>(symbol(
                        b"model_evaluate_compiled_complex_with\0",
                    )?)
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
    fn response<T: DeserializeOwned>(&self) -> Result<T, String> {
        let bytes = unsafe {
            let p = (self.pointer)();
            let n = (self.length)();
            if p.is_null() || n > isize::MAX as usize {
                return Err("Invalid model DLL response buffer".into());
            }
            std::slice::from_raw_parts(p, n)
        };
        let value: Value = serde_json::from_slice(bytes)
            .map_err(|e| format!("Invalid model DLL response: {e}"))?;
        if value.get("ok").and_then(Value::as_bool) == Some(true) {
            serde_json::from_value(
                value
                    .get("value")
                    .cloned()
                    .ok_or("Model DLL omitted value")?,
            )
            .map_err(|e| e.to_string())
        } else {
            Err(value
                .get("error")
                .and_then(Value::as_str)
                .unwrap_or("Model DLL request failed")
                .into())
        }
    }
    fn request<T: DeserializeOwned>(&self, value: Value) -> Result<T, String> {
        let bytes = serde_json::to_vec(&value).map_err(|e| e.to_string())?;
        unsafe {
            (self.execute)(bytes.as_ptr(), bytes.len());
        }
        self.response()
    }
}
static DLL: OnceLock<Result<Dll, String>> = OnceLock::new();
static CONFIGURED_PATH: OnceLock<PathBuf> = OnceLock::new();
fn dll() -> Result<&'static Dll, String> {
    DLL.get_or_init(|| {
        fn compatible(path: &Path) -> Result<Dll, String> {
            let library = Dll::load(path)?;
            let version: u64 = library.request(json!({"operation":"native_sdk_version"}))?;
            if version != 2 { return Err(format!("Unsupported model DLL SDK version: {version}")); }
            Ok(library)
        }
        if let Some(path) = std::env::var_os("FULLMETA_MODEL_DLL") { return compatible(&PathBuf::from(path)); }
        if let Some(path) = CONFIGURED_PATH.get() { return compatible(path); }
        let executable = std::env::current_exe().map_err(|e| e.to_string())?;
        let directory=executable.parent().ok_or("Missing executable directory")?;
        let relative = Path::new("platform/model-rust/lib/fullmeta_model.dll");
        let mut candidates = std::env::var_os("FULLMETA_ROOT")
                .map(PathBuf::from)
                .into_iter()
                .chain(executable.ancestors().map(Path::to_path_buf))
                .map(|root| root.join(relative)).filter(|path| path.is_file()).collect::<Vec<_>>();
        candidates.push(directory.join("fullmeta_model.dll"));
        let mut errors=Vec::new();
        for path in candidates {match compatible(&path){Ok(library)=>return Ok(library),Err(error)=>errors.push(error)}}
        Err(format!("Cannot load a compatible model DLL: {}",errors.join("; ")))
    })
    .as_ref()
    .map_err(Clone::clone)
}
pub fn initialize() -> Result<(), String> {
    dll().map(|_| ())
}
pub fn configure_library_path(path:PathBuf)->Result<(),String> {
    if DLL.get().is_some(){return Err("Model DLL is already initialized".into());}
    CONFIGURED_PATH.set(path).map_err(|_|"Model DLL path is already configured".into())
}
fn request<T: DeserializeOwned>(value: Value) -> Result<T, String> {
    dll()?.request(value)
}
/// Invoke an operation exposed by the model DLL's JSON interface.
pub fn execute_json(value: Value) -> Result<Value, String> { request(value) }
#[cfg(test)]
mod generated_native_tests {
    use super::*;
    #[test]
    fn generated_bindings_call_model_dll() {
        let library=dll().unwrap();
        let api=unsafe { native::NativeApi::load(|name| {
            let name=std::ffi::CString::new(name).unwrap();
            let pointer=GetProcAddress(library.handle,name.as_ptr());
            if pointer.is_null(){Err("missing symbol".into())}else{Ok(pointer.cast_const())}
        }).unwrap() };
        let request=br#"{"operation":"native_sdk_version"}"#;
        unsafe {
            (api.model_execute)(request.as_ptr(),request.len());
            let output=std::slice::from_raw_parts((api.model_output_pointer)(),(api.model_output_length)());
            let result:Value=serde_json::from_slice(output).unwrap();
            assert_eq!(result["value"],2);
        }
        assert_eq!(execute_json(json!({"operation":"native_sdk_version"})).unwrap(),2);
    }
}
fn path(path: &Path) -> Result<&str, String> {
    path.to_str()
        .ok_or_else(|| "Model DLL paths must be valid Unicode".into())
}

#[derive(Debug)]
struct Definition {
    id: u64,
    create: Value,
    release: &'static str,
}
#[derive(Clone, Debug)]
struct Handle(Arc<Definition>);
static NEXT_HANDLE: AtomicU64 = AtomicU64::new(1);
thread_local! { static HANDLES: RefCell<HashMap<u64,(Weak<Definition>,u64,&'static str)>> = RefCell::new(HashMap::new()); }
impl Handle {
    fn new(create: Value, release: &'static str) -> Result<Self, String> {
        let id = NEXT_HANDLE
            .try_update(Ordering::Relaxed, Ordering::Relaxed, |id| id.checked_add(1))
            .map_err(|_| "Model SDK handle space exhausted")?;
        let handle = Self(Arc::new(Definition {
            id,
            create,
            release,
        }));
        handle.get()?;
        Ok(handle)
    }
    fn get(&self) -> Result<u64, String> {
        if let Some(id) = HANDLES.with(|cache| cache.borrow().get(&self.0.id).map(|entry| entry.1))
        {
            return Ok(id);
        }
        let stale = HANDLES.with(|cache| {
            let mut cache = cache.borrow_mut();
            let keys: Vec<_> = cache
                .iter()
                .filter_map(|(id, (owner, _, _))| owner.upgrade().is_none().then_some(*id))
                .collect();
            keys.into_iter()
                .filter_map(|id| cache.remove(&id))
                .collect::<Vec<_>>()
        });
        for (_, id, release) in stale {
            let _: Result<Value, _> = request(json!({"operation":release,"handle":id}));
        }
        let id: u64 = request(self.0.create.clone())?;
        HANDLES.with(|cache| {
            cache
                .borrow_mut()
                .insert(self.0.id, (Arc::downgrade(&self.0), id, self.0.release));
        });
        Ok(id)
    }
}
impl Drop for Handle {
    fn drop(&mut self) {
        if Arc::strong_count(&self.0) != 1 {
            return;
        }
        if let Ok(Some((_, id, _))) =
            HANDLES.try_with(|cache| cache.borrow_mut().remove(&self.0.id))
        {
            let _: Result<Value, _> = request(json!({"operation":self.0.release,"handle":id}));
        }
    }
}

#[derive(Clone, Debug)]
pub struct SchemaContext {
    handle: Handle,
    root: Value,
    documents: Vec<Value>,
    annotations: Arc<RwLock<HashMap<String, Vec<Value>>>>,
}
impl SchemaContext {
    pub fn new(root: Value, documents: Vec<Value>) -> Result<Self, String> {
        Self::new_with_entrypoints(root, documents, vec![])
    }
    pub fn new_with_entrypoints(
        root: Value,
        documents: Vec<Value>,
        entrypoints: Vec<String>,
    ) -> Result<Self, String> {
        let handle = Handle::new(
            json!({"operation":"schema_context_new","schema":root,"documents":documents,"entrypoints":entrypoints}),
            "schema_context_release",
        )?;
        let id = handle.get()?;
        let root = request(json!({"operation":"schema_context_root","handle":id}))?;
        let documents = request(json!({"operation":"schema_context_documents","handle":id}))?;
        Ok(Self {
            handle,
            root,
            documents,
            annotations: Arc::new(RwLock::new(HashMap::new())),
        })
    }
    pub fn root(&self) -> &Value {
        &self.root
    }
    pub fn documents(&self) -> &[Value] {
        &self.documents
    }
    pub fn document_annotations(&self, key: &str) -> Vec<&Value> {
        self.documents.iter().filter_map(|d| d.get(key)).collect()
    }
    pub fn schema_annotations(&self, key: &str) -> Result<Vec<Value>, String> {
        if let Some(value) = self.annotations.read().map_err(|e| e.to_string())?.get(key) {
            return Ok(value.clone());
        }
        let value: Vec<Value> = request(
            json!({"operation":"schema_context_schema_annotations","handle":self.handle.get()?,"key":key}),
        )?;
        self.annotations
            .write()
            .map_err(|e| e.to_string())?
            .insert(key.to_string(), value.clone());
        Ok(value)
    }
    pub fn model_role_values(&self, model: &Value, role: &str) -> Result<Vec<Value>, String> {
        request(
            json!({"operation":"schema_context_model_role_values","handle":self.handle.get()?,"model":model,"role":role}),
        )
    }
    pub fn validate(&self, value: &Value) -> Vec<String> {
        self.handle
            .get()
            .and_then(|id| {
                request(json!({"operation":"schema_context_validate","handle":id,"value":value}))
            })
            .unwrap_or_else(|e| vec![e])
    }
    pub fn validate_fragment(&self, value: &Value, schema: &Value) -> Vec<String> {
        self.handle.get().and_then(|id| request(json!({"operation":"schema_context_validate_fragment","handle":id,"value":value,"schemaNode":schema}))).unwrap_or_else(|e| vec![e])
    }
    pub fn validate_at(&self, value: &Value, pointer: &str) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"schema_context_validate_at","handle":self.handle.get()?,"value":value,"schemaPath":pointer}),
        )
    }
    pub fn validate_rules(&self, model: &Value, context: &Value) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"schema_context_validate_rules","handle":self.handle.get()?,"model":model,"context":context}),
        )
    }
    pub fn validate_declaration(
        &self,
        model: &Value,
        context: &Value,
        declaration: &Value,
    ) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"schema_context_validate_declaration","handle":self.handle.get()?,"model":model,"context":context,"declaration":declaration}),
        )
    }
    pub fn bind_policy(
        &self,
        model: &Value,
        context: &Value,
        declaration: &Value,
    ) -> Result<Value, String> {
        request(
            json!({"operation":"schema_context_bind_policy","handle":self.handle.get()?,"model":model,"context":context,"declaration":declaration}),
        )
    }
}
pub mod schema_documents {
    use super::*;
    pub fn load_schema_documents(p: &Path) -> Result<Vec<Value>, String> {
        request(json!({"operation":"load_schema_documents","path":path(p)?}))
    }
}
pub mod schema {
    use super::*;
    pub fn validate(value: &Value, schema: &Value) -> Vec<String> {
        request(json!({"operation":"validate_json_schema","value":value,"schema":schema}))
            .unwrap_or_else(|e| vec![e])
    }
    pub fn validate_with_root(value: &Value, schema: &Value, root: &Value) -> Vec<String> {
        request(json!({"operation":"validate_json_schema_at","value":value,"schemaNode":schema,"schema":root})).unwrap_or_else(|e| vec![e])
    }
}
pub mod argv {
    use super::*;
    #[derive(Clone, Debug, Deserialize)]
    pub struct DecodedArgs {
        pub arguments: Vec<String>,
        pub globals: serde_json::Map<String, Value>,
        pub mode: String,
        pub values: serde_json::Map<String, Value>,
        pub help: bool,
        pub empty: bool,
    }
    pub fn decode(
        arguments: &[String],
        declaration: &Value,
        schema: &Value,
    ) -> Result<DecodedArgs, String> {
        request(
            json!({"operation":"argv_decode","arguments":arguments,"declaration":declaration,"schema":schema}),
        )
    }
    pub fn string_value(
        value: &str,
        declaration: &Value,
        schema: &Value,
    ) -> Result<String, String> {
        request(
            json!({"operation":"argv_string_value","value":value,"declaration":declaration,"schema":schema}),
        )
    }
}
pub mod runtime_paths {
    use super::*;
    pub fn installation_root() -> Result<PathBuf, String> {
        request::<String>(json!({"operation":"installation_root"})).map(PathBuf::from)
    }
    pub fn program_registry(documents: &[Value]) -> Result<Value, String> {
        request(json!({"operation":"program_registry","documents":documents}))
    }
    fn lookup(
        op: &str,
        documents: &[Value],
        schema_file: &Path,
        root: &Path,
        id: &str,
    ) -> Result<PathBuf, String> {
        request::<String>(json!({"operation":op,"documents":documents,"schemaFile":path(schema_file)?,"root":path(root)?,"id":id})).map(PathBuf::from)
    }
    pub fn external_program_path(
        documents: &[Value],
        schema_file: &Path,
        root: &Path,
        id: &str,
    ) -> Result<PathBuf, String> {
        lookup("external_program_path", documents, schema_file, root, id)
    }
    pub fn runtime_tool_path(
        documents: &[Value],
        schema_file: &Path,
        root: &Path,
        id: &str,
    ) -> Result<PathBuf, String> {
        lookup("runtime_tool_path", documents, schema_file, root, id)
    }
}
pub mod rules {
    use super::*;
    pub fn validate(
        model: &Value,
        schema: &Value,
        documents: &[Value],
        context: &Value,
    ) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"validate_rules_direct","model":model,"schema":schema,"documents":documents,"context":context}),
        )
    }
    pub fn validate_declaration(
        model: &Value,
        schema: &Value,
        documents: &[Value],
        context: &Value,
        declaration: &Value,
    ) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"validate_rule_declaration","model":model,"schema":schema,"documents":documents,"context":context,"declaration":declaration}),
        )
    }
}
pub mod runtime_expressions {
    use super::*;
    pub fn bind_policy(
        model: &Value,
        schema: &Value,
        context: &Value,
        declaration: &Value,
    ) -> Result<Value, String> {
        request(
            json!({"operation":"bind_runtime_policy","model":model,"schema":schema,"context":context,"declaration":declaration}),
        )
    }
}
pub mod rules_options {
    use super::*;
    pub fn resolve(
        resolution: &Value,
        option_sets: &Value,
        conditional_rules: &Value,
        sources: &Value,
        context: &Value,
    ) -> Result<Value, String> {
        request(
            json!({"operation":"resolve_options","resolution":resolution,"optionSets":option_sets,"conditionalRules":conditional_rules,"sources":sources,"context":context}),
        )
    }
}
pub mod semantic_quantities {
    use super::*;
    use fullmeta_core::{pointwise::ComplexValue, quantity::Dimension};
    pub fn validate_resolved_number(
        value: f64,
        rules: &Value,
        path: &str,
        unit: &str,
    ) -> Result<Vec<String>, String> {
        request(
            json!({"operation":"validate_resolved_number","value":value,"rules":rules,"path":path,"unit":unit}),
        )
    }
    #[derive(Clone, Debug)]
    pub struct CompiledComplexQuantity {
        handle: Handle,
    }
    impl CompiledComplexQuantity {
        pub fn compile(quantity: &Value, policy: &Value, path: &str) -> Result<Self, String> {
            Ok(Self {
                handle: Handle::new(
                    json!({"operation":"compile_complex_quantity","quantity":quantity,"policy":policy,"path":path}),
                    "release_compiled_complex_quantity",
                )?,
            })
        }
        pub fn evaluate_with<F>(&self, symbols: F, path: &str) -> Result<ComplexValue, String>
        where
            F: Fn(&str) -> Option<(f64, Dimension)>,
        {
            unsafe extern "C" fn lookup<F: Fn(&str) -> Option<(f64, Dimension)>>(
                ctx: *mut c_void,
                name: *const u8,
                len: usize,
                out: *mut Symbol,
            ) -> i32 {
                let action = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    let name =
                        std::str::from_utf8(unsafe { std::slice::from_raw_parts(name, len) })
                            .ok()?;
                    let f = unsafe { &*ctx.cast::<F>() };
                    f(name)
                }));
                match action {
                    Ok(Some((value, dimension))) => {
                        unsafe {
                            out.write(Symbol { value, dimension });
                        }
                        1
                    }
                    Ok(None) => 0,
                    Err(_) => -1,
                }
            }
            let id = self.handle.get()?;
            let api = dll()?;
            let mut output = Complex { re: 0.0, im: 0.0 };
            let status = unsafe {
                (api.evaluate)(
                    id,
                    path.as_ptr(),
                    path.len(),
                    Some(lookup::<F>),
                    (&symbols as *const F).cast_mut().cast(),
                    &mut output,
                )
            };
            if status == 1 {
                Ok(ComplexValue {
                    re: output.re,
                    im: output.im,
                })
            } else {
                Err(api
                    .response::<Value>()
                    .err()
                    .unwrap_or("Model DLL evaluation failed".into()))
            }
        }
    }
}
