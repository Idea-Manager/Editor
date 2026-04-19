import type { BlockNode, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';
import { findBlockLocation } from '../block-locator';

export class MergeBlocksCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private prevBlockOriginalChildren: TextRun[] = [];
  private removedBlock: BlockNode | null = null;
  private removedBlockIndex: number = -1;
  private mergeOffset: number = 0;
  private prevBlockId: string = '';

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
  ) {}

  execute(): void {
    const loc = findBlockLocation(this.doc, this.blockId);
    if (!loc || loc.index <= 0) return;

    const currentBlock = loc.block;
    const prevBlock = loc.parentList[loc.index - 1];

    this.prevBlockId = prevBlock.id;

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
    this.removedBlockIndex = loc.index;

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

    loc.parentList.splice(loc.index, 1);

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
          index: loc.index,
          nodeId: currentBlock.id,
          node: this.removedBlock,
        },
      },
    );
  }

  undo(): void {
    if (!this.removedBlock || this.removedBlockIndex === -1) return;

    const prevLoc = findBlockLocation(this.doc, this.prevBlockId);
    if (!prevLoc) return;

    const prevBlock = prevLoc.block;
    prevBlock.children = this.prevBlockOriginalChildren.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));

    prevLoc.parentList.splice(this.removedBlockIndex, 0, {
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
    return this.prevBlockId;
  }
}
