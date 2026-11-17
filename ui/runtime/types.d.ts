import type { ComponentType, ReactNode } from 'react';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type DocumentPath = (string | number)[];
export interface Diagnostic { path: DocumentPath; message: string; severity?: 'error' | 'warning' | 'info'; }
export interface FieldChange { type: 'field.change'; path: DocumentPath; value: unknown; rawValue?: unknown; valueType: string; action?: string; }
export interface WidgetAction { type: 'widget.action'; widget: string; path: DocumentPath; action: string; args?: Record<string, unknown>; }
export interface EditorCommand { type: string; path?: DocumentPath; args?: Record<string, unknown>; expectedRevision?: number; }
export type CommandHandler = (command: FieldChange | WidgetAction | EditorCommand, event?: unknown) => unknown;
export interface FieldView { label: string; value?: Json; path: DocumentPath; schema?: Record<string, any>; ui?: Record<string, any>; present?: boolean; rawValue?: Json; diagnostics?: Diagnostic[]; }
export interface WidgetProps { view?: FieldView; onCommand?: CommandHandler; context?: Record<string, any>; renderField?: (props: any) => ReactNode; renderObject?: (props: any) => ReactNode; [key: string]: any; }
export interface WidgetMount { update(props: WidgetProps): unknown; inspect?(): Record<string, unknown>; dispose(): void; }
export interface WidgetProvider { component: ComponentType<WidgetProps>; format?: 'fullmeta-react-widget/1'; mount?(container: Element, props: WidgetProps): WidgetMount | Promise<WidgetMount>; }
export interface EditingSnapshot { format: 'fullmeta-editing-session/1'; revision: number; document: Json; source: {documentRevision: string; schemaRevision: string}; drafts: Record<string, Json>; selection: Json; diagnostics: Diagnostic[]; }
