import type { BlockNode, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class PasteCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly offset;
    private readonly pasteBlocks;
    readonly operationRecords: OperationRecord[];
    private snapshot;
    private insertedBlockIds;
    /** Set at end of successful paste; used to position the caret. */
    private caretAfterPaste;
    constructor(doc: DocumentNode, blockId: string, offset: number, pasteBlocks: BlockNode[]);
    /** Collapsed position at end of last pasted item (0 for table/embed/graphic). */
    getCaretAfterPaste(): {
        blockId: string;
        offset: number;
    } | null;
    private setCaretOnBlock;
    execute(): void;
    undo(): void;
    private pushNodeInsert;
    private pushBlockChildrenUpdateRecord;
    private applyTextFlowTypeAndData;
    private makeEmptyParagraphWithRuns;
    private insertSingleBlock;
    private insertSingleAtomic;
    private insertMultiWithLeadingIfNeeded;
    /** Multi-line paste with table/embed first: anchor only keeps `before`, then new blocks. */
    private insertMultiLeadingAtomic;
    private insertMultipleBlocks;
}
//# sourceMappingURL=paste-command.d.ts.map