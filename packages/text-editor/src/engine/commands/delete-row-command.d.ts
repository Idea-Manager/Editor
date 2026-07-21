import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class DeleteRowCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly rowIndex;
    readonly operationRecords: OperationRecord[];
    private beforeData;
    private deletedRowId;
    private deletedIndex;
    constructor(doc: DocumentNode, blockId: string, rowIndex: number);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=delete-row-command.d.ts.map