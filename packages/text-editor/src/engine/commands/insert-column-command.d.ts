import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class InsertColumnCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly afterColIndex;
    /** Column whose cell border styles are copied per row (context-menu anchor column). */
    private readonly referenceColIndex;
    readonly operationRecords: OperationRecord[];
    private newCellIds;
    constructor(doc: DocumentNode, blockId: string, afterColIndex: number, 
    /** Column whose cell border styles are copied per row (context-menu anchor column). */
    referenceColIndex: number);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=insert-column-command.d.ts.map