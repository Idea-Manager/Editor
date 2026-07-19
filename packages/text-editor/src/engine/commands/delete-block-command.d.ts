import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
/**
 * Removes a document block or a nested block inside a table cell.
 * Top-level: if it is the only block, replaces it with an empty paragraph.
 * In a cell: if it is the only nested block, replaces cell content with a default empty paragraph.
 */
export declare class DeleteBlockCommand implements Command {
    private readonly doc;
    private readonly blockId;
    readonly operationRecords: OperationRecord[];
    private removedBlock;
    private removedIndex;
    private replacedSoleBlockWithParagraph;
    private cellUndo;
    constructor(doc: DocumentNode, blockId: string);
    execute(): void;
    private executeInTableCell;
    undo(): void;
    getRemovedIndex(): number;
}
//# sourceMappingURL=delete-block-command.d.ts.map