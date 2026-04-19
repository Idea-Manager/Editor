import type { BlockNode, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';

export class MergeBlocksCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private prevBlockOriginalChildren: TextRun[] = [];
  private removedBlock: BlockNode | null = null;
  private removedBlockIndex: number = -1;
  private mergeOffset: number = 0;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
  ) {}

  execute(): void {
    const blockIndex = this.doc.children.findIndex(b => b.id === this.blockId);
    if (blockIndex <= 0) return;

    const currentBlock = this.doc.children[blockIndex];
    const prevBlock = this.doc.children[blockIndex - 1];

    this.prevBlockOriginalChildren = prevBlock.children.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));

    this.removedBlock = {
      ...currentBlock,
      children: currentBlock.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      })),
      data: { ...currentBlock.data },
    };
    this.removedBlockIndex = blockIndex;

    this.mergeOffset = prevBlock.children.reduce(
      (sum, r) => sum + r.data.text.length,
      0,
    );

    const mgr = new InlineMarkManager();
    const merged = mgr.mergeAdjacentRuns([
      ...prevBlock.children,
      ...currentBlock.children,
    ]);
    prevBlock.children = merged;

    this.doc.children.splice(blockIndex, 1);

    this.operationRecords.push(
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: prevBlock.id,
          path: 'children',
          oldValue: this.prevBlockOriginalChildren,
          newValue: prevBlock.children,
        },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:delete',
        payload: {
          parentId: this.doc.id,
          index: blockIndex,
          nodeId: currentBlock.id,
          node: this.removedBlock,
        },
      },
    );
  }

  undo(): void {
    if (!this.removedBlock || this.removedBlockIndex === -1) return;

    const prevBlock = this.doc.children[this.removedBlockIndex - 1];
    if (prevBlock) {
      prevBlock.children = this.prevBlockOriginalChildren.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      }));
    }

    this.doc.children.splice(this.removedBlockIndex, 0, {
      ...this.removedBlock,
      children: this.removedBlock.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      })),
    });
  }

  getMergeOffset(): number {
    return this.mergeOffset;
  }

  getPreviousBlockId(): string {
    if (this.removedBlockIndex <= 0) return '';
    return this.doc.children[this.removedBlockIndex - 1]?.id ?? '';
  }
}
