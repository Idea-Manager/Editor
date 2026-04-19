import type { BlockNode, BlockSelection, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';

export class DeleteSelectionCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: BlockNode[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly sel: BlockSelection,
  ) {}

  execute(): void {
    this.snapshot = this.doc.children.map(b => ({
      ...b,
      children: b.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      })),
      data: { ...b.data },
    }));

    const { startBlockId, startOffset, endBlockId, endOffset } = this.normalizeSelection();

    const startIdx = this.doc.children.findIndex(b => b.id === startBlockId);
    const endIdx = this.doc.children.findIndex(b => b.id === endBlockId);

    if (startIdx === -1 || endIdx === -1) return;

    if (startIdx === endIdx) {
      this.deleteSameBlock(startIdx, startOffset, endOffset);
    } else {
      this.deleteCrossBlock(startIdx, startOffset, endIdx, endOffset);
    }
  }

  undo(): void {
    this.doc.children = this.snapshot.map(b => ({
      ...b,
      children: b.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      })),
      data: { ...b.data },
    }));
  }

  private normalizeSelection(): {
    startBlockId: string;
    startOffset: number;
    endBlockId: string;
    endOffset: number;
  } {
    const anchorIdx = this.doc.children.findIndex(b => b.id === this.sel.anchorBlockId);
    const focusIdx = this.doc.children.findIndex(b => b.id === this.sel.focusBlockId);

    if (anchorIdx < focusIdx || (anchorIdx === focusIdx && this.sel.anchorOffset <= this.sel.focusOffset)) {
      return {
        startBlockId: this.sel.anchorBlockId,
        startOffset: this.sel.anchorOffset,
        endBlockId: this.sel.focusBlockId,
        endOffset: this.sel.focusOffset,
      };
    }

    return {
      startBlockId: this.sel.focusBlockId,
      startOffset: this.sel.focusOffset,
      endBlockId: this.sel.anchorBlockId,
      endOffset: this.sel.anchorOffset,
    };
  }

  private deleteSameBlock(idx: number, startOffset: number, endOffset: number): void {
    const block = this.doc.children[idx];
    const mgr = new InlineMarkManager();

    const { before } = mgr.splitRunAtOffset(block.children, startOffset);
    const { after } = mgr.splitRunAtOffset(block.children, endOffset);

    const merged = mgr.mergeAdjacentRuns([...before, ...after]);
    const oldChildren = block.children;
    block.children = merged.length > 0 ? merged : [{
      id: generateId('txt'),
      type: 'text' as const,
      data: { text: '', marks: [] },
    }];

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'children',
        oldValue: oldChildren,
        newValue: block.children,
      },
    });
  }

  private deleteCrossBlock(
    startIdx: number,
    startOffset: number,
    endIdx: number,
    endOffset: number,
  ): void {
    const startBlock = this.doc.children[startIdx];
    const endBlock = this.doc.children[endIdx];
    const mgr = new InlineMarkManager();

    // Keep text before startOffset in startBlock
    const { before: keepBefore } = mgr.splitRunAtOffset(startBlock.children, startOffset);

    // Keep text after endOffset in endBlock
    const { after: keepAfter } = mgr.splitRunAtOffset(endBlock.children, endOffset);

    const merged = mgr.mergeAdjacentRuns([...keepBefore, ...keepAfter]);
    startBlock.children = merged.length > 0 ? merged : [{
      id: generateId('txt'),
      type: 'text' as const,
      data: { text: '', marks: [] },
    }];

    // Remove middle blocks and endBlock
    const removedBlocks = this.doc.children.splice(startIdx + 1, endIdx - startIdx);

    for (let i = 0; i < removedBlocks.length; i++) {
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:delete',
        payload: {
          parentId: this.doc.id,
          index: startIdx + 1,
          nodeId: removedBlocks[i].id,
          node: removedBlocks[i],
        },
      });
    }

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: startBlock.id,
        path: 'children',
        oldValue: this.snapshot[startIdx].children,
        newValue: startBlock.children,
      },
    });
  }
}
