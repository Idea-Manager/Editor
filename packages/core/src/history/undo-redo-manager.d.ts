import { Command } from '../commands/command';
import { EventBus } from '../events/event-bus';
export declare class UndoRedoManager {
    private readonly eventBus;
    private undoStack;
    private redoStack;
    constructor(eventBus: EventBus);
    get canUndo(): boolean;
    get canRedo(): boolean;
    push(cmd: Command): void;
    undo(): void;
    redo(): void;
    clear(): void;
    get undoStackSize(): number;
    get redoStackSize(): number;
}
//# sourceMappingURL=undo-redo-manager.d.ts.map