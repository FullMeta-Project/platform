//! Public data types and typed bindings to the FullMeta core DLL.
//! Language implementations remain inside the DLL.
pub mod native;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use std::{cell::RefCell, collections::HashMap, ffi::{c_char, c_void, OsStr},
    os::windows::ffi::OsStrExt, path::{Path, PathBuf}, sync::{Arc, OnceLock, Weak,
    atomic::{AtomicU64, Ordering}}};

#[repr(C)]
#[derive(Clone, Copy)]
struct Input { value: f64, dimension: [f64; 5], present: i32 }
#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Output { value: f64, dimension: [f64; 5] }
#[repr(C)]
#[derive(Clone, Copy)]
struct ComplexInput { re: f64, im: f64, present: i32 }
type Execute = unsafe extern "C" fn(*const u8, usize);
type Pointer = unsafe extern "C" fn() -> *const u8;
type Length = unsafe extern "C" fn() -> usize;
type Compile = unsafe extern "C" fn(*const u8, usize, *mut u64) -> i32;
type Release = unsafe extern "C" fn(u64) -> i32;
type Count = unsafe extern "C" fn(u64, *mut usize) -> i32;
type Symbol = unsafe extern "C" fn(u64, usize, *mut *const u8, *mut usize) -> i32;
type Evaluate = unsafe extern "C" fn(u64, *const u8, usize, usize, *const Input, usize, *mut Output, usize) -> i32;
type DefinitionsCounts = unsafe extern "C" fn(u64, *mut usize, *mut usize) -> i32;
type DefinitionsName = unsafe extern "C" fn(u64, i32, usize, *mut *const u8, *mut usize) -> i32;
type DefinitionsEvaluate = unsafe extern "C" fn(u64, usize, *const ComplexInput, usize, *mut pointwise::ComplexValue, usize) -> i32;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn LoadLibraryW(path: *const u16) -> *mut c_void;
    fn GetProcAddress(module: *mut c_void, name: *const c_char) -> *mut c_void;
    fn FreeLibrary(module: *mut c_void) -> i32;
}
struct Api { library: *mut c_void, path: PathBuf, execute: Execute, output: Pointer, output_len: Length,
    error: Pointer, error_len: Length, compile: Compile, release: Release,
    count: Count, symbol: Symbol, evaluate: Evaluate, definitions_compile: Compile,
    definitions_release: Release, definitions_counts: DefinitionsCounts,
    definitions_name: DefinitionsName, definitions_evaluate: DefinitionsEvaluate }
