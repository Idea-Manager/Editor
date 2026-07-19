import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class OutdentListCommand implements Command {
    private readonly doc;
    private readonly blockId;
    readonly operationRecords: OperationRecord[];
    private oldDepth;
    constructor(doc: DocumentNode, blockId: string);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=outdent-list-command.d.ts.map