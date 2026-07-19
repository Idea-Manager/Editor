import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { InlineMarkManager } from './inline-mark-manager';
export declare class SetTextColorCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly startOffset;
    private readonly endOffset;
    private readonly color;
    private readonly markManager;
    readonly operationRecords: OperationRecord[];
    private oldChildren;
    private newChildren;
    constructor(doc: DocumentNode, blockId: string, startOffset: number, endOffset: number, color: string, markManager: InlineMarkManager);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-text-color-command.d.ts.map