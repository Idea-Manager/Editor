import { OperationRecord } from '../operation-log/interfaces';
import { Command } from './command';

export class CompositeCommand implements Command {
  private readonly commands: Command[];

  constructor(commands: Command[]) {
    this.commands = [...commands];
  }

  get operationRecords(): OperationRecord[] {
    return this.commands.flatMap(cmd => cmd.operationRecords);
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
