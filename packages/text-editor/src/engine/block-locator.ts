import type { BlockNode, BlockSelection, DocumentNode, TableCell, TableData } from '@core/model/interfaces';

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
    const data = child.data as TableData;
    for (const row of data.rows) {
      for (const cell of row.cells) {
        const idx = cell.blocks.findIndex(b => b.id === blockId);
        if (idx !== -1) {
          return {
            block: cell.blocks[idx],
            parentList: cell.blocks,
            index: idx,
            parentKind: 'table-cell',
            tableBlockId: child.id,
            cellId: cell.id,
          };
        }
      }
    }
  }

  return null;
}

export function getBlockById(doc: DocumentNode, blockId: string): BlockNode | null {
  return findBlockLocation(doc, blockId)?.block ?? null;
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
  const table = doc.children.find(b => b.id === tableBlockId && b.type === 'table');
  if (!table) return null;
  const data = table.data as TableData;
  for (const row of data.rows) {
    const cell = row.cells.find(c => c.id === cellId);
    if (cell) return cell;
  }
  return null;
}
