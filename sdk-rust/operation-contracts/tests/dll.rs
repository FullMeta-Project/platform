use fullmeta_operation_contracts_sdk::{Contracts, Error};
use serde_json::json;

const REGISTRY: &[u8] = br##"{
  "format": "fullmeta-native-operations/1",
  "operations": {
    "sample.run": {
      "version": 1, "program": "sample", "entry": "--run", "protocol": "json-stdio",
      "inputSchema": {"type":"object","required":["value"],"properties":{"value":{"type":"number"}}},
      "resultSchema": {"type":"boolean"}, "eventSchema":{"type":"object","required":["type"]}
    }
  }, "$defs": {}
}"##;

fn client() -> Contracts {
    let path = std::env::var_os("FULLMETA_CONTRACTS_DLL")
        .expect("set FULLMETA_CONTRACTS_DLL to the built DLL");
    Contracts::open(path, REGISTRY).unwrap()
}

#[test]
fn registry_and_validation_preserve_structured_errors() {
    let client = client();
    assert_eq!(client.execute_json(json!({"operation":"sdk_api_version"})).unwrap(),1);
    assert_eq!(
        client.contract_digest().unwrap(),
        client.digest(REGISTRY).unwrap()
    );
    let identity = client
        .resolve_binding(&json!({"id":"sample.run","version":1}))
        .unwrap();
    assert_eq!(identity.digest, client.contract_digest().unwrap());
    assert!(client.describe(Some("sample")).unwrap()["operations"]["sample.run"].is_object());
    assert!(client.descriptor("sample.run").unwrap().is_object());
    let Error::Diagnostic(issue) = client
        .resolve_binding(&json!({"id":"sample.run","version":2}))
        .unwrap_err()
    else {
        panic!("expected diagnostic")
    };
    assert_eq!(issue.code, "OPERATION_CONTRACT_VERSION_MISMATCH");
    assert_eq!(issue.stage, "contract");
    assert_eq!(issue.path.as_deref(), Some("/operationContract/version"));
    let Error::Diagnostic(issue) = client.descriptor("missing").unwrap_err() else {
        panic!("expected diagnostic")
    };
    assert_eq!(issue.code, "OPERATION_CONTRACT_UNKNOWN");
    client
        .validate_input("sample.run", &json!({"value":5}))
        .unwrap();
    let Error::Validation(issues) = client
        .validate_input("sample.run", &json!({"value":"bad"}))
        .unwrap_err()
    else {
        panic!("expected validation issues")
    };
    assert_eq!(issues[0].code, "OPERATION_INPUT_INVALID");
    assert_eq!(issues[0].path.as_deref(), Some("/value"));
    assert_eq!(
        client.error_response(&issues).unwrap()["diagnostics"][0]["code"],
        "OPERATION_INPUT_INVALID"
    );
    assert_eq!(client.error_event(&issues).unwrap()["type"], "error");
    client.validate_result("sample.run", &json!(true)).unwrap();
    client
        .validate_event("sample.run", &json!({"type":"complete"}))
        .unwrap();
    assert!(matches!(
        client.validate_result("sample.run", &json!(3)),
        Err(Error::Validation(_))
    ));
    assert_eq!(
        client
            .diagnostic("CUSTOM", "failed", None, "test")
            .unwrap()
            .code,
        "CUSTOM"
    );
}

#[test]
fn client_clones_work_on_other_threads() {
    let client = client();
    let expected = client.contract_digest().unwrap();
    let mut threads = Vec::new();
    for _ in 0..4 {
        let client = client.clone();
        threads.push(std::thread::spawn(move || {
            for _ in 0..20 {
                client
                    .validate_input("sample.run", &json!({"value":5}))
                    .unwrap();
                assert!(
                    client
                        .validate_input("sample.run", &json!({"value":"bad"}))
                        .is_err()
                );
            }
            client.contract_digest().unwrap()
        }));
    }
    for thread in threads {
        assert_eq!(thread.join().unwrap(), expected);
    }
}

#[test]
fn invalid_registry_and_missing_library_are_reported() {
    let path = std::env::var_os("FULLMETA_CONTRACTS_DLL").unwrap();
    assert!(matches!(
        Contracts::open(path, b"not JSON"),
        Err(Error::Interface(_))
    ));
    assert!(matches!(
        Contracts::open("does-not-exist.dll", REGISTRY),
        Err(Error::Interface(_))
    ));
}
