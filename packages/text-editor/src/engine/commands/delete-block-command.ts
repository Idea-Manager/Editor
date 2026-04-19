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

/**
 * Removes a top-level document block. If it is the only block, replaces it with an empty paragraph.
 */
export class DeleteBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private removedBlock: BlockNode | null = null;
  private removedIndex = -1;
  private replacedSoleBlockWithParagraph = false;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
  ) {}

  execute(): void {
    const idx = this.doc.children.findIndex(b => b.id === this.blockId);
    if (idx === -1) return;

    const block = this.doc.children[idx];
    this.removedBlock = cloneBlock(block);
    this.removedIndex = idx;

    if (this.doc.children.length === 1) {
      this.doc.children.splice(0, 1);
      this.doc.children.push(createParagraph());
      this.replacedSoleBlockWithParagraph = true;
    } else {
      this.doc.children.splice(idx, 1);
    }

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:delete',
      payload: {
        parentId: this.doc.id,
        index: idx,
        nodeId: block.id,
        node: this.removedBlock,
      },
    });
  }

  undo(): void {
    if (!this.removedBlock || this.removedIndex === -1) return;

    if (this.replacedSoleBlockWithParagraph) {
      this.doc.children = [cloneBlock(this.removedBlock)];
    } else {
      this.doc.children.splice(this.removedIndex, 0, cloneBlock(this.removedBlock));
    }
  }

  getRemovedIndex(): number {
    return this.removedIndex;
  }
}
