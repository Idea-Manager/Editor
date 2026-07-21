import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface RemoveElementCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementId: string;
}
export declare class RemoveElementCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly elementId;
    private readonly snapshot;
    private readonly originalIndex;
    private readonly frameId;
    constructor({ doc, pageId, elementId }: RemoveElementCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=remove-element-command.d.ts.map