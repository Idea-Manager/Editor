import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { SelectionEntry } from '../selection-manager';
export interface MoveSelectionCommandOptions {
    doc: DocumentNode;
    pageId: string;
    entries: SelectionEntry[];
    dx: number;
    dy: number;
    /** Reserved for future snap-to-grid; currently unused in UI. */
    snap?: number;
}
/**
 * Composite command that moves all selected elements (and frames) by (dx, dy).
 * For frames, child elements are also translated so they maintain their relative positions.
 */
export declare class MoveSelectionCommand implements Command {
    private readonly composite;
    constructor({ doc, pageId, entries, dx, dy }: MoveSelectionCommandOptions);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=move-selection-command.d.ts.map