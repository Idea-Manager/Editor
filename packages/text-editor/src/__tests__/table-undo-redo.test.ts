import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument, createParagraph } from '@core/model/factory';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { TableBlock } from '../blocks/table-block';
import { buildTableData, buildTableDataFromSizePicker } from '../blocks/table-data-factory';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { cloneTableData } from '../engine/document-snapshot';

function tableStylesSnapshot(data: TableData): unknown {
  return data.rows.map(row => row.cells.map(c => ({ ...c.style })));
}

describe('Table undo/redo and picker snapshot', () => {
  const eventBus = new EventBus();

  it('InsertBlockCommand redo restores inside borders and dimensions from picker', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new TableBlock());

    const picker = { rows: 2, cols: 3, borderPreset: 'inside' as const };
    const tableData = buildTableDataFromSizePicker(picker);
    const cmd = new InsertBlockCommand(
      doc,
      doc.children[0].id,
      'table',
      registry,
      tableData as unknown as Record<string, unknown>,
    );

    const undoRedo = new UndoRedoManager(eventBus);
    undoRedo.push(cmd);

    const afterInsert = doc.children[1].data as TableData;
    expect(afterInsert.rows.length).toBe(2);
    expect(afterInsert.columnWidths.length).toBe(3);

    undoRedo.undo();
    expect(doc.children).toHaveLength(1);

    undoRedo.redo();
    const restored = doc.children[1].data as TableData;
    expect(restored.rows.length).toBe(2);
    expect(restored.columnWidths.length).toBe(3);
    expect(tableStylesSnapshot(restored)).toEqual(tableStylesSnapshot(tableData));
  });

  it('ChangeBlockTypeCommand redo restores picker table data', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new TableBlock());

    const blockId = doc.children[0].id;
    const picker = { rows: 2, cols: 2, borderPreset: 'inside' as const };
    const tableData = buildTableDataFromSizePicker(picker);
    const cmd = new ChangeBlockTypeCommand(
      doc,
      blockId,
      'table',
      registry,
      tableData as unknown as Record<string, unknown>,
    );

    const undoRedo = new UndoRedoManager(eventBus);
    undoRedo.push(cmd);

    expect((doc.children[0].data as TableData).rows.length).toBe(2);

    undoRedo.undo();
    expect(doc.children[0].type).toBe('paragraph');

    undoRedo.redo();
    const restored = doc.children[0].data as TableData;
    expect(restored.rows.length).toBe(2);
    expect(tableStylesSnapshot(restored)).toEqual(tableStylesSnapshot(tableData));
  });

  it('InsertRowCommand clones anchor row borders; insert column redo does not duplicate columns', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'inside');
    const table: BlockNode<TableData> = {
      id: 'tbl',
      type: 'table',
      data,
      children: [],
      meta: { createdAt: Date.now(), version: 1 },
    };
    doc.children = [table];

    const anchorStyles = data.rows[0].cells.map(c => ({ ...c.style }));

    const insRow = new InsertRowCommand(doc, table.id, -1, 0);
    const undoRedo = new UndoRedoManager(eventBus);
    undoRedo.push(insRow);

    expect(data.rows).toHaveLength(3);
    const inserted = data.rows[0];
    expect(inserted.cells.map(c => ({ ...c.style }))).toEqual(anchorStyles);

    undoRedo.undo();
    expect(data.rows).toHaveLength(2);

    undoRedo.redo();
    expect(data.rows).toHaveLength(3);

    const colBefore = data.columnWidths.length;
    const insCol = new InsertColumnCommand(doc, table.id, 0, 0);
    undoRedo.push(insCol);
    expect(data.columnWidths.length).toBe(colBefore + 1);

    undoRedo.undo();
    expect(data.columnWidths.length).toBe(colBefore);

    undoRedo.redo();
    expect(data.columnWidths.length).toBe(colBefore + 1);
  });

  it('InsertBlockCommand template deep-clones table data (mutating doc does not mutate redo snapshot)', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new TableBlock());

    const picker = { rows: 2, cols: 2, borderPreset: 'inside' as const };
    const tableData = buildTableDataFromSizePicker(picker);
    const cmd = new InsertBlockCommand(
      doc,
      doc.children[0].id,
      'table',
      registry,
      tableData as unknown as Record<string, unknown>,
    );

    const undoRedo = new UndoRedoManager(eventBus);
    undoRedo.push(cmd);

    const live = doc.children[1].data as TableData;
    live.rows[0].cells[0].style.borderTop = true;

    undoRedo.undo();
    undoRedo.redo();

    const restored = doc.children[1].data as TableData;
    expect(restored.rows[0].cells[0].style.borderTop).toBe(
      tableData.rows[0].cells[0].style.borderTop,
    );
  });

  it('cloneTableData is independent of source for nested style objects', () => {
    const a = buildTableData(1, 1, 'inside');
    const b = cloneTableData(a);
    b.rows[0].cells[0].style.borderTop = true;
    expect(a.rows[0].cells[0].style.borderTop).toBe(false);
  });
});
