import { generateId } from '@core/id';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument, createParagraph } from '@core/model/factory';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { TableBlock } from '../blocks/table-block';
import { buildTableData } from '../blocks/table-data-factory';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { MergeCellsCommand } from '../engine/commands/merge-cells-command';
import { ToggleCellBorderCommand } from '../engine/commands/toggle-cell-border-command';
import { findBlockLocation } from '../engine/block-locator';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('Table insert and merge guards', () => {
  it('InsertBlockCommand uses empty children for table blocks', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new TableBlock());

    const cmd = new InsertBlockCommand(doc, doc.children[0].id, 'table', registry);
    cmd.execute();

    const inserted = doc.children.find(b => b.id === cmd.getNewBlockId());
    expect(inserted?.type).toBe('table');
    expect(inserted?.children).toEqual([]);
  });

  it('InsertRowCommand does not change row count when the table has merged cells', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    }).execute();

    const rowCount = (table.data as TableData).rows.length;
    new InsertRowCommand(doc, table.id, 0).execute();
    expect((table.data as TableData).rows.length).toBe(rowCount);
  });

  it('findBlockLocation finds blocks inside a nested table', () => {
    const doc = createDocument();
    const inner = buildTableData(1, 1, 'all');
    const innerTable = tableBlockFromData(inner);
    const innerPara = inner.rows[0].cells[0].blocks[0];

    const outerData = buildTableData(1, 1, 'all');
    outerData.rows[0].cells[0].blocks = [innerTable];
    const outerTable = tableBlockFromData(outerData);
    doc.children = [outerTable];

    const loc = findBlockLocation(doc, innerPara.id);
    expect(loc).not.toBeNull();
    expect(loc?.block.id).toBe(innerPara.id);
    expect(loc?.tableBlockId).toBe(innerTable.id);
  });

  it('ToggleCellBorderCommand mirrors bottom border to neighbor cell top', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    const topLeft = data.rows[0].cells[0];
    const bottomLeft = data.rows[1].cells[0];
    expect(topLeft.style.borderBottom).toBe(true);
    expect(bottomLeft.style.borderTop).toBe(true);

    new ToggleCellBorderCommand(doc, table.id, topLeft.id, 'borderBottom').execute();
    expect(topLeft.style.borderBottom).toBe(false);
    expect(bottomLeft.style.borderTop).toBe(false);
  });
});
