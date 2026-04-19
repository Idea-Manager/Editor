import type { BlockNode, DocumentNode, BlockType } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { BlockRegistry } from '../../blocks/block-registry';
import { generateId } from '@core/id';

export class InsertBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private newBlockId = '';
  private insertIndex = -1;

  constructor(
    private readonly doc: DocumentNode,
    private readonly afterBlockId: string,
    private readonly newType: BlockType,
    private readonly registry: BlockRegistry,
    private readonly dataOverride?: Record<string, unknown>,
  ) {}

  execute(): void {
    const afterIndex = this.doc.children.findIndex(b => b.id === this.afterBlockId);
    if (afterIndex === -1) return;

    const def = this.registry.get(this.newType);
    const newBlockId = generateId('blk');
    this.newBlockId = newBlockId;
    this.insertIndex = afterIndex + 1;

    const newBlock: BlockNode = {
      id: newBlockId,
      type: this.newType,
      data: this.dataOverride ? { ...this.dataOverride } : def.defaultData(),
      children: [{
        id: generateId('txt'),
        type: 'text',
        data: { text: '', marks: [] },
      }],
      meta: { createdAt: Date.now(), version: 1 },
    };

    this.doc.children.splice(this.insertIndex, 0, newBlock);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:insert',
      payload: {
        parentId: this.doc.id,
        index: this.insertIndex,
        node: newBlock,
      },
    });
  }

  undo(): void {
    if (this.insertIndex === -1) return;

    const idx = this.doc.children.findIndex(b => b.id === this.newBlockId);
    if (idx !== -1) {
      this.doc.children.splice(idx, 1);
    }
  }

  getNewBlockId(): string {
    return this.newBlockId;
  }
}
