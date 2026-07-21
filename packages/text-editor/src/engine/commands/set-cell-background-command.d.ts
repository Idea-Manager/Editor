import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class SetCellBackgroundCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly cellId;
    private readonly background;
    readonly operationRecords: OperationRecord[];
    private oldBackground;
    constructor(doc: DocumentNode, blockId: string, cellId: string, background: string | undefined);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-cell-background-command.d.ts.map