unsafe impl Send for Api {}
unsafe impl Sync for Api {}
impl Drop for Api { fn drop(&mut self) { unsafe { FreeLibrary(self.library); } } }
impl Api {
    fn load() -> Result<Self, String> {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let relative = Path::new("platform/core-rust/lib/fullmeta_core.dll");
        if let Some(path) = std::env::var_os("FULLMETA_CORE_DLL") { return Self::load_path(PathBuf::from(path)); }
        if let Some(path) = CONFIGURED_PATH.get() { return Self::load_path(path.clone()); }
        let directory=exe.parent().ok_or("Missing executable directory")?;
        let mut candidates = std::env::var_os("FULLMETA_ROOT").map(PathBuf::from).into_iter()
                .chain(exe.ancestors().map(Path::to_path_buf)).map(|root| root.join(relative))
                .filter(|candidate| candidate.is_file()).collect::<Vec<_>>();
        candidates.push(directory.join("fullmeta_core.dll"));
        let mut errors=Vec::new();
        for path in candidates { match Self::load_path(path) { Ok(api)=>return Ok(api), Err(error)=>errors.push(error) } }
        Err(format!("Cannot load a compatible core DLL: {}",errors.join("; ")))
    }
    fn load_path(path: PathBuf) -> Result<Self, String> {
        let wide: Vec<u16> = OsStr::new(&path).encode_wide().chain(Some(0)).collect();
        let library = unsafe { LoadLibraryW(wide.as_ptr()) };
        if library.is_null() { return Err(format!("Cannot load core DLL {}: {}", path.display(), std::io::Error::last_os_error())); }
        let sym = |name: &'static [u8]| { let p = unsafe { GetProcAddress(library, name.as_ptr().cast()) };
            if p.is_null() { Err(format!("Core DLL missing {}", String::from_utf8_lossy(&name[..name.len()-1]))) } else { Ok(p) } };
        let loaded = (|| {
            type Version = unsafe extern "C" fn() -> u32;
            let version:Version=unsafe{std::mem::transmute(sym(b"core_language_abi_version\0")?)};
            if unsafe{version()}!=1{return Err("Unsupported core language ABI version".into());}
            for name in [b"core_context_compile\0".as_slice(),b"core_context_release\0".as_slice(),
                b"core_context_count\0".as_slice(),b"core_context_expression\0".as_slice(),b"core_context_definitions\0".as_slice()] {
                let _=sym(name)?;
            }
            Ok(Self { library, path,
            execute: unsafe { std::mem::transmute::<*mut c_void, Execute>(sym(b"core_execute\0")?) },
            output: unsafe { std::mem::transmute::<*mut c_void, Pointer>(sym(b"core_output_pointer\0")?) },
            output_len: unsafe { std::mem::transmute::<*mut c_void, Length>(sym(b"core_output_length\0")?) },
            error: unsafe { std::mem::transmute::<*mut c_void, Pointer>(sym(b"core_language_error_pointer\0")?) },
            error_len: unsafe { std::mem::transmute::<*mut c_void, Length>(sym(b"core_language_error_length\0")?) },
            compile: unsafe { std::mem::transmute::<*mut c_void, Compile>(sym(b"core_quantity_compile\0")?) },
            release: unsafe { std::mem::transmute::<*mut c_void, Release>(sym(b"core_quantity_release\0")?) },
            count: unsafe { std::mem::transmute::<*mut c_void, Count>(sym(b"core_quantity_symbol_count\0")?) },
            symbol: unsafe { std::mem::transmute::<*mut c_void, Symbol>(sym(b"core_quantity_symbol\0")?) },
            evaluate: unsafe { std::mem::transmute::<*mut c_void, Evaluate>(sym(b"core_quantity_evaluate_batch\0")?) },
            definitions_compile: unsafe { std::mem::transmute::<*mut c_void, Compile>(sym(b"core_definitions_compile\0")?) },
            definitions_release: unsafe { std::mem::transmute::<*mut c_void, Release>(sym(b"core_definitions_release\0")?) },
            definitions_counts: unsafe { std::mem::transmute::<*mut c_void, DefinitionsCounts>(sym(b"core_definitions_counts\0")?) },
            definitions_name: unsafe { std::mem::transmute::<*mut c_void, DefinitionsName>(sym(b"core_definitions_name\0")?) },
            definitions_evaluate: unsafe { std::mem::transmute::<*mut c_void, DefinitionsEvaluate>(sym(b"core_definitions_evaluate_batch\0")?) },
        })})();
        if loaded.is_err() { unsafe { FreeLibrary(library); } }
        loaded
    }
    fn check(&self, status: i32) -> Result<(), String> {
        if status == 1 { return Ok(()); }
        let (p, n) = unsafe { ((self.error)(), (self.error_len)()) };
        if p.is_null() || n > isize::MAX as usize { return Err("Invalid core DLL error buffer".into()); }
        Err(String::from_utf8_lossy(unsafe { std::slice::from_raw_parts(p, n) }).into_owned())
    }
    fn request<T: DeserializeOwned>(&self, value: Value) -> Result<T, String> {
        let data = serde_json::to_vec(&value).map_err(|e| e.to_string())?;
        unsafe { (self.execute)(data.as_ptr(), data.len()); }
        let (p, n) = unsafe { ((self.output)(), (self.output_len)()) };
        if p.is_null() || n > isize::MAX as usize { return Err("Invalid core DLL response buffer".into()); }
        let response: Value = serde_json::from_slice(unsafe { std::slice::from_raw_parts(p, n) }).map_err(|e| e.to_string())?;
        if response.get("ok").and_then(Value::as_bool) != Some(true) {
            return Err(response.get("error").and_then(Value::as_str).unwrap_or("Core DLL request failed").into());
        }
        serde_json::from_value(response.get("value").cloned().ok_or("Core DLL response missing value")?).map_err(|e| e.to_string())
    }
}
static API: OnceLock<Result<Api, String>> = OnceLock::new();
static CONFIGURED_PATH: OnceLock<PathBuf> = OnceLock::new();
fn api() -> Result<&'static Api, String> { API.get_or_init(Api::load).as_ref().map_err(Clone::clone) }
fn request<T: DeserializeOwned>(value: Value) -> Result<T, String> { api()?.request(value) }
/// Invoke any operation exposed by the core DLL's JSON interface.
/// See the platform contract for the operation's request and result fields.
pub fn execute_json(value: Value) -> Result<Value, String> { request(value) }
pub fn initialize() -> Result<(), String> { api().map(|_| ()) }
pub fn configure_library_path(path:PathBuf)->Result<(),String> {
    if API.get().is_some(){return Err("Core DLL is already initialized".into());}
    CONFIGURED_PATH.set(path).map_err(|_|"Core DLL path is already configured".into())
}
/// Selected DLL path, shared with the expression-context adapter.
pub fn library_path() -> Result<&'static Path, String> { Ok(api()?.path.as_path()) }

