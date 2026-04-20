import type {
  BlockNode,
  BlockSelection,
  DocumentNode,
  TableCell,
  TableData,
} from '@core/model/interfaces';

/** First content block in the first non-absorbed cell (reading order), for caret after inserting a table. */
export function getFirstTableCellFirstBlockId(tableBlock: BlockNode): string | null {
  if (tableBlock.type !== 'table') return null;
  const data = tableBlock.data as TableData;
  for (const row of data.rows) {
    for (const cell of row.cells) {
      if (cell.absorbed) continue;
      const first = cell.blocks[0];
      if (first) return first.id;
    }
  }
  return null;
}

export type BlockParentKind = 'document' | 'table-cell';

export interface BlockLocation {
  block: BlockNode;
  parentList: BlockNode[];
  index: number;
  parentKind: BlockParentKind;
  tableBlockId?: string;
  cellId?: string;
}

function findBlockInTableData(
  data: TableData,
  tableBlockId: string,
  blockId: string,
): BlockLocation | null {
  for (const row of data.rows) {
    for (const cell of row.cells) {
      const idx = cell.blocks.findIndex(b => b.id === blockId);
      if (idx !== -1) {
        return {
          block: cell.blocks[idx],
          parentList: cell.blocks,
          index: idx,
          parentKind: 'table-cell',
          tableBlockId,
          cellId: cell.id,
        };
      }
      for (const b of cell.blocks) {
        if (b.type === 'table') {
          const nested = findBlockInTableData(b.data as TableData, b.id, blockId);
          if (nested) return nested;
        }
      }
    }
  }
  return null;
}

export function findBlockLocation(doc: DocumentNode, blockId: string): BlockLocation | null {
  const topIdx = doc.children.findIndex(b => b.id === blockId);
  if (topIdx !== -1) {
    return {
      block: doc.children[topIdx],
      parentList: doc.children,
      index: topIdx,
      parentKind: 'document',
    };
  }

  for (const child of doc.children) {
    if (child.type !== 'table') continue;
    const found = findBlockInTableData(child.data as TableData, child.id, blockId);
    if (found) return found;
  }

  return null;
}

export function getBlockById(doc: DocumentNode, blockId: string): BlockNode | null {
  return findBlockLocation(doc, blockId)?.block ?? null;
}

function blockTextLength(block: BlockNode): number {
  return block.children.map(r => r.data.text).join('').length;
}

function visitBlockInReadingOrder(block: BlockNode, out: BlockNode[]): void {
  if (block.type === 'table') {
    const data = block.data as TableData;
    for (const row of data.rows) {
      for (const cell of row.cells) {
        if (cell.absorbed) continue;
        for (const b of cell.blocks) {
          visitBlockInReadingOrder(b, out);
        }
      }
    }
  } else {
    out.push(block);
  }
}

/** Linear leaf order of block nodes (paragraphs, headings, etc.) matching table reading order. */
export function flattenBlocksInReadingOrder(doc: DocumentNode): BlockNode[] {
  const out: BlockNode[] = [];
  for (const b of doc.children) {
    visitBlockInReadingOrder(b, out);
  }
  return out;
}

export interface SelectionTextSpan {
  block: BlockNode;
  start: number;
  end: number;
}

function spansInSameParentList(
  a: BlockLocation,
  f: BlockLocation,
  sel: BlockSelection,
): SelectionTextSpan[] {
  const forward =
    a.index < f.index ||
    (a.index === f.index && sel.anchorOffset <= sel.focusOffset);
  const startIdx = forward ? a.index : f.index;
  const endIdx = forward ? f.index : a.index;
  const startOff = forward ? sel.anchorOffset : sel.focusOffset;
  const endOff = forward ? sel.focusOffset : sel.anchorOffset;

  const spans: SelectionTextSpan[] = [];
  const list = a.parentList;
  for (let i = startIdx; i <= endIdx; i++) {
    const block = list[i];
    const len = blockTextLength(block);
    let start = 0;
    let end = len;
    if (i === startIdx) start = startOff;
    if (i === endIdx) end = endOff;
    if (start < end) {
      spans.push({ block, start, end });
    }
  }
  return spans;
}

