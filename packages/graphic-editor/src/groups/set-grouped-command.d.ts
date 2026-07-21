import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface SetGroupedCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementIds: string[];
    /** true = group (assign a new groupId), false = ungroup (clear groupId). */
    grouped: boolean;
}
/**
 * Bulk-updates `meta.groupId` on a set of elements.
 * When grouping: generates a new groupId shared across all elements.
 * When ungrouping: clears `meta.groupId` for those that share the current group.
 * Undo restores each element's prior groupId.
 */
export declare class SetGroupedCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly elementIds;
    private readonly grouped;
    private readonly newGroupId;
    private readonly previousValues;
    constructor({ doc, pageId, elementIds, grouped }: SetGroupedCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-grouped-command.d.ts.map