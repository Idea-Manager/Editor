import type { BlockNode, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { createParagraph } from '@core/model/factory';
import { generateId } from '@core/id';

function cloneBlock(node: BlockNode): BlockNode {
  return {
    ...node,
    children: node.children.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    })),
    data: { ...(node.data as object) } as BlockNode['data'],
    meta: node.meta ? { ...node.meta } : undefined,
  };
}

/** Removes a contiguous span of top-level list_item blocks in one undo step. */
export class DeleteListGroupCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private removedBlocks: BlockNode[] = [];
  private removedStart = -1;
  private replacedAllBlocksWithParagraph = false;

  constructor(
    private readonly doc: DocumentNode,
    private readonly start: number,
    private readonly end: number,
  ) {}

  execute(): void {
    if (this.start < 0 || this.end < this.start) return;
    const count = this.end - this.start + 1;
    if (count <= 0 || this.start >= this.doc.children.length) return;

    this.removedBlocks = this.doc.children
      .slice(this.start, this.end + 1)
      .map(cloneBlock);
    this.removedStart = this.start;

    if (this.doc.children.length === count) {
      this.doc.children.splice(0, count);
      this.doc.children.push(createParagraph());
      this.replacedAllBlocksWithParagraph = true;
    } else {
      this.doc.children.splice(this.start, count);
    }

    for (let i = 0; i < this.removedBlocks.length; i++) {
      const block = this.removedBlocks[i];
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:delete',
        payload: {
          parentId: this.doc.id,
          index: this.start + i,
          nodeId: block.id,
          node: cloneBlock(block),
        },
      });
    }
  }

  undo(): void {
    if (this.removedBlocks.length === 0 || this.removedStart === -1) return;

    if (this.replacedAllBlocksWithParagraph) {
      this.doc.children = this.removedBlocks.map(cloneBlock);
    } else {
      this.doc.children.splice(
        this.removedStart,
        0,
        ...this.removedBlocks.map(cloneBlock),
      );
    }
  }

  getRemovedStart(): number {
    return this.removedStart;
  }
}
