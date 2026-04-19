import { Command } from './command';
import { CompositeCommand } from './composite-command';

export function batchCommands(commands: Command[]): CompositeCommand {
  return new CompositeCommand(commands);
}
