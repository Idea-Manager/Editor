import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class SplitBlockCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly offset;
    readonly operationRecords: OperationRecord[];
    private newBlockId;
    private originalChildren;
    private splitBlockId;
    private beforeChildren;
    private newBlockSnapshot;
    private planned;
    constructor(doc: DocumentNode, blockId: string, offset: number);
    execute(): void;
    undo(): void;
    getNewBlockId(): string;
}
//# sourceMappingURL=split-block-command.d.ts.map