#[derive(Debug)]
struct Definition { id: u64, request: Value, symbols: OnceLock<Arc<[String]>> }
#[derive(Clone, Debug)]
struct Handle(Arc<Definition>);
static NEXT: AtomicU64 = AtomicU64::new(1);
thread_local! { static HANDLES: RefCell<HashMap<u64, (Weak<Definition>, u64, Arc<[String]>)>> = RefCell::new(HashMap::new()); }
impl Handle {
    fn new(request: Value) -> Result<Self, String> {
        let id = NEXT.fetch_update(Ordering::Relaxed, Ordering::Relaxed, |id| id.checked_add(1))
            .map_err(|_| "Core SDK handle space exhausted")?;
        let result = Self(Arc::new(Definition { id, request, symbols: OnceLock::new() }));
        let (_, names) = result.get()?;
        let _ = result.0.symbols.set(names);
        Ok(result)
    }
    fn get(&self) -> Result<(u64, Arc<[String]>), String> {
        if let Some((id, names)) = HANDLES.with(|items| items.borrow().get(&self.0.id).map(|(_, id, names)| (*id, names.clone()))) { return Ok((id, names)); }
        let api = api()?;
        let stale = HANDLES.with(|items| { let mut items = items.borrow_mut(); let keys: Vec<_> = items.iter().filter_map(|(k,(w,_,_))| w.upgrade().is_none().then_some(*k)).collect();
            keys.into_iter().filter_map(|key| items.remove(&key)).collect::<Vec<_>>() });
        for (_, handle, _) in stale { unsafe { (api.release)(handle); } }
        let data = serde_json::to_vec(&self.0.request).map_err(|e| e.to_string())?;
        let mut id = 0;
        api.check(unsafe { (api.compile)(data.as_ptr(), data.len(), &mut id) })?;
        let result = (|| { let mut count = 0;
            api.check(unsafe { (api.count)(id, &mut count) })?;
            let mut names = Vec::with_capacity(count);
            for index in 0..count { let (mut p, mut n) = (std::ptr::null(), 0);
                api.check(unsafe { (api.symbol)(id, index, &mut p, &mut n) })?;
                if p.is_null() || n > isize::MAX as usize { return Err("Invalid core symbol".into()); }
                names.push(std::str::from_utf8(unsafe { std::slice::from_raw_parts(p, n) }).map_err(|e| e.to_string())?.to_owned()); }
            Ok::<_, String>(names)
        })();
        let names: Arc<[String]> = match result { Ok(names) => names.into(), Err(error) => { unsafe { (api.release)(id); } return Err(error); } };
        HANDLES.with(|items| { items.borrow_mut().insert(self.0.id, (Arc::downgrade(&self.0), id, names.clone())); });
        Ok((id, names))
    }
    fn eval<F>(&self, lookup: F, path: &str) -> Result<quantity::QuantityValue, String>
    where F: Fn(&str) -> Option<quantity::QuantityValue> {
        let (id, names) = self.get()?;
        let blank = Input { value: 0., dimension: [0.;5], present: 0 };
        let mut stack = [blank; 12];
        let mut overflow = if names.len() > stack.len() { vec![blank; names.len()] } else { Vec::new() };
        let values = if overflow.is_empty() { &mut stack[..names.len()] } else { overflow.as_mut_slice() };
        for (name, slot) in names.iter().zip(values.iter_mut()) {
            if let Some(v) = lookup(name) { *slot = Input { value: v.value, dimension: v.dimension, present: 1 }; }
        }
        let mut out = Output::default(); let api = api()?;
        api.check(unsafe { (api.evaluate)(id, path.as_ptr(), path.len(), 1, values.as_ptr(), values.len(), &mut out, 1) })?;
        Ok(quantity::QuantityValue { value: out.value, dimension: out.dimension })
    }
    fn eval_batch<F>(&self, rows:usize, lookup:F, path:&str)->Result<Vec<quantity::QuantityValue>,String>
    where F:Fn(usize,&str)->Option<quantity::QuantityValue> {
        let (id,names)=self.get()?;
        let count=rows.checked_mul(names.len()).ok_or("Quantity batch size overflow")?;
        let mut values=Vec::with_capacity(count);
        for row in 0..rows {for name in names.iter(){values.push(match lookup(row,name){
            Some(value)=>Input{value:value.value,dimension:value.dimension,present:1},
            None=>Input{value:0.,dimension:[0.;5],present:0},
        });}}
        let mut out=vec![Output::default();rows];let api=api()?;
        api.check(unsafe{(api.evaluate)(id,path.as_ptr(),path.len(),rows,values.as_ptr(),values.len(),out.as_mut_ptr(),out.len())})?;
        Ok(out.into_iter().map(|v|quantity::QuantityValue{value:v.value,dimension:v.dimension}).collect())
    }
}
impl Drop for Handle { fn drop(&mut self) { if Arc::strong_count(&self.0) == 1 {
    if let Ok(Some((_, id, _))) = HANDLES.try_with(|items| items.borrow_mut().remove(&self.0.id)) {
        if let Ok(api) = api() { unsafe { (api.release)(id); } }
    }
} } }

