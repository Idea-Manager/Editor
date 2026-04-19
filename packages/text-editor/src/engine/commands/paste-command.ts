import type { BlockNode, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';
import { findBlockLocation } from '../block-locator';
import { snapshotDocumentChildren, restoreDocumentChildren } from '../document-snapshot';

export class PasteCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: BlockNode[] = [];
  private insertedBlockIds: string[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly offset: number,
    private readonly pasteBlocks: BlockNode[],
  ) {}

  execute(): void {
    this.snapshot = snapshotDocumentChildren(this.doc);

    if (this.pasteBlocks.length === 0) return;

    const loc = findBlockLocation(this.doc, this.blockId);
    if (!loc) return;

    if (this.pasteBlocks.length === 1) {
      this.insertSingleBlock(loc);
    } else {
      this.insertMultipleBlocks(loc);
    }
  }

  undo(): void {
    restoreDocumentChildren(this.doc, this.snapshot);
  }

  private insertSingleBlock(loc: NonNullable<ReturnType<typeof findBlockLocation>>): void {
    const block = loc.block;
    const pasteRuns = this.pasteBlocks[0].children;

    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    block.children = mgr.mergeAdjacentRuns([...before, ...pasteRuns, ...after]);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'children',
        oldValue: [],
        newValue: block.children,
      },
    });
  }

  private insertMultipleBlocks(loc: NonNullable<ReturnType<typeof findBlockLocation>>): void {
    const block = loc.block;
    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    const firstPasteRuns = this.pasteBlocks[0].children;
    block.children = mgr.mergeAdjacentRuns([...before, ...firstPasteRuns]);

    const lastPaste = this.pasteBlocks[this.pasteBlocks.length - 1];
    const lastBlock: BlockNode = {
      id: generateId('blk'),
      type: lastPaste.type,
      data: { ...lastPaste.data },
      children: mgr.mergeAdjacentRuns([...lastPaste.children, ...after]),
      meta: { createdAt: Date.now(), version: 1 },
    };

    const middleBlocks = this.pasteBlocks.slice(1, -1).map(b => ({
      ...b,
      id: generateId('blk'),
      meta: { createdAt: Date.now(), version: 1 },
    }));

    const newBlocks = [...middleBlocks, lastBlock];
    this.insertedBlockIds = newBlocks.map(b => b.id);

    loc.parentList.splice(loc.index + 1, 0, ...newBlocks);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'children',
        oldValue: [],
        newValue: block.children,
      },
    });

    for (let i = 0; i < newBlocks.length; i++) {
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:insert',
        payload: {
          parentId: this.doc.id,
          index: loc.index + 1 + i,
          node: newBlocks[i],
        },
      });
    }
  }
}