/**
 * Character ranges per block for the selection (anchor → focus in reading order).
 * Cross-cell table selections use row-major reading order.
 */
export function getSelectionSpansInDocumentOrder(
  doc: DocumentNode,
  sel: BlockSelection,
): SelectionTextSpan[] | null {
  const a = findBlockLocation(doc, sel.anchorBlockId);
  const f = findBlockLocation(doc, sel.focusBlockId);
  if (!a || !f) return null;

  if (a.block.id === f.block.id) {
    const lo = Math.min(sel.anchorOffset, sel.focusOffset);
    const hi = Math.max(sel.anchorOffset, sel.focusOffset);
    return [{ block: a.block, start: lo, end: hi }];
  }

  if (a.parentList === f.parentList) {
    return spansInSameParentList(a, f, sel);
  }

  const flat = flattenBlocksInReadingOrder(doc);
  const ia = flat.findIndex(b => b.id === sel.anchorBlockId);
  const ib = flat.findIndex(b => b.id === sel.focusBlockId);
  if (ia === -1 || ib === -1) return null;

  const startIdx = Math.min(ia, ib);
  const endIdx = Math.max(ia, ib);
  const startOff = ia < ib ? sel.anchorOffset : sel.focusOffset;
  const endOff = ia < ib ? sel.focusOffset : sel.anchorOffset;

  const spans: SelectionTextSpan[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const block = flat[i];
    const len = blockTextLength(block);
    let start = 0;
    let end = len;
    if (i === startIdx) start = startOff;
    if (i === endIdx) end = endOff;
    if (start < end) {
      spans.push({ block, start, end });
    }
  }
  return spans;
}

/** Resolves a table block by id at any nesting depth. */
export function findTableBlock(doc: DocumentNode, tableBlockId: string): BlockNode | null {
  const b = getBlockById(doc, tableBlockId);
  if (!b || b.type !== 'table') return null;
  return b;
}

/** Collapsed caret position after deleting a multi-block selection (document or shared cell parent). */
export function getSelectionStartAfterDelete(doc: DocumentNode, sel: BlockSelection): {
  blockId: string;
  offset: number;
} {
  const a = findBlockLocation(doc, sel.anchorBlockId);
  const f = findBlockLocation(doc, sel.focusBlockId);

  if (a && f && a.parentList === f.parentList) {
    const forward =
      a.index < f.index || (a.index === f.index && sel.anchorOffset <= sel.focusOffset);
    return forward
      ? { blockId: sel.anchorBlockId, offset: sel.anchorOffset }
      : { blockId: sel.focusBlockId, offset: sel.focusOffset };
  }

  const anchorIdx = doc.children.findIndex(b => b.id === sel.anchorBlockId);
  const focusIdx = doc.children.findIndex(b => b.id === sel.focusBlockId);
  if (anchorIdx === -1 || focusIdx === -1) {
    return {
      blockId: sel.anchorBlockId,
      offset: Math.min(sel.anchorOffset, sel.focusOffset),
    };
  }
  const forward =
    anchorIdx < focusIdx || (anchorIdx === focusIdx && sel.anchorOffset <= sel.focusOffset);
  return forward
    ? { blockId: sel.anchorBlockId, offset: sel.anchorOffset }
    : { blockId: sel.focusBlockId, offset: sel.focusOffset };
}

export function findTableCell(doc: DocumentNode, tableBlockId: string, cellId: string): TableCell | null {
  const table = findTableBlock(doc, tableBlockId);
  if (!table) return null;
  const data = table.data as TableData;
  for (const row of data.rows) {
    const cell = row.cells.find(c => c.id === cellId);
    if (cell) return cell;
  }
  return null;
}
