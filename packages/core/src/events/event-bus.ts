export type EditorEvent =
  | 'doc:change'
  | 'doc:save'
  | 'mode:change'
  | 'selection:change'
  | 'block:insert'
  | 'block:delete'
  | 'block:update'
  | 'element:add'
  | 'element:remove'
  | 'element:update'
  | 'frame:add'
  | 'frame:remove'
  | 'frame:update'
  | 'history:push'
  | 'history:undo'
  | 'history:redo'
  | 'operation:local'
  | 'operation:remote';

type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<EditorEvent, Set<Handler>>();

  on<T = unknown>(event: EditorEvent, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as Handler);

    return () => {
      handlers.delete(handler as Handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T = unknown>(event: EditorEvent, payload?: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  off(event: EditorEvent, handler: Handler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  removeAllListeners(event?: EditorEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
