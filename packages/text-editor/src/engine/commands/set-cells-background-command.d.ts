import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class SetCellsBackgroundCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly cellIds;
    private readonly background;
    readonly operationRecords: OperationRecord[];
    private oldByCellId;
    constructor(doc: DocumentNode, blockId: string, cellIds: string[], background: string | undefined);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-cells-background-command.d.ts.map