pub mod expression {
    use super::*;
    use serde::{Deserialize, Serialize};
    pub type AstNode = Value;
    #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
    pub struct InspectedExpression { pub tree: AstNode, pub symbols: Vec<String>, pub calls: Vec<String> }
    pub fn inspect_expression(source:&str)->Result<InspectedExpression,String> { request(json!({"operation":"inspect_expression","expression":source})) }
    pub fn parse_expression(source:&str)->Result<AstNode,String> { request(json!({"operation":"parse_expression","expression":source})) }
    pub fn node_symbols(node:&AstNode)->Result<Vec<String>,String> { request(json!({"operation":"node_symbols","tree":node})) }
    pub fn polynomial_degree_capped_2(node:&AstNode,names:&[&str])->Result<usize,String> {
        request(json!({"operation":"polynomial_degree_capped_2","tree":node,"names":names}))
    }
}

pub mod pointwise {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    #[repr(C)]
    #[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
    pub struct ComplexValue { pub re:f64, pub im:f64 }
    pub fn evaluate_complex_call(name:&str,args:&[ComplexValue])->Result<ComplexValue,String> { request(json!({"operation":"evaluate_complex_call","name":name,"args":args})) }
    pub fn evaluate_complex_definitions(definitions:&[(String,expression::AstNode)], symbols:&HashMap<String,ComplexValue>)->Result<HashMap<String,ComplexValue>,String> {
        request(json!({"operation":"evaluate_complex_definitions","definitions":definitions,"symbols":symbols}))
    }
    /// Owns a DLL definition context on its creating thread.
    pub struct DefinitionPlan { handle:u64, inputs:Vec<String>, outputs:Vec<String>, _local:std::marker::PhantomData<std::rc::Rc<()>> }
    impl Drop for DefinitionPlan { fn drop(&mut self) { if let Ok(api)=api(){ unsafe { (api.definitions_release)(self.handle); } } } }
    impl DefinitionPlan {
        pub fn compile(definitions:&[(String,expression::AstNode)])->Result<Self,String> {
            let data=serde_json::to_vec(definitions).map_err(|e|e.to_string())?;
            let api=api()?; let mut handle=0;
            api.check(unsafe{(api.definitions_compile)(data.as_ptr(),data.len(),&mut handle)})?;
            unsafe { Self::from_owned_handle(handle) }
        }
        /// Takes ownership of a definition handle returned by the same core DLL
        /// on the current thread.
        /// # Safety
        /// The handle must be a uniquely owned live definition handle from the
        /// same loaded DLL on this thread, and must not be released elsewhere.
        pub unsafe fn from_owned_handle(handle:u64)->Result<Self,String> {
            let api=api()?;
            let mut plan=Self{handle,inputs:Vec::new(),outputs:Vec::new(),_local:std::marker::PhantomData};
            let (mut ni,mut no)=(0,0); api.check(unsafe{(api.definitions_counts)(handle,&mut ni,&mut no)})?;
            for (kind,count) in [(0,ni),(1,no)] { for index in 0..count {
                let (mut p,mut n)=(std::ptr::null(),0);
                api.check(unsafe{(api.definitions_name)(handle,kind,index,&mut p,&mut n)})?;
                if p.is_null()||n>isize::MAX as usize{return Err("Invalid definition slot name".into());}
                let name=std::str::from_utf8(unsafe{std::slice::from_raw_parts(p,n)}).map_err(|e|e.to_string())?.to_owned();
                if kind==0 {plan.inputs.push(name);} else {plan.outputs.push(name);}
            } }
            Ok(plan)
        }
        pub fn evaluate_batch(&self, rows:&mut [HashMap<String,ComplexValue>])->Result<(),String> {
            let mut input=Vec::with_capacity(rows.len()*self.inputs.len());
            for row in rows.iter(){for name in &self.inputs { input.push(match row.get(name) {
                Some(value)=>ComplexInput{re:value.re,im:value.im,present:1},
                None=>ComplexInput{re:0.,im:0.,present:0},
            });}}
            let count=rows.len().checked_mul(self.outputs.len()).ok_or("Definition output size overflow")?;
            let mut output=vec![ComplexValue::default();count]; let api=api()?;
            api.check(unsafe{(api.definitions_evaluate)(self.handle,rows.len(),input.as_ptr(),input.len(),output.as_mut_ptr(),output.len())})?;
            for (i,row) in rows.iter_mut().enumerate(){for (j,name) in self.outputs.iter().enumerate(){row.insert(name.clone(),output[i*self.outputs.len()+j]);}}
            Ok(())
        }
    }
}

