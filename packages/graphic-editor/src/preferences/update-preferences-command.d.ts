import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface UpdatePreferencesCommandInput {
    doc: DocumentNode;
    blockType: string;
    /**
     * Path relative to the block's preference record (no `data.` prefix).
     * e.g. `"border.thickness"`, `"background"`.
     */
    path: string;
    value: unknown;
}
/**
 * Records a single visual preference for a block type into
 * `DocumentNode.data.graphicPreferences[blockType][path]`.
 *
 */
export declare class UpdatePreferencesCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly blockType;
    private readonly path;
    private readonly oldValue;
    private readonly newValue;
    constructor({ doc, blockType, path, value }: UpdatePreferencesCommandInput);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=update-preferences-command.d.ts.map