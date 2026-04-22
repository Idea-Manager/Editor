import type { BlockNode, DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { cloneBlockNodeDeep } from '../document-snapshot';
import { createDefaultCellBlocks } from '../../blocks/table-cell-defaults';
import {
  applyMergeOutlineToPrimary,
  collectMergeRangeOutline,
} from '../../blocks/table-border-sync';
import { findTableBlock } from '../block-locator';

/** Paragraph with no non-empty text runs (matches empty placeholder cells). */
function isVacantParagraph(block: BlockNode): boolean {
  if (block.type !== 'paragraph') return false;
  return !block.children.some(r => (r.data?.text ?? '').length > 0);
}

function isCellOnlyVacantParagraphs(blocks: BlockNode[]): boolean {
  if (blocks.length === 0) return true;
  return blocks.every(isVacantParagraph);
}

/**
 * Row-major merge of table cell block lists: drops placeholder empty paragraphs
 * from the flat concatenation; if any were dropped, appends one fresh empty paragraph
 * so the caret can sit below the last real block. All-placeholder cells collapse to
 * a single default paragraph.
 */
function buildMergedPrimaryCellBlocks(cellsBlocks: readonly BlockNode[][]): BlockNode[] {
  if (cellsBlocks.every(isCellOnlyVacantParagraphs)) {
    return createDefaultCellBlocks();
  }

  const flat: BlockNode[] = [];
  for (const blocks of cellsBlocks) {
    for (const b of blocks) {
      flat.push(cloneBlockNodeDeep(b));
    }
  }

  const stripped = flat.filter(b => !isVacantParagraph(b));
  if (stripped.length === 0) {
    return createDefaultCellBlocks();
  }

  if (stripped.length < flat.length) {
    return [...stripped, ...createDefaultCellBlocks()];
  }

  return stripped;
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export class MergeCellsCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: { row: number; col: number; cell: TableCell }[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly range: CellRange,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const { startRow, startCol, endRow, endCol } = this.range;

    const topLeftCell = data.rows[startRow]?.cells[startCol];
    if (!topLeftCell || topLeftCell.absorbed) return;

    this.snapshot = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = data.rows[r].cells[c];
        this.snapshot.push({
          row: r,
          col: c,
          cell: {
            ...cell,
            blocks: cell.blocks.map(cloneBlockNodeDeep),
            style: { ...cell.style },
          },
        });
      }
    }

    const primaryCell = data.rows[startRow].cells[startCol];
    const mergeOutline = collectMergeRangeOutline(data, {
      startRow,
      startCol,
      endRow,
      endCol,
    });

    const cellsBlocks: BlockNode[][] = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cellsBlocks.push(data.rows[r].cells[c].blocks);
      }
    }

    primaryCell.colspan = endCol - startCol + 1;
    primaryCell.rowspan = endRow - startRow + 1;
    primaryCell.blocks = buildMergedPrimaryCellBlocks(cellsBlocks);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r === startRow && c === startCol) continue;
        data.rows[r].cells[c].absorbed = true;
        data.rows[r].cells[c].blocks = [];
      }
    }

    applyMergeOutlineToPrimary(data, { startRow, startCol, endRow, endCol }, mergeOutline);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'data.rows',
        oldValue: null,
        newValue: null,
      },
    });
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (const snap of this.snapshot) {
      data.rows[snap.row].cells[snap.col] = {
        ...snap.cell,
        blocks: snap.cell.blocks.map(cloneBlockNodeDeep),
        style: { ...snap.cell.style },
      };
    }
  }
}
