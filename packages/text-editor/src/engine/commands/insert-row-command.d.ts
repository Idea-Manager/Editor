import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class InsertRowCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly afterRowIndex;
    /** Row whose per-cell border styles are copied (context-menu anchor row). */
    private readonly referenceRowIndex;
    readonly operationRecords: OperationRecord[];
    private insertedRowId;
    private beforeData;
    constructor(doc: DocumentNode, blockId: string, afterRowIndex: number, 
    /** Row whose per-cell border styles are copied (context-menu anchor row). */
    referenceRowIndex: number);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=insert-row-command.d.ts.map