import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { BlockRegistry } from '../../blocks/block-registry';
export declare class ChangeBlockTypeCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly newType;
    private readonly registry;
    private readonly dataOverride?;
    readonly operationRecords: OperationRecord[];
    private oldType;
    private oldData;
    private oldChildren;
    constructor(doc: DocumentNode, blockId: string, newType: string, registry: BlockRegistry, dataOverride?: Record<string, unknown> | undefined);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=change-block-type-command.d.ts.map