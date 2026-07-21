import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface InstantiateCustomBlockCommandOptions {
    doc: DocumentNode;
    pageId: string;
    customBlockId: string;
    /** World-space anchor (top-left origin of the placed block). */
    anchor: {
        x: number;
        y: number;
    };
}
/**
 * Places a custom block at a given world-space anchor by expanding its
 * `CustomBlockDefinition` into individual elements with fresh ids.
 * Text/template content is reset to `''`; visual preferences (border,
 * background, font size, colors) are preserved from the snapshot.
 *
 * Undo removes all inserted elements.
 */
export declare class InstantiateCustomBlockCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly insertedElementIds;
    constructor({ doc, pageId, customBlockId, anchor }: InstantiateCustomBlockCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=instantiate-custom-block-command.d.ts.map