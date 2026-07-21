import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export type Alignment = 'left' | 'center' | 'right' | 'justify';
export declare class SetAlignCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly newAlign;
    readonly operationRecords: OperationRecord[];
    private oldAlign;
    constructor(doc: DocumentNode, blockId: string, newAlign: Alignment);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-align-command.d.ts.map