pub mod quantity {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    thread_local! { static QUANTITY_CACHE: RefCell<HashMap<String, Handle>> = RefCell::new(HashMap::new()); }
    fn cached_handle(request:Value)->Result<Handle,String>{
        let key=serde_json::to_string(&request).map_err(|e|e.to_string())?;
        if let Some(handle)=QUANTITY_CACHE.with(|cache|cache.borrow().get(&key).cloned()){return Ok(handle);}
        let handle=Handle::new(request)?;
        QUANTITY_CACHE.with(|cache|{let mut cache=cache.borrow_mut();if cache.len()>=128 {cache.clear();}cache.insert(key,handle.clone());});
        Ok(handle)
    }
    pub type Dimension = [f64;5];
    pub const ZERO_DIMENSION: Dimension = [0.;5];
    #[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
    pub struct Unit { pub scale:f64, #[serde(deserialize_with="deserialize_dimension")] pub dimension:Dimension }
    #[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
    pub struct QuantityValue { pub value:f64, #[serde(deserialize_with="deserialize_dimension")] pub dimension:Dimension }
    fn deserialize_dimension<'de,D:serde::Deserializer<'de>>(deserializer:D)->Result<Dimension,D::Error>{
        let components=Vec::<f64>::deserialize(deserializer)?;
        if !matches!(components.len(),4|5) || components.iter().any(|value|!value.is_finite()) {
            return Err(serde::de::Error::custom("dimension must contain four legacy or five finite SI exponents"));
        }
        let mut dimension=ZERO_DIMENSION;
        dimension[..components.len()].copy_from_slice(&components);
        Ok(dimension)
    }
    pub fn dimension_from_json(value:&Value)->Option<Dimension> {
        let a=value.as_array()?; if !matches!(a.len(),4|5) {return None;} let mut result=[0.;5];
        for (index,item) in a.iter().enumerate(){let n=item.as_f64()?;if !n.is_finite(){return None;}result[index]=n;} Some(result)
    }
    pub fn get_unit(name:&str)->Result<Unit,String> {
        static UNITS: OnceLock<std::sync::Mutex<HashMap<String,Unit>>> = OnceLock::new();
        let cache=UNITS.get_or_init(||std::sync::Mutex::new(HashMap::new()));
        if let Some(unit)=cache.lock().map_err(|e|e.to_string())?.get(name).copied(){return Ok(unit);}
        let unit=request(json!({"operation":"get_unit","unit":name}))?;
        cache.lock().map_err(|e|e.to_string())?.insert(name.into(),unit); Ok(unit)
    }
    #[derive(Clone,Debug)] pub struct EvaluationPolicy(Value);
    impl EvaluationPolicy { pub fn from_json(value:&Value)->Result<Self,String> {
        static VALID: OnceLock<std::sync::Mutex<std::collections::HashSet<String>>> = OnceLock::new();
        let key=serde_json::to_string(value).map_err(|e|e.to_string())?;
        let cache=VALID.get_or_init(||std::sync::Mutex::new(std::collections::HashSet::new()));
        if !cache.lock().map_err(|e|e.to_string())?.contains(&key) {
            let _:bool=request(json!({"operation":"validate_evaluation_policy","evaluationPolicy":value}))?;
            let mut cache=cache.lock().map_err(|e|e.to_string())?;
            if cache.len()>=128 {cache.clear();} cache.insert(key);
        }
        Ok(Self(value.clone()))
    } }
    #[derive(Clone,Debug)] pub struct CompiledExpression(Handle);
    impl CompiledExpression {
        pub fn compile(source:&str,policy:EvaluationPolicy,path:&str)->Result<Self,String> {Ok(Self(cached_handle(json!({"expression":source,"policy":policy.0,"path":path}))?))}
        pub fn uses_symbol(&self,name:&str)->bool { self.0.0.symbols.get().is_some_and(|names|names.iter().any(|n|n==name)) }
        pub fn evaluate_with<F:Fn(&str)->Option<QuantityValue>>(&self,symbols:F,path:&str)->Result<QuantityValue,String>{self.0.eval(symbols,path)}
    }
    #[derive(Clone,Debug)] pub struct CompiledQuantity(Handle);
    impl CompiledQuantity {
        pub fn compile(quantity:&Value,policy:EvaluationPolicy,path:&str)->Result<Self,String>{Ok(Self(cached_handle(json!({"quantity":quantity,"policy":policy.0,"path":path}))?))}
        pub fn uses_symbol(&self,name:&str)->bool{self.0.0.symbols.get().is_some_and(|names|names.iter().any(|n|n==name))}
        pub fn evaluate_with<F:Fn(&str)->Option<QuantityValue>>(&self,symbols:F,path:&str)->Result<f64,String>{Ok(self.0.eval(symbols,path)?.value)}
        pub fn evaluate_batch<F:Fn(usize,&str)->Option<QuantityValue>>(&self,rows:usize,symbols:F,path:&str)->Result<Vec<f64>,String>{
            Ok(self.0.eval_batch(rows,symbols,path)?.into_iter().map(|value|value.value).collect())
        }
    }
    pub fn resolve_parameters_with_policy(parameters:&[Value], reserved:&[String], policy:&EvaluationPolicy,path:&str)->Result<serde_json::Map<String,Value>,String>{
        request(json!({"operation":"resolve_parameters","parameters":parameters,"reservedSymbols":reserved,"evaluationPolicy":policy.0,"parameterPath":path}))
    }
    pub fn resolve_parameters(parameters:&[Value],reserved:&[String],allowed:&[String],path:&str)->Result<serde_json::Map<String,Value>,String>{
        request(json!({"operation":"resolve_parameters","parameters":parameters,"reservedSymbols":reserved,"allowedFunctions":allowed,"parameterPath":path}))
    }
    pub fn evaluate_quantity(quantity:&Value,symbols:&serde_json::Map<String,Value>,path:&str,allowed:&[String])->Result<f64,String>{
        request(json!({"operation":"evaluate_quantity","quantity":quantity,"symbols":symbols,"path":path,"allowedFunctions":allowed}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn generated_native_bindings_resolve_and_execute_expression() {
        assert!(execute_json(json!({"operation":"inspect_expression","expression":"x+1"})).unwrap().is_object());
        let api=api().unwrap();
        let native=unsafe { native::NativeApi::load(|name| {
            let name=std::ffi::CString::new(name).unwrap();
            let pointer=GetProcAddress(api.library,name.as_ptr());
            if pointer.is_null(){Err("missing symbol".into())}else{Ok(pointer.cast_const())}
        }).unwrap() };
        unsafe {
            assert_eq!((native.core_language_abi_version)(),1);
            let expression=b"x*2"; let operators=b"[]"; let mut handle=0;
            assert_eq!((native.core_language_compile)(expression.as_ptr(),expression.len(),operators.as_ptr(),operators.len(),&mut handle),1);
            let (mut symbols,mut count)=(0,0);
            assert_eq!((native.core_language_counts)(handle,&mut symbols,&mut count),1);
            assert_eq!((symbols,count),(1,0));
            let input=native::FullMetaCoreComplex{re:3.,im:0.};
            let mut output=native::FullMetaCoreComplex{re:0.,im:0.};
            assert_eq!((native.core_language_evaluate_batch)(handle,1,&input,1,std::ptr::null(),0,&mut output,1),1);
            assert_eq!((output.re,output.im),(6.,0.));
            assert_eq!((native.core_language_release)(handle),1);
        }
    }
    fn policy() -> quantity::EvaluationPolicy {
        quantity::EvaluationPolicy::from_json(&json!({"allowedFunctions":[],"builtinSymbols":["pi","e"],
            "dimensionTolerance":1e-10,"allowDimensionlessZeroAddition":true,
            "requireFiniteIntermediates":true,"signZeroMode":"preserveZero"})).unwrap()
    }
    #[test]
    fn legacy_four_component_dimensions_remain_supported() {
        let value:quantity::QuantityValue=serde_json::from_value(json!({"value":2,"dimension":[1,0,0,0]})).unwrap();
        assert_eq!(value.dimension,[1.,0.,0.,0.,0.]);
        assert!(serde_json::from_value::<quantity::Unit>(json!({"scale":1,"dimension":[1,0,0]})).is_err());
    }
    #[test]
    fn typed_quantity_batch_matches_scalar_and_checks_dimensions() {
        let expression=quantity::CompiledQuantity::compile(&json!({"expression":"x*2","unit":"m"}),policy(),"length").unwrap();
        let rows=[quantity::QuantityValue{value:2.,dimension:[1.,0.,0.,0.,0.]},quantity::QuantityValue{value:4.,dimension:[1.,0.,0.,0.,0.]}];
        assert_eq!(expression.evaluate_batch(2,|i,name|(name=="x").then_some(rows[i]),"length").unwrap(),vec![4.,8.]);
        assert_eq!(expression.evaluate_with(|name|(name=="x").then_some(rows[0]),"length").unwrap(),4.);
        let bad=quantity::QuantityValue{value:1.,dimension:[0.,0.,1.,0.,0.]};
        assert!(expression.evaluate_with(|_|Some(bad),"length").unwrap_err().contains("unit"));
        let moved=expression.clone();
        assert_eq!(std::thread::spawn(move||moved.evaluate_with(|name|(name=="x").then_some(rows[1]),"length").unwrap()).join().unwrap(),8.);
    }
    #[test]
    fn definition_plan_batches_and_preserves_overrides() {
        let defs=vec![("q".into(),expression::parse_expression("2*x").unwrap()),("r".into(),expression::parse_expression("q+1").unwrap())];
        let plan=pointwise::DefinitionPlan::compile(&defs).unwrap();
        let mut rows=[HashMap::from([("x".into(),pointwise::ComplexValue{re:2.,im:0.})]),
            HashMap::from([("x".into(),pointwise::ComplexValue{re:3.,im:0.}),("q".into(),pointwise::ComplexValue{re:10.,im:0.})])];
        plan.evaluate_batch(&mut rows).unwrap();
        assert_eq!((rows[0]["q"].re,rows[0]["r"].re,rows[1]["q"].re,rows[1]["r"].re),(4.,5.,10.,11.));
    }
}
