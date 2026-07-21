import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { InlineMarkManager } from './inline-mark-manager';
export declare class SetLinkCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly startOffset;
    private readonly endOffset;
    private readonly href;
    private readonly markManager;
    readonly operationRecords: OperationRecord[];
    private oldChildren;
    private newChildren;
    constructor(doc: DocumentNode, blockId: string, startOffset: number, endOffset: number, href: string | undefined, markManager: InlineMarkManager);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-link-command.d.ts.map