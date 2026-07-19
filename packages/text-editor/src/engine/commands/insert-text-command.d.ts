import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class InsertTextCommand implements Command {
    private readonly doc;
    readonly operationRecords: OperationRecord[];
    private readonly blockId;
    private readonly offset;
    private mergedText;
    private runId;
    private runOffset;
    private timestamp;
    constructor(doc: DocumentNode, blockId: string, offset: number, text: string);
    execute(): void;
    undo(): void;
    merge(next: Command): boolean;
    private findBlock;
    private findRunAtOffset;
}
//# sourceMappingURL=insert-text-command.d.ts.map