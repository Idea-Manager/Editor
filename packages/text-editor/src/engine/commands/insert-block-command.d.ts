import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { BlockRegistry } from '../../blocks/block-registry';
export declare class InsertBlockCommand implements Command {
    private readonly doc;
    private readonly afterBlockId;
    private readonly newType;
    private readonly registry;
    private readonly dataOverride?;
    readonly operationRecords: OperationRecord[];
    private newBlockId;
    /** Stable prototype for redo (IDs must not change on re-execute). */
    private blockTemplate;
    constructor(doc: DocumentNode, afterBlockId: string, newType: string, registry: BlockRegistry, dataOverride?: Record<string, unknown> | undefined);
    execute(): void;
    undo(): void;
    getNewBlockId(): string;
}
//# sourceMappingURL=insert-block-command.d.ts.map