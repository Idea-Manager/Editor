import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findBlockLocation } from '../block-locator';

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
    const block = findBlockLocation(this.doc, this.blockId)?.block;
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
    const block = findBlockLocation(this.doc, this.blockId)?.block;
    if (!block) return;
    (block.data as Record<string, unknown>).align = this.oldAlign;
  }
}
