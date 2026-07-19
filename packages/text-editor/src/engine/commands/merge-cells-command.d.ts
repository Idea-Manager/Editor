import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface CellRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}
export declare class MergeCellsCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly range;
    readonly operationRecords: OperationRecord[];
    private snapshot;
    constructor(doc: DocumentNode, blockId: string, range: CellRange);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=merge-cells-command.d.ts.map