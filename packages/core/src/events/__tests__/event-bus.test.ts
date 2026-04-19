import { EventBus, EditorEvent } from '../event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should call handler when event is emitted', () => {
    const handler = jest.fn();
    bus.on('doc:change', handler);
    bus.emit('doc:change', { test: true });
    expect(handler).toHaveBeenCalledWith({ test: true });
  });

  it('should support multiple handlers for the same event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('doc:change', h1);
    bus.on('doc:change', h2);
    bus.emit('doc:change', 'payload');
    expect(h1).toHaveBeenCalledWith('payload');
    expect(h2).toHaveBeenCalledWith('payload');
  });

  it('should not call handlers for different events', () => {
    const handler = jest.fn();
    bus.on('doc:change', handler);
    bus.emit('doc:save');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via returned function', () => {
    const handler = jest.fn();
    const unsub = bus.on('doc:change', handler);
    unsub();
    bus.emit('doc:change');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off()', () => {
    const handler = jest.fn();
    bus.on('doc:change', handler);
    bus.off('doc:change', handler);
    bus.emit('doc:change');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle emit with no payload', () => {
    const handler = jest.fn();
    bus.on('doc:save', handler);
    bus.emit('doc:save');
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it('should handle emit when no handlers are registered', () => {
    expect(() => bus.emit('doc:change')).not.toThrow();
  });

  it('should handle off() for non-registered event', () => {
    const handler = jest.fn();
    expect(() => bus.off('doc:change', handler)).not.toThrow();
  });

  it('should remove all listeners for a specific event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('doc:change', h1);
    bus.on('doc:save', h2);
    bus.removeAllListeners('doc:change');
    bus.emit('doc:change');
    bus.emit('doc:save');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('should remove all listeners when called without event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('doc:change', h1);
    bus.on('doc:save', h2);
    bus.removeAllListeners();
    bus.emit('doc:change');
    bus.emit('doc:save');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });
});
