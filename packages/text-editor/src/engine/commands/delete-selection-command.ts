import type { BlockNode, BlockSelection, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';
import { findBlockLocation } from '../block-locator';
import { snapshotDocumentChildren, restoreDocumentChildren } from '../document-snapshot';

export class DeleteSelectionCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: BlockNode[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly sel: BlockSelection,
  ) {}

  execute(): void {
    this.snapshot = snapshotDocumentChildren(this.doc);

    const anchorLoc = findBlockLocation(this.doc, this.sel.anchorBlockId);
    const focusLoc = findBlockLocation(this.doc, this.sel.focusBlockId);
    if (!anchorLoc || !focusLoc) return;
    if (anchorLoc.parentList !== focusLoc.parentList) return;

    const forward =
      anchorLoc.index < focusLoc.index ||
      (anchorLoc.index === focusLoc.index && this.sel.anchorOffset <= this.sel.focusOffset);

    const startLoc = forward ? anchorLoc : focusLoc;
    const endLoc = forward ? focusLoc : anchorLoc;
    const startOffset = forward ? this.sel.anchorOffset : this.sel.focusOffset;
    const endOffset = forward ? this.sel.focusOffset : this.sel.anchorOffset;

    if (startLoc.index === endLoc.index) {
      this.deleteSameBlockInList(
        startLoc.parentList,
        startLoc.index,
        Math.min(startOffset, endOffset),
        Math.max(startOffset, endOffset),
      );
    } else {
      this.deleteCrossBlocksInList(
        startLoc.parentList,
        startLoc.index,
        startOffset,
        endLoc.index,
        endOffset,
      );
    }
  }

  undo(): void {
    restoreDocumentChildren(this.doc, this.snapshot);
  }

  private deleteSameBlockInList(
    parentList: BlockNode[],
    idx: number,
    startOffset: number,
    endOffset: number,
  ): void {
    const block = parentList[idx];
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

  private deleteCrossBlocksInList(
    parentList: BlockNode[],
    startIdx: number,
    startOffset: number,
    endIdx: number,
    endOffset: number,
  ): void {
    const startBlock = parentList[startIdx];
    const endBlock = parentList[endIdx];
    const mgr = new InlineMarkManager();

    const { before: keepBefore } = mgr.splitRunAtOffset(startBlock.children, startOffset);
    const { after: keepAfter } = mgr.splitRunAtOffset(endBlock.children, endOffset);

    const merged = mgr.mergeAdjacentRuns([...keepBefore, ...keepAfter]);
    startBlock.children = merged.length > 0 ? merged : [{
      id: generateId('txt'),
      type: 'text' as const,
      data: { text: '', marks: [] },
    }];

    const removedBlocks = parentList.splice(startIdx + 1, endIdx - startIdx);

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
        oldValue: [],
        newValue: startBlock.children,
      },
    });
  }
}
