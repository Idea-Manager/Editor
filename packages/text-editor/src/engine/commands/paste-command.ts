import type { BlockNode, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';

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
    this.snapshot = this.doc.children.map(b => ({
      ...b,
      children: b.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      })),
      data: { ...b.data },
    }));

    if (this.pasteBlocks.length === 0) return;

    const blockIdx = this.doc.children.findIndex(b => b.id === this.blockId);
    if (blockIdx === -1) return;

    if (this.pasteBlocks.length === 1) {
      this.insertSingleBlock(blockIdx);
    } else {
      this.insertMultipleBlocks(blockIdx);
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

  private insertSingleBlock(blockIdx: number): void {
    const block = this.doc.children[blockIdx];
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
        oldValue: this.snapshot[blockIdx].children,
        newValue: block.children,
      },
    });
  }

  private insertMultipleBlocks(blockIdx: number): void {
    const block = this.doc.children[blockIdx];
    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    // First paste block merges with content before the cursor
    const firstPasteRuns = this.pasteBlocks[0].children;
    block.children = mgr.mergeAdjacentRuns([...before, ...firstPasteRuns]);

    // Last paste block merges with content after the cursor
    const lastPaste = this.pasteBlocks[this.pasteBlocks.length - 1];
    const lastBlock: BlockNode = {
      id: generateId('blk'),
      type: lastPaste.type,
      data: { ...lastPaste.data },
      children: mgr.mergeAdjacentRuns([...lastPaste.children, ...after]),
      meta: { createdAt: Date.now(), version: 1 },
    };

    // Middle paste blocks inserted as-is
    const middleBlocks = this.pasteBlocks.slice(1, -1).map(b => ({
      ...b,
      id: generateId('blk'),
      meta: { createdAt: Date.now(), version: 1 },
    }));

    const newBlocks = [...middleBlocks, lastBlock];
    this.doc.children.splice(blockIdx + 1, 0, ...newBlocks);
    this.insertedBlockIds = newBlocks.map(b => b.id);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'children',
        oldValue: this.snapshot[blockIdx].children,
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
          index: blockIdx + 1 + i,
          node: newBlocks[i],
        },
      });
    }
  }
}
