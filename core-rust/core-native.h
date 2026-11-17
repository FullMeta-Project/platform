#ifndef FULLMETA_CORE_NATIVE_H
#define FULLMETA_CORE_NATIVE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Generic JSON request interface. Output is thread-local and belongs to the
   DLL; copy it before another request on the same thread. */
uint8_t *core_alloc(size_t length);
void core_dealloc(uint8_t *pointer, size_t length);
void core_execute(const uint8_t *request, size_t length);
const uint8_t *core_output_pointer(void);
size_t core_output_length(void);
void core_clear_output(void);

/* Version 1: complex numeric values, with real values represented by im=0.
   No Rust data structures or allocations cross the ABI. */
typedef struct { double re; double im; } FullMetaCoreComplex;

/* Typed, unit-aware real quantity inputs. `present` is 1 when a value was
   supplied and 0 when absent; dimension uses the five SI exponents. */
typedef struct { double value; double dimension[5]; int32_t present; } FullMetaCoreQuantityInput;
typedef struct { double value; double dimension[5]; } FullMetaCoreQuantityOutput;
typedef struct { double re; double im; int32_t present; } FullMetaCoreComplexInput;

/* Quantity setup JSON contains either expression or quantity, policy, path.
   Handles and returned symbol-name buffers are thread-local; each handle
   must be released. Inputs use row-major [row][symbol] order. A quantity
   output's value is in its declared unit's resolved numerical convention; its
   dimension field is zero because the quantity already supplies a unit.
   Expression outputs carry their actual dimension. Output is unchanged on
   failure; errors use core_language_error_pointer/length. */
int32_t core_quantity_compile(const uint8_t *request, size_t length, uint64_t *out);
int32_t core_quantity_release(uint64_t handle);
int32_t core_quantity_symbol_count(uint64_t handle, size_t *out);
int32_t core_quantity_symbol(uint64_t handle, size_t index, const uint8_t **name, size_t *length);
int32_t core_quantity_evaluate_batch(uint64_t handle, const uint8_t *path, size_t path_len,
    size_t rows, const FullMetaCoreQuantityInput *values, size_t values_len,
    FullMetaCoreQuantityOutput *output, size_t output_len);

/* A definition context is created from a JSON array of [name, AST] pairs.
   Core owns the prepared graph and its ordered input/output names. Input
   presence flags preserve same-name external overrides. Arrays are row-major;
   lengths equal rows times the corresponding slot count. All output is left
   untouched on failure. Handles are thread-local and must be released. */
int32_t core_definitions_compile(const uint8_t *request, size_t length, uint64_t *out);
int32_t core_definitions_release(uint64_t handle);
int32_t core_definitions_counts(uint64_t handle, size_t *inputs, size_t *outputs);
int32_t core_definitions_name(uint64_t handle, int32_t output, size_t index, const uint8_t **name, size_t *length);
int32_t core_definitions_evaluate_batch(uint64_t handle, size_t rows,
    const FullMetaCoreComplexInput *inputs, size_t input_len,
    FullMetaCoreComplex *outputs, size_t output_len);

/* A reusable thread-local language context takes a JSON object containing
   variables and pointwise [name, expression-text-or-AST] pairs and an operators array. Core
   orders global dependencies and compiles each expression and definition set.
   Query functions create independently owned child handles: release them
   using core_language_release or core_definitions_release, respectively.
   core_context_definitions returns a zero child when no definitions exist. */
int32_t core_context_compile(const uint8_t *request, size_t length, uint64_t *out);
int32_t core_context_release(uint64_t handle);
int32_t core_context_count(uint64_t handle, size_t *out);
int32_t core_context_expression(uint64_t handle, size_t index,
    const uint8_t **name, size_t *length, uint64_t *expression);
int32_t core_context_definitions(uint64_t handle, uint64_t *definitions);

uint32_t core_language_abi_version(void);

/* Compile UTF-8 source and a UTF-8 JSON array of host operator names, e.g.
   ["intop1"]. JSON is used only during setup, never for batch values.
   Each registered host operator must take one unevaluated expression.
   Returns 1 and writes an owning nonzero handle; 0 means error. */
int32_t core_language_compile(const uint8_t *source, size_t source_len,
    const uint8_t *operator_json, size_t operator_json_len, uint64_t *out);

/* Equivalent setup entry point when an inspected expression AST is already
   available in FullMeta's JSON AST format. Values are still supplied as
   typed arrays to evaluate_batch. */
int32_t core_language_compile_ast_json(const uint8_t *ast_json, size_t ast_len,
    const uint8_t *operator_json, size_t operator_json_len, uint64_t *out);

/* Handles are thread-local: use and release each handle on its creating
   thread. Releasing a parent does not release separately obtained children. */
int32_t core_language_release(uint64_t handle);
int32_t core_language_counts(uint64_t handle, size_t *symbols, size_t *operators);

/* Slots are zero-based, in first-occurrence order. Returned UTF-8 names are
   borrowed, are not NUL terminated, and remain valid until that handle is
   released. Copy names before releasing. Built-ins pi and e have no slot. */
int32_t core_language_symbol(uint64_t handle, size_t index,
    const uint8_t **name, size_t *name_length);

/* Returns the operator name and a NEW owning opaque handle for its argument;
   release the argument handle separately. Host operators nested inside the
   argument are exposed by querying that argument handle in the same way. */
int32_t core_language_operator(uint64_t handle, size_t index,
    const uint8_t **name, size_t *name_length, uint64_t *argument);

/* Values are row-major: rows * symbol_count complex values and rows *
   operator_count complex values, in slot order. The host computes each
   operator's value using its argument handle and supplies it in the matching
   operator slot. output_len must equal rows. For a zero-length array its
   pointer may be NULL. Otherwise buffers must be aligned and valid for their
   stated length. Output must not overlap either input. On any error the
   output is unchanged. No pointer is retained after the call. */
int32_t core_language_evaluate_batch(uint64_t handle, size_t rows,
    const FullMetaCoreComplex *symbol_values, size_t symbol_len,
    const FullMetaCoreComplex *operator_values, size_t operator_len,
    FullMetaCoreComplex *output, size_t output_len);

/* Failures return 0 and set a thread-local UTF-8 message. Copy it before the
   next failed language call on the same thread. Success does not clear it. */
const uint8_t *core_language_error_pointer(void);
size_t core_language_error_length(void);

#ifdef __cplusplus
}
#endif
#endif
