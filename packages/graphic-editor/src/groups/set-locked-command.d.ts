import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface SetLockedCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementIds: string[];
    locked: boolean;
}
/**
 * Bulk-updates `meta.locked` on a set of elements.
 * Undo restores each element's prior locked value.
 */
export declare class SetLockedCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly elementIds;
    private readonly locked;
    private readonly previousValues;
    constructor({ doc, pageId, elementIds, locked }: SetLockedCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-locked-command.d.ts.map