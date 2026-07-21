import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class MoveBlockCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly toIndex;
    readonly operationRecords: OperationRecord[];
    private block;
    constructor(doc: DocumentNode, blockId: string, toIndex: number);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=move-block-command.d.ts.map