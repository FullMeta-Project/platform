// Generated from platform/contracts/native-operations.json; do not edit.
export type NativeJson = null | boolean | number | string | NativeJson[] | { [key: string]: NativeJson };
export type NativeOperationId = never;
export type NativeOperationDefinitions = {

};
export interface NativeOperationInputMap {

}
export interface NativeOperationResultMap {

}
export interface NativeOperationEventMap {

}
export interface NativeOperationVersionMap {

}
export interface NativeOperationBinding<I extends NativeOperationId = NativeOperationId> { id: I; version: NativeOperationVersionMap[I]; digest?: string; }
export const nativeOperationsDigest: "6aa5d0aaac8105292e0f4477a68afe5f4ead4b002da8e5f5e8093a90a307dd68";
