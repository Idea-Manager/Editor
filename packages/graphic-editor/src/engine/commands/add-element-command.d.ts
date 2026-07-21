import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { IdPrefix } from '@core/id';
import type { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { StyleMemoryService } from '../../preferences/style-memory-service';
export interface AddElementCommandOptions {
    doc: DocumentNode;
    pageId: string;
    type: string;
    registry: GraphicBlockRegistry;
    dataOverride?: Record<string, unknown>;
    /**
     * When true, skips auto-detection of an intersecting frame.
     * Use when the caller manages frame attachment explicitly (e.g. FrameController).
     */
    skipFrameAttach?: boolean;
    /** Optional ID prefix passed to `generateId`. Defaults to `'el'`. */
    idPrefix?: IdPrefix;
    /**
     * When provided, `getEffectiveDefaults` is used instead of raw
     * `graphicPreferences` so that NON_PERSISTABLE_PATHS and text/template
     * fields are properly excluded from the merged data.
     */
    styleMemory?: StyleMemoryService;
}
export declare class AddElementCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly element;
    private readonly attachCmd;
    constructor({ doc, pageId, type, registry, dataOverride, skipFrameAttach, idPrefix, styleMemory }: AddElementCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=add-element-command.d.ts.map