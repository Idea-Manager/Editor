import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export type Alignment = 'left' | 'center' | 'right' | 'justify';

export class SetAlignCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldAlign: string = 'left';

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly newAlign: Alignment,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block) return;

    this.oldAlign = (block.data as Record<string, unknown>).align as string ?? 'left';
    (block.data as Record<string, unknown>).align = this.newAlign;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'data.align',
        oldValue: this.oldAlign,
        newValue: this.newAlign,
      },
    });
  }

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block) return;
    (block.data as Record<string, unknown>).align = this.oldAlign;
  }
}
