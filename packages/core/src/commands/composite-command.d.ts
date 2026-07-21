import { OperationRecord } from '../operation-log/interfaces';
import { Command } from './command';
export declare class CompositeCommand implements Command {
    private readonly commands;
    constructor(commands: Command[]);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=composite-command.d.ts.map