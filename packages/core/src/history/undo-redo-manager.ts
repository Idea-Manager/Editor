import { Command } from '../commands/command';
import { EventBus } from '../events/event-bus';

export class UndoRedoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(private readonly eventBus: EventBus) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(cmd: Command): void {
    const prev = this.undoStack[this.undoStack.length - 1];
    if (prev?.merge?.(cmd)) {
      // Previous command absorbed this one; no new stack entry
    } else {
      cmd.execute();
      this.undoStack.push(cmd);
    }

    this.redoStack.length = 0;
    this.eventBus.emit('history:push', { command: cmd });
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.eventBus.emit('history:undo', { command: cmd });
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
    this.eventBus.emit('history:redo', { command: cmd });
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  get undoStackSize(): number {
    return this.undoStack.length;
  }

  get redoStackSize(): number {
    return this.redoStack.length;
  }
}
