import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class DeleteColumnsCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly colIndices;
    readonly operationRecords: OperationRecord[];
    /** Ascending column index for undo. */
    private removed;
    constructor(doc: DocumentNode, blockId: string, colIndices: number[]);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=delete-columns-command.d.ts.map