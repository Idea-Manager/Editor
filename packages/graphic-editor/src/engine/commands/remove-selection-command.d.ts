import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { SelectionEntry } from '../selection-manager';
export interface RemoveSelectionCommandOptions {
    doc: DocumentNode;
    pageId: string;
    entries: SelectionEntry[];
    eventBus: EventBus;
}
/**
 * Composite command that removes all selected elements.
 * Emits `selection:change` with an empty array on execute and undo
 * so the selection overlay is cleared after removal and restored after undo.
 */
export declare class RemoveSelectionCommand implements Command {
    private readonly composite;
    private readonly eventBus;
    constructor({ doc, pageId, entries, eventBus }: RemoveSelectionCommandOptions);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=remove-selection-command.d.ts.map