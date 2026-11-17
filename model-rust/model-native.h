#ifndef FULLMETA_MODEL_NATIVE_H
#define FULLMETA_MODEL_NATIVE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* A symbol's scalar value and SI exponents: length, mass, time, current,
   temperature. No Rust-owned types or memory cross this boundary. */
typedef struct {
    double value;
    double dimension[5];
} FullMetaModelSymbolValue;

typedef struct {
    double re;
    double im;
} FullMetaModelComplexValue;

/* Name is UTF-8 and is valid only for this call; it is not NUL-terminated.
   Return 1 and initialize *out when found; return 0 when absent; return any
   other value to report callback failure. The callback must not unwind. */
typedef int32_t (*FullMetaModelSymbolLookup)(void *context,
    const uint8_t *name, size_t name_length, FullMetaModelSymbolValue *out);

/* Obtain handle using the JSON operation "compile_complex_quantity". Handles
   are thread-local: create, evaluate, and release them on the same thread.
   path is UTF-8 and may be NULL only when path_length is 0. callback and out
   must be non-NULL. Caller owns context, path, and out and keeps them valid
   until this function returns. Pointers must be correctly aligned where
   applicable. Returns 1 on success, writing *out; returns 0 on failure and
   leaves *out untouched. On failure, retrieve the JSON {ok:false,error:...}
   using model_output_pointer() and model_output_length() on this thread.
   On success, the previous JSON output is unchanged. */
int32_t model_evaluate_compiled_complex_with(uint64_t handle,
    const uint8_t *path, size_t path_length, FullMetaModelSymbolLookup callback,
    void *context, FullMetaModelComplexValue *out);

uint8_t *model_alloc(size_t length);
void model_dealloc(uint8_t *pointer, size_t length);
void model_execute(const uint8_t *request, size_t request_length);
const uint8_t *model_output_pointer(void);
size_t model_output_length(void);
void model_clear_output(void);

#ifdef __cplusplus
}
#endif
#endif
