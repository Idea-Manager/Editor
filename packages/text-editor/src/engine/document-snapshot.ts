import type { BlockNode, DocumentNode, TableData } from '@core/model/interfaces';

function cloneTextRuns(block: BlockNode): BlockNode['children'] {
  return block.children.map(r => ({
    ...r,
    data: { ...r.data, marks: [...r.data.marks] },
  }));
}

export function cloneTableData(data: TableData): TableData {
  return {
    columnWidths: [...data.columnWidths],
    rows: data.rows.map(row => ({
      ...row,
      cells: row.cells.map(cell => ({
        ...cell,
        style: { ...cell.style },
        blocks: cell.blocks.map(cloneBlockNodeDeep),
      })),
    })),
  };
}

export function cloneBlockNodeDeep(block: BlockNode): BlockNode {
  if (block.type === 'table') {
    return {
      ...block,
      children: cloneTextRuns(block),
      data: cloneTableData(block.data as TableData) as BlockNode['data'],
      meta: block.meta ? { ...block.meta } : undefined,
    };
  }
  return {
    ...block,
    children: cloneTextRuns(block),
    data: { ...block.data },
    meta: block.meta ? { ...block.meta } : undefined,
  };
}

/** Deep snapshot of top-level blocks (including nested table cell blocks). */
export function snapshotDocumentChildren(doc: DocumentNode): BlockNode[] {
  return doc.children.map(cloneBlockNodeDeep);
}

export function restoreDocumentChildren(doc: DocumentNode, snapshot: BlockNode[]): void {
  doc.children.length = 0;
  doc.children.push(...snapshot.map(cloneBlockNodeDeep));
}
