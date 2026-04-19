import type { BlockNode, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { createParagraph } from '@core/model/factory';
import { generateId } from '@core/id';
import { findBlockLocation, findTableCell } from '../block-locator';
import { createDefaultCellBlocks } from '../../blocks/table-cell-defaults';

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

type CellUndo = {
  tableBlockId: string;
  cellId: string;
  blocksSnapshot: BlockNode[];
};

/**
 * Removes a document block or a nested block inside a table cell.
 * Top-level: if it is the only block, replaces it with an empty paragraph.
 * In a cell: if it is the only nested block, replaces cell content with a default empty paragraph.
 */
export class DeleteBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private removedBlock: BlockNode | null = null;
  private removedIndex = -1;
  private replacedSoleBlockWithParagraph = false;
  private cellUndo: CellUndo | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
  ) {}

  execute(): void {
    const loc = findBlockLocation(this.doc, this.blockId);
    if (!loc) return;

    if (loc.parentKind === 'table-cell') {
      this.executeInTableCell(loc);
      return;
    }

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

  private executeInTableCell(loc: NonNullable<ReturnType<typeof findBlockLocation>>): void {
    const cell = findTableCell(this.doc, loc.tableBlockId!, loc.cellId!);
    if (!cell) return;

    this.cellUndo = {
      tableBlockId: loc.tableBlockId!,
      cellId: loc.cellId!,
      blocksSnapshot: cell.blocks.map(cloneBlock),
    };

    this.removedBlock = cloneBlock(loc.block);
    this.removedIndex = loc.index;

    if (cell.blocks.length === 1) {
      cell.blocks = createDefaultCellBlocks();
    } else {
      cell.blocks.splice(loc.index, 1);
    }

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: loc.cellId!,
        path: 'cell.blocks',
        oldValue: null,
        newValue: null,
      },
    });
  }

  undo(): void {
    if (this.cellUndo) {
      const cell = findTableCell(this.doc, this.cellUndo.tableBlockId, this.cellUndo.cellId);
      if (cell) {
        cell.blocks = this.cellUndo.blocksSnapshot.map(cloneBlock);
      }
      this.cellUndo = null;
      return;
    }

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
