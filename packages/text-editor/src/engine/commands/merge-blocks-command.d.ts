import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class MergeBlocksCommand implements Command {
    private readonly doc;
    private readonly blockId;
    readonly operationRecords: OperationRecord[];
    private prevBlockOriginalChildren;
    private removedBlock;
    private removedBlockIndex;
    private mergeOffset;
    private prevBlockId;
    constructor(doc: DocumentNode, blockId: string);
    execute(): void;
    undo(): void;
    getMergeOffset(): number;
    getPreviousBlockId(): string;
}
//# sourceMappingURL=merge-blocks-command.d.ts.map