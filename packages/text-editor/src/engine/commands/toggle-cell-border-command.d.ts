import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { type BorderSide } from '../../blocks/table-border-sync';
export type { BorderSide };
export declare class ToggleCellBorderCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly cellId;
    private readonly side;
    readonly operationRecords: OperationRecord[];
    private patches;
    constructor(doc: DocumentNode, blockId: string, cellId: string, side: BorderSide);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=toggle-cell-border-command.d.ts.map