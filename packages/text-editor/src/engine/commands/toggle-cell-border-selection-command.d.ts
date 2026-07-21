import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { type BorderSide } from '../../blocks/table-border-sync';
export type { BorderSide };
/**
 * For each unique primary cell, flip that cell’s border side; union over resolved targets, one write per (cell,side).
 */
export declare class ToggleCellBorderSelectionCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly cellIds;
    private readonly side;
    readonly operationRecords: OperationRecord[];
    private patches;
    constructor(doc: DocumentNode, blockId: string, cellIds: string[], side: BorderSide);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=toggle-cell-border-selection-command.d.ts.map