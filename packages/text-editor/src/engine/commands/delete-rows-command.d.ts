import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class DeleteRowsCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly rowIndices;
    readonly operationRecords: OperationRecord[];
    private beforeData;
    constructor(doc: DocumentNode, blockId: string, rowIndices: number[]);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=delete-rows-command.d.ts.map