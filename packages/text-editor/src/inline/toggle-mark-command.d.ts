import type { DocumentNode, InlineMark } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { InlineMarkManager } from './inline-mark-manager';
export declare class ToggleMarkCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly mark;
    private readonly startOffset;
    private readonly endOffset;
    private readonly markManager;
    readonly operationRecords: OperationRecord[];
    private oldChildren;
    private newChildren;
    constructor(doc: DocumentNode, blockId: string, mark: InlineMark, startOffset: number, endOffset: number, markManager: InlineMarkManager);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=toggle-mark-command.d.ts.map