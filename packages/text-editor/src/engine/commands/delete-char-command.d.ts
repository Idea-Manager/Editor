import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export type DeleteDirection = 'backward' | 'forward';
export declare class DeleteCharCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly offset;
    private readonly direction;
    readonly operationRecords: OperationRecord[];
    private deletedChar;
    private runId;
    private deleteOffset;
    constructor(doc: DocumentNode, blockId: string, offset: number, direction: DeleteDirection);
    execute(): void;
    undo(): void;
    private deleteAt;
    private findBlock;
    private getBlockTextLength;
}
//# sourceMappingURL=delete-char-command.d.ts.map