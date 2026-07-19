import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { SelectionEntry } from '../engine/selection-manager';
export interface CreateCustomBlockCommandOptions {
    doc: DocumentNode;
    pageId: string;
    name: string;
    entries: SelectionEntry[];
}
/**
 * Snapshots the current selection into a `CustomBlockDefinition` stored in
 * `doc.data.customBlocks`. Nested custom blocks (`custom:*` types) are NOT
 * supported and are silently excluded.
 */
export declare class CreateCustomBlockCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly definition;
    constructor({ doc, pageId, name, entries }: CreateCustomBlockCommandOptions);
    get definitionId(): string;
    get definitionName(): string;
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=create-custom-block-command.d.ts.map