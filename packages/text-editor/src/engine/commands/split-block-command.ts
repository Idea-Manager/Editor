import type { BlockNode, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';

export class SplitBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private newBlockId: string = '';
  private originalChildren: TextRun[] = [];
  private blockIndex: number = -1;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly offset: number,
  ) {}

  execute(): void {
    const blockIndex = this.doc.children.findIndex(b => b.id === this.blockId);
    if (blockIndex === -1) return;

    this.blockIndex = blockIndex;
    const block = this.doc.children[blockIndex];

    this.originalChildren = block.children.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));

    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    // New block type: heading at end becomes paragraph, otherwise same type
    const totalLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
    const isAtEnd = this.offset >= totalLen;
    const newType = (block.type === 'heading' && isAtEnd) ? 'paragraph' : block.type;

    const newBlockId = generateId('blk');
    this.newBlockId = newBlockId;

    let newBlockData: Record<string, unknown>;
    if (newType === 'paragraph') {
      newBlockData = { align: 'left' as const };
    } else {
      newBlockData = { ...block.data };
    }

    const newBlock: BlockNode = {
      id: newBlockId,
      type: newType as BlockNode['type'],
      data: newBlockData,
      children: after.length > 0 ? after : [{
        id: generateId('txt'),
        type: 'text',
        data: { text: '', marks: [] },
      }],
      meta: { createdAt: Date.now(), version: 1 },
    };

    block.children = before.length > 0 ? before : [{
      id: generateId('txt'),
      type: 'text',
      data: { text: '', marks: [] },
    }];

    this.doc.children.splice(blockIndex + 1, 0, newBlock);

    this.operationRecords.push(
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'children',
          oldValue: this.originalChildren,
          newValue: block.children,
        },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:insert',
        payload: {
          parentId: this.doc.id,
          index: blockIndex + 1,
          node: newBlock,
        },
      },
    );
  }

  undo(): void {
    if (this.blockIndex === -1) return;

    const block = this.doc.children[this.blockIndex];
    block.children = this.originalChildren.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));

    const newBlockIdx = this.doc.children.findIndex(b => b.id === this.newBlockId);
    if (newBlockIdx !== -1) {
      this.doc.children.splice(newBlockIdx, 1);
    }
  }

  getNewBlockId(): string {
    return this.newBlockId;
  }
}
