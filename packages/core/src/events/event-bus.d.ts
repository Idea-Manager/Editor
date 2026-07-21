export type EditorEvent = 'doc:change' | 'doc:save' | 'mode:change' | 'selection:change' | 'block:insert' | 'block:delete' | 'block:update' | 'element:add' | 'element:remove' | 'element:update' | 'frame:add' | 'frame:remove' | 'frame:update' | 'history:push' | 'history:undo' | 'history:redo' | 'operation:local' | 'operation:remote' | 'table:range-select-end' | 'table:range-ui' | 'viewport:change' | 'tool:change' | 'graphic:request-properties-window' | 'graphic:toast';
type Handler<T = unknown> = (payload: T) => void;
export declare class EventBus {
    private listeners;
    on<T = unknown>(event: EditorEvent, handler: Handler<T>): () => void;
    emit<T = unknown>(event: EditorEvent, payload?: T): void;
    off(event: EditorEvent, handler: Handler): void;
    removeAllListeners(event?: EditorEvent): void;
}
export {};
//# sourceMappingURL=event-bus.d.ts.map