import { UndoRedoManager } from '../undo-redo-manager';
import { EventBus } from '../../events/event-bus';
import { Command } from '../../commands/command';
import { OperationRecord } from '../../operation-log/interfaces';

function makeRecord(): OperationRecord {
  return {
    id: `op_${Math.random().toString(36).slice(2)}`,
    actorId: 'test',
    timestamp: 1,
    wallClock: Date.now(),
    type: 'node:update',
    payload: { nodeId: 'n1', path: 'data.x', oldValue: 0, newValue: 1 },
  };
}

function makeCommand(state: { value: number }, newValue: number): Command {
  const oldValue = state.value;
  return {
    operationRecords: [makeRecord()],
    execute() { state.value = newValue; },
    undo() { state.value = oldValue; },
  };
}

describe('UndoRedoManager', () => {
  let bus: EventBus;
  let manager: UndoRedoManager;

  beforeEach(() => {
    bus = new EventBus();
    manager = new UndoRedoManager(bus);
  });

  it('should start with empty stacks', () => {
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    expect(manager.undoStackSize).toBe(0);
    expect(manager.redoStackSize).toBe(0);
  });

  it('should execute and push command on push()', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 10));
    expect(state.value).toBe(10);
    expect(manager.canUndo).toBe(true);
    expect(manager.undoStackSize).toBe(1);
  });

  it('should undo the last command', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 10));
    manager.undo();
    expect(state.value).toBe(0);
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(true);
  });

  it('should redo an undone command', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 10));
    manager.undo();
    manager.redo();
    expect(state.value).toBe(10);
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
  });

  it('should clear redo stack on new push', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 10));
    manager.undo();
    expect(manager.canRedo).toBe(true);
    manager.push(makeCommand(state, 20));
    expect(manager.canRedo).toBe(false);
    expect(state.value).toBe(20);
  });

  it('should support multiple undo/redo steps', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 1));
    manager.push(makeCommand(state, 2));
    manager.push(makeCommand(state, 3));
    expect(state.value).toBe(3);

    manager.undo();
    expect(state.value).toBe(2);
    manager.undo();
    expect(state.value).toBe(1);
    manager.redo();
    expect(state.value).toBe(2);
  });

  it('should do nothing when undo on empty stack', () => {
    manager.undo();
    expect(manager.canUndo).toBe(false);
  });

  it('should do nothing when redo on empty stack', () => {
    manager.redo();
    expect(manager.canRedo).toBe(false);
  });

  it('should clear both stacks', () => {
    const state = { value: 0 };
    manager.push(makeCommand(state, 1));
    manager.push(makeCommand(state, 2));
    manager.undo();
    expect(manager.undoStackSize).toBe(1);
    expect(manager.redoStackSize).toBe(1);

    manager.clear();
    expect(manager.undoStackSize).toBe(0);
    expect(manager.redoStackSize).toBe(0);
  });

  it('should emit history:push on push', () => {
    const handler = jest.fn();
    bus.on('history:push', handler);
    const state = { value: 0 };
    manager.push(makeCommand(state, 1));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit history:undo on undo', () => {
    const handler = jest.fn();
    bus.on('history:undo', handler);
    const state = { value: 0 };
    manager.push(makeCommand(state, 1));
    manager.undo();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit history:redo on redo', () => {
    const handler = jest.fn();
    bus.on('history:redo', handler);
    const state = { value: 0 };
    manager.push(makeCommand(state, 1));
    manager.undo();
    manager.redo();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should merge commands when merge() returns true', () => {
    const state = { value: '' };
    let accumulated = '';

    const makeMergeable = (char: string): Command => ({
      operationRecords: [makeRecord()],
      execute() {
        accumulated += char;
        state.value = accumulated;
      },
      undo() {
        accumulated = accumulated.slice(0, -char.length);
        state.value = accumulated;
      },
      merge(next: Command) {
        return true;
      },
    });

    manager.push(makeMergeable('a'));
    expect(state.value).toBe('a');

    manager.push(makeMergeable('b'));
    // 'b' was merged into 'a' so undo stack still has 1 entry
    expect(manager.undoStackSize).toBe(1);
    // But the merged command was not executed again by the manager (merge absorbs it)
    // so state stays 'a' since merge() just returns true without side effects here
  });
});
