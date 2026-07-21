import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class DeleteColumnCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly colIndex;
    readonly operationRecords: OperationRecord[];
    private deletedCells;
    private deletedWidth;
    constructor(doc: DocumentNode, blockId: string, colIndex: number);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=delete-column-command.d.ts.map