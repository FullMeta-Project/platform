#ifndef FULLMETA_CONTRACTS_NATIVE_H
#define FULLMETA_CONTRACTS_NATIVE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* JSON output is thread-local and belongs to the DLL. Copy it before the
   next request on this thread. Free allocations with the matching length. */
uint8_t *contracts_alloc(size_t length);
void contracts_dealloc(uint8_t *pointer, size_t length);
void contracts_execute(const uint8_t *request, size_t request_length);
const uint8_t *contracts_output_pointer(void);
size_t contracts_output_length(void);
void contracts_clear_output(void);

#ifdef __cplusplus
}
#endif
#endif
