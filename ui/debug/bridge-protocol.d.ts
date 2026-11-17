export const editorBridgeFormat: 'fullmeta-editor-bridge/1';
export type EditorBridgeAction = 'inspect'|'state'|'command'|'replay'|'checkpoint'|'restore'|'mode';
export interface EditorBridgeRequest { format: typeof editorBridgeFormat; action: EditorBridgeAction; args: Record<string, unknown>; revision: string; timeoutMs?: number; }
export interface EditorBridgeSession { id: string; pageUrl: string; revision: string; serviceMode: 'live'|'fixture'; connected: boolean; busy: boolean; }
export interface EditorBridgeResult { format: typeof editorBridgeFormat; sessionId: string; requestId: string; revision: string; ok: boolean; value?: unknown; error?: string; elapsedMs: number; }
export const editorBridgeActions: readonly EditorBridgeAction[];
export const editorBridgeReadActions: readonly EditorBridgeAction[];
export function assertEditorBridgeRequest(value: unknown): EditorBridgeRequest;
