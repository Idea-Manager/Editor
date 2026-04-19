import { Command } from '../command';
import { CompositeCommand } from '../composite-command';
import { batchCommands } from '../helpers';
import { OperationRecord } from '../../operation-log/interfaces';

function makeTestCommand(log: string[]): Command {
  const record: OperationRecord = {
    id: `op_${Math.random().toString(36).slice(2)}`,
    actorId: 'test',
    timestamp: 1,
    wallClock: Date.now(),
    type: 'node:update',
    payload: { nodeId: 'n1', path: 'data.x', oldValue: 0, newValue: 1 },
  };

  return {
    operationRecords: [record],
    execute() { log.push('exec'); },
    undo() { log.push('undo'); },
  };
}

describe('CompositeCommand', () => {
  it('should execute all sub-commands in order', () => {
    const log: string[] = [];
    const cmd = new CompositeCommand([
      makeTestCommand(log),
      makeTestCommand(log),
      makeTestCommand(log),
    ]);
    cmd.execute();
    expect(log).toEqual(['exec', 'exec', 'exec']);
  });

  it('should undo all sub-commands in reverse order', () => {
    const log: string[] = [];
    const cmds = [
      { ...makeTestCommand(log), undo() { log.push('undo-a'); } },
      { ...makeTestCommand(log), undo() { log.push('undo-b'); } },
      { ...makeTestCommand(log), undo() { log.push('undo-c'); } },
    ];
    const composite = new CompositeCommand(cmds);
    composite.undo();
    expect(log).toEqual(['undo-c', 'undo-b', 'undo-a']);
  });

  it('should flatten operationRecords from all sub-commands', () => {
    const log: string[] = [];
    const composite = new CompositeCommand([
      makeTestCommand(log),
      makeTestCommand(log),
    ]);
    expect(composite.operationRecords).toHaveLength(2);
  });
});

describe('batchCommands', () => {
  it('should create a CompositeCommand from an array', () => {
    const log: string[] = [];
    const batch = batchCommands([makeTestCommand(log), makeTestCommand(log)]);
    expect(batch).toBeInstanceOf(CompositeCommand);
    batch.execute();
    expect(log).toEqual(['exec', 'exec']);
  });
});
