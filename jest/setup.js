// Polyfill ResizeObserver for jsdom (not included by default).
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserver, writable: true, configurable: true });
  Object.defineProperty(global, 'ResizeObserver', { value: ResizeObserver, writable: true, configurable: true });
}

// Polyfill PointerEvent for jsdom (not included by default).
// jsdom's MouseEvent doesn't propagate init dict properties to subclasses
// via the native path, so we explicitly define the event properties.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      // jsdom may not propagate these init-dict fields to the subclass instance;
      // define them explicitly so event handlers can read them.
      const props = {
        pointerId:   { value: init.pointerId   ?? 1,       configurable: true },
        pointerType: { value: init.pointerType ?? 'mouse', configurable: true },
        isPrimary:   { value: init.isPrimary   ?? true,    configurable: true },
        clientX:     { value: init.clientX     ?? 0,       configurable: true },
        clientY:     { value: init.clientY     ?? 0,       configurable: true },
        screenX:     { value: init.screenX     ?? 0,       configurable: true },
        screenY:     { value: init.screenY     ?? 0,       configurable: true },
        button:      { value: init.button      ?? 0,       configurable: true },
        shiftKey:    { value: init.shiftKey    ?? false,   configurable: true },
        ctrlKey:     { value: init.ctrlKey     ?? false,   configurable: true },
        altKey:      { value: init.altKey      ?? false,   configurable: true },
        metaKey:     { value: init.metaKey     ?? false,   configurable: true },
      };
      Object.defineProperties(this, props);
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEvent, writable: true, configurable: true });
  Object.defineProperty(global, 'PointerEvent', { value: PointerEvent, writable: true, configurable: true });
}
