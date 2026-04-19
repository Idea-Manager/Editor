import type { BlockNode, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export class MoveBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private block: BlockNode | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly toIndex: number,
  ) {}

  execute(): void {
    const fromIndex = this.doc.children.findIndex(b => b.id === this.blockId);
    if (fromIndex === -1) return;

    this.block = this.doc.children[fromIndex];
    this.doc.children.splice(fromIndex, 1);

    const insertAt = Math.min(this.toIndex, this.doc.children.length);
    this.doc.children.splice(insertAt, 0, this.block);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:move',
      payload: {
        nodeId: this.blockId,
        oldParentId: this.doc.id,
        oldIndex: fromIndex,
        newParentId: this.doc.id,
        newIndex: insertAt,
      },
    });
  }

  undo(): void {
    if (!this.block) return;

    const currentIndex = this.doc.children.findIndex(b => b.id === this.blockId);
    if (currentIndex === -1) return;

    const record = this.operationRecords[0];
    if (!record) return;

    const payload = record.payload as { oldIndex: number };
    this.doc.children.splice(currentIndex, 1);
    this.doc.children.splice(payload.oldIndex, 0, this.block);
  }
}
