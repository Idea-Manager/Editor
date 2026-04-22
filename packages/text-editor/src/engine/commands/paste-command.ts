import type { BlockNode, DocumentNode, TableData, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';
import { type BlockLocation, findBlockLocation } from '../block-locator';
import {
  cloneTableData,
  restoreDocumentChildren,
  snapshotDocumentChildren,
} from '../document-snapshot';

function isAtomicBlockType(type: string): boolean {
  return type === 'table' || type === 'embed' || type === 'graphic';
}

function textLength(runs: TextRun[]): number {
  return runs.reduce((a, r) => a + r.data.text.length, 0);
}

function insertPayloadParentId(loc: BlockLocation, doc: DocumentNode): string {
  if (loc.parentKind === 'document') return doc.id;
  return loc.cellId ?? doc.id;
}

function copyBlockDataForPaste(p: BlockNode): BlockNode['data'] {
  if (p.type === 'table') {
    return cloneTableData(p.data as TableData) as BlockNode['data'];
  }
  return { ...p.data } as BlockNode['data'];
}

function newMeta() {
  return { createdAt: Date.now(), version: 1 as const };
}

function blockTextEndOffset(block: BlockNode): number {
  return block.children.reduce((s, r) => s + r.data.text.length, 0);
}

export class PasteCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: BlockNode[] = [];
  private insertedBlockIds: string[] = [];
  /** Set at end of successful paste; used to position the caret. */
  private caretAfterPaste: { blockId: string; offset: number } | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly offset: number,
    private readonly pasteBlocks: BlockNode[],
  ) {}

  /** Collapsed position at end of last pasted item (0 for table/embed/graphic). */
  getCaretAfterPaste(): { blockId: string; offset: number } | null {
    return this.caretAfterPaste;
  }

  private setCaretOnBlock(b: BlockNode | undefined): void {
    if (!b) return;
    this.caretAfterPaste = isAtomicBlockType(b.type)
      ? { blockId: b.id, offset: 0 }
      : { blockId: b.id, offset: blockTextEndOffset(b) };
  }

  execute(): void {
    this.caretAfterPaste = null;
    this.snapshot = snapshotDocumentChildren(this.doc);

    if (this.pasteBlocks.length === 0) return;

    const loc = findBlockLocation(this.doc, this.blockId);
    if (!loc) return;

    if (this.pasteBlocks.length === 1) {
      this.insertSingleBlock(loc);
    } else {
      this.insertMultiWithLeadingIfNeeded(loc);
    }
  }

  undo(): void {
    restoreDocumentChildren(this.doc, this.snapshot);
  }

  private pushNodeInsert(loc: BlockLocation, indexInParent: number, node: BlockNode): void {
    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:insert',
      payload: {
        parentId: insertPayloadParentId(loc, this.doc),
        index: indexInParent,
        node,
      },
    });
  }

  private pushBlockChildrenUpdateRecord(block: BlockNode): void {
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

  private applyTextFlowTypeAndData(block: BlockNode, p: BlockNode): void {
    block.type = p.type;
    block.data = copyBlockDataForPaste(p);
  }

  private makeEmptyParagraphWithRuns(mgr: InlineMarkManager, runs: TextRun[]): BlockNode {
    const merged = mgr.mergeAdjacentRuns(
      textLength(runs) > 0
        ? runs
        : [
            {
              id: generateId('txt'),
              type: 'text' as const,
              data: { text: '', marks: [] as const },
            },
          ],
    );
    return {
      id: generateId('blk'),
      type: 'paragraph',
      data: { align: 'left' },
      children: merged,
      meta: newMeta(),
    };
  }

  private insertSingleBlock(loc: BlockLocation): void {
    const paste = this.pasteBlocks[0]!;
    const block = loc.block;
    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    if (isAtomicBlockType(paste.type)) {
      this.insertSingleAtomic(loc, paste, before, after, mgr);
      return;
    }

    this.applyTextFlowTypeAndData(block, paste);
    block.children = mgr.mergeAdjacentRuns([...before, ...paste.children, ...after]);
    this.pushBlockChildrenUpdateRecord(block);
    this.setCaretOnBlock(block);
  }

  private insertSingleAtomic(
    loc: BlockLocation,
    paste: BlockNode,
    before: TextRun[],
    after: TextRun[],
    mgr: InlineMarkManager,
  ): void {
    const block = loc.block;
    const beforeLen = textLength(before);
    const afterLen = textLength(after);

    if (beforeLen === 0 && afterLen === 0) {
      const replacement: BlockNode = {
        id: block.id,
        type: paste.type,
        data: copyBlockDataForPaste(paste),
        children:
          paste.type === 'table' ? [] : mgr.mergeAdjacentRuns([...paste.children]),
        meta: newMeta(),
      };
      loc.parentList[loc.index] = replacement;
      this.pushBlockChildrenUpdateRecord(replacement);
      this.setCaretOnBlock(replacement);
      return;
    }

    if (beforeLen === 0) {
      const atomic: BlockNode = {
        id: block.id,
        type: paste.type,
        data: copyBlockDataForPaste(paste),
        children: paste.type === 'table' ? [] : mgr.mergeAdjacentRuns([...paste.children]),
        meta: newMeta(),
      };
      if (afterLen > 0) {
        const tail = this.makeEmptyParagraphWithRuns(mgr, [...after]);
        loc.parentList.splice(loc.index, 1, atomic, tail);
        this.pushBlockChildrenUpdateRecord(atomic);
        this.pushNodeInsert(loc, loc.index + 1, tail);
        this.setCaretOnBlock(tail);
      } else {
        loc.parentList[loc.index] = atomic;
        this.pushBlockChildrenUpdateRecord(atomic);
        this.setCaretOnBlock(atomic);
      }
      return;
    }

    block.children = mgr.mergeAdjacentRuns([...before]);
    this.pushBlockChildrenUpdateRecord(block);

    const atomic: BlockNode = {
      id: generateId('blk'),
      type: paste.type,
      data: copyBlockDataForPaste(paste),
      children: paste.type === 'table' ? [] : mgr.mergeAdjacentRuns([...paste.children]),
      meta: newMeta(),
    };
    this.insertedBlockIds = [atomic.id];
    if (afterLen > 0) {
      const tail = this.makeEmptyParagraphWithRuns(mgr, [...after]);
      this.insertedBlockIds = [atomic.id, tail.id];
      loc.parentList.splice(loc.index + 1, 0, atomic, tail);
      this.pushNodeInsert(loc, loc.index + 1, atomic);
      this.pushNodeInsert(loc, loc.index + 2, tail);
      this.setCaretOnBlock(tail);
    } else {
      loc.parentList.splice(loc.index + 1, 0, atomic);
      this.pushNodeInsert(loc, loc.index + 1, atomic);
      this.setCaretOnBlock(atomic);
    }
  }

  private insertMultiWithLeadingIfNeeded(loc: BlockLocation): void {
    const first = this.pasteBlocks[0]!;
    if (isAtomicBlockType(first.type)) {
      this.insertMultiLeadingAtomic(loc);
    } else {
      this.insertMultipleBlocks(loc);
    }
  }

  /** Multi-line paste with table/embed first: anchor only keeps `before`, then new blocks. */
  private insertMultiLeadingAtomic(loc: BlockLocation): void {
    const block = loc.block;
    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);
    block.children = mgr.mergeAdjacentRuns([...before]);
    this.pushBlockChildrenUpdateRecord(block);

    const toInsert: BlockNode[] = [];
    for (let i = 0; i < this.pasteBlocks.length; i++) {
      const p = this.pasteBlocks[i]!;
      const isLast = i === this.pasteBlocks.length - 1;
      if (isAtomicBlockType(p.type)) {
        toInsert.push({
          id: generateId('blk'),
          type: p.type,
          data: copyBlockDataForPaste(p),
          children: p.type === 'table' ? [] : mgr.mergeAdjacentRuns([...p.children]),
          meta: newMeta(),
        });
        if (isLast && textLength(after) > 0) {
          toInsert.push(this.makeEmptyParagraphWithRuns(mgr, [...after]));
        }
      } else if (isLast) {
        toInsert.push({
          id: generateId('blk'),
          type: p.type,
          data: copyBlockDataForPaste(p),
          children: mgr.mergeAdjacentRuns([...p.children, ...after]),
          meta: newMeta(),
        });
      } else {
        toInsert.push({
          id: generateId('blk'),
          type: p.type,
          data: copyBlockDataForPaste(p),
          children: mgr.mergeAdjacentRuns([...p.children]),
          meta: newMeta(),
        });
      }
    }
    this.insertedBlockIds = toInsert.map(b => b.id);
    loc.parentList.splice(loc.index + 1, 0, ...toInsert);
    for (let j = 0; j < toInsert.length; j++) {
      this.pushNodeInsert(loc, loc.index + 1 + j, toInsert[j]!);
    }
    this.setCaretOnBlock(toInsert[toInsert.length - 1]!);
  }

  private insertMultipleBlocks(loc: BlockLocation): void {
    const block = loc.block;
    const mgr = new InlineMarkManager();
    const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

    const first = this.pasteBlocks[0]!;
    this.applyTextFlowTypeAndData(block, first);
    block.children = mgr.mergeAdjacentRuns([...before, ...first.children]);

    const lastPaste = this.pasteBlocks[this.pasteBlocks.length - 1]!;
    const lastIsAtom = isAtomicBlockType(lastPaste.type);
    const hasAfter = textLength(after) > 0;

    const lastBlock: BlockNode = lastIsAtom
      ? {
          id: generateId('blk'),
          type: lastPaste.type,
          data: copyBlockDataForPaste(lastPaste),
          children: lastPaste.type === 'table' ? [] : mgr.mergeAdjacentRuns([...lastPaste.children]),
          meta: newMeta(),
        }
      : {
          id: generateId('blk'),
          type: lastPaste.type,
          data: copyBlockDataForPaste(lastPaste),
          children: mgr.mergeAdjacentRuns([...lastPaste.children, ...after]),
          meta: newMeta(),
        };

    const middleBlocks = this.pasteBlocks.slice(1, -1).map(
      b =>
        ({
          id: generateId('blk'),
          type: b.type,
          data: copyBlockDataForPaste(b),
          children: b.type === 'table' ? [] : mgr.mergeAdjacentRuns([...b.children]),
          meta: newMeta(),
        }) as BlockNode,
    );

    const newBlocks: BlockNode[] = [...middleBlocks, lastBlock];
    if (lastIsAtom && hasAfter) {
      newBlocks.push(this.makeEmptyParagraphWithRuns(mgr, [...after]));
    }

    this.insertedBlockIds = newBlocks.map(b => b.id);
    loc.parentList.splice(loc.index + 1, 0, ...newBlocks);

    this.pushBlockChildrenUpdateRecord(block);
    for (let i = 0; i < newBlocks.length; i++) {
      this.pushNodeInsert(loc, loc.index + 1 + i, newBlocks[i]!);
    }
    this.setCaretOnBlock(newBlocks[newBlocks.length - 1]!);
  }
}
