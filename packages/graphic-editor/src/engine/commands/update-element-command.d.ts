import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface UpdateElementCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementId: string;
    path: string;
    value: unknown;
    mergeWindowMs?: number;
}
export declare class UpdateElementCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly elementId;
    private readonly path;
    private readonly oldValue;
    private newValue;
    private readonly mergeWindowMs;
    private lastUpdatedAt;
    constructor({ doc, pageId, elementId, path, value, mergeWindowMs }: UpdateElementCommandOptions);
    execute(): void;
    undo(): void;
    merge(next: Command): boolean;
}
//# sourceMappingURL=update-element-command.d.ts.map