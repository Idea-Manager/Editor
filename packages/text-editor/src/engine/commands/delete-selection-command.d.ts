import type { BlockSelection, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class DeleteSelectionCommand implements Command {
    private readonly doc;
    private readonly sel;
    readonly operationRecords: OperationRecord[];
    private snapshot;
    constructor(doc: DocumentNode, sel: BlockSelection);
    execute(): void;
    undo(): void;
    private deleteSameBlockInList;
    private deleteCrossBlocksInList;
}
//# sourceMappingURL=delete-selection-command.d.ts.map