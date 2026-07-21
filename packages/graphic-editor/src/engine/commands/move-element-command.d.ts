import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface MoveElementCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementId: string;
    dx: number;
    dy: number;
    mergeWindowMs?: number;
}
export declare class MoveElementCommand implements Command {
    private readonly composite;
    private readonly elementId;
    private readonly mergeWindowMs;
    private lastUpdatedAt;
    constructor({ doc, pageId, elementId, dx, dy, mergeWindowMs }: MoveElementCommandOptions);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
    merge(next: Command): boolean;
}
//# sourceMappingURL=move-element-command.d.ts.map