use fullmeta_model::{SchemaContext, schema, semantic_quantities::CompiledComplexQuantity};
use serde_json::json;

#[test]
fn schema_context_and_validation() {
    let root = json!({"type":"object","x-note":{"a":1},"properties":{"answer":{"type":"integer","x-fullmeta-role":"target"}}});
    let context = SchemaContext::new(root, vec![]).unwrap();
    assert_eq!(
        context.document_annotations("x-note"),
        vec![&json!({"a":1})]
    );
    assert_eq!(
        context
            .model_role_values(&json!({"answer":42}), "target")
            .unwrap(),
        vec![json!(42)]
    );
    assert_eq!(
        context.schema_annotations("x-fullmeta-role").unwrap().len(),
        1
    );
    assert!(schema::validate(&json!({"answer":42}), context.root()).is_empty());
    assert!(!schema::validate(&json!({"answer":"bad"}), context.root()).is_empty());
    for value in [json!({"answer":42}), json!({"answer":"bad"})] {
        assert_eq!(
            context.validate(&value),
            schema::validate(&value, context.root())
        );
        let node = &context.root()["properties"]["answer"];
        assert_eq!(
            context.validate_fragment(&value["answer"], node),
            schema::validate_with_root(&value["answer"], node, context.root())
        );
        assert_eq!(
            context
                .validate_at(&value["answer"], "/properties/answer")
                .unwrap(),
            schema::validate_with_root(&value["answer"], node, context.root())
        );
    }
    let declaration = json!({"maximumErrors":3,"rules":[]});
    assert_eq!(
        context
            .validate_declaration(&json!({}), &json!({}), &declaration)
            .unwrap(),
        fullmeta_model::rules::validate_declaration(
            &json!({}),
            context.root(),
            context.documents(),
            &json!({}),
            &declaration
        )
        .unwrap()
    );
    assert_eq!(
        context.validate_rules(&json!({}), &json!({})),
        fullmeta_model::rules::validate(
            &json!({}),
            context.root(),
            context.documents(),
            &json!({})
        )
    );
    let clone = context.clone();
    std::thread::spawn(move || {
        assert_eq!(
            clone.schema_annotations("x-fullmeta-role").unwrap().len(),
            1
        )
    })
    .join()
    .unwrap();
}

#[test]
fn compiled_callback_handles_multiple_threads_and_cleanup() {
    let quantity = json!({"expression":"exp(-j*phase)","unit":"1"});
    let policy = json!({"dimensionTolerance":1e-10,"imaginarySymbol":"j","allowedFunctions":["exp"],"complexFunctions":["exp"]});
    let compiled = CompiledComplexQuantity::compile(&quantity, &policy, "signal").unwrap();
    let value = compiled
        .evaluate_with(
            |name| (name == "phase").then_some((std::f64::consts::FRAC_PI_2, [0.0; 5])),
            "sample",
        )
        .unwrap();
    assert!(value.re.abs() < 1e-14 && (value.im + 1.0).abs() < 1e-14);
    assert!(compiled.evaluate_with(|_| None, "sample").is_err());
    let clone = compiled.clone();
    std::thread::spawn(move || {
        assert_eq!(
            clone
                .evaluate_with(
                    |name| (name == "phase").then_some((0.0, [0.0; 5])),
                    "sample"
                )
                .unwrap()
                .re,
            1.0
        )
    })
    .join()
    .unwrap();
    for _ in 0..1100 {
        drop(CompiledComplexQuantity::compile(&quantity, &policy, "signal").unwrap());
    }
}
