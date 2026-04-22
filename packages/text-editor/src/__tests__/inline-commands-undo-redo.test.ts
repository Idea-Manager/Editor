/**
 * Verifies local undo/redo for inline + cell styling commands.
 * Note: redo calls `execute()` again, which appends another `operationRecords` entry on some
 * commands — fine for history stacks; validate if a sync layer assumes one record per push.
 */
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createParagraph } from '@core/model/factory';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { SetLinkCommand } from '../inline/set-link-command';
import { SetTextColorCommand } from '../inline/set-text-color-command';
import { SetCellBackgroundCommand } from '../engine/commands/set-cell-background-command';
import { buildTableData } from '../blocks/table-data-factory';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('Inline and cell commands with undo/redo', () => {
  const mgr = new InlineMarkManager();

  it('SetLinkCommand undoes and redoes', () => {
    const doc = createDocument();
    const block = createParagraph('hello');
    doc.children = [block];
    const bus = new EventBus();
    const history = new UndoRedoManager(bus);

    history.push(new SetLinkCommand(block, 0, 5, 'https://example.com', mgr));
    expect(block.children[0].data.href).toBe('https://example.com');

    history.undo();
    expect(block.children[0].data.href).toBeUndefined();

    history.redo();
    expect(block.children[0].data.href).toBe('https://example.com');
  });

  it('SetTextColorCommand undoes and redoes', () => {
    const doc = createDocument();
    const block = createParagraph('hello');
    doc.children = [block];
    const bus = new EventBus();
    const history = new UndoRedoManager(bus);

    history.push(new SetTextColorCommand(block, 0, 5, '#ff0000', mgr));
    expect(block.children[0].data.color).toBe('#ff0000');

    history.undo();
    expect(block.children[0].data.color).toBeUndefined();

    history.redo();
    expect(block.children[0].data.color).toBe('#ff0000');
  });

  it('SetCellBackgroundCommand undoes and redoes', () => {
    const doc = createDocument();
    const data = buildTableData(1, 1, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];
    const cell = data.rows[0].cells[0];
    const bus = new EventBus();
    const history = new UndoRedoManager(bus);

    history.push(new SetCellBackgroundCommand(doc, table.id, cell.id, '#eeeeee'));
    expect(cell.style.background).toBe('#eeeeee');

    history.undo();
    expect(cell.style.background).toBeUndefined();

    history.redo();
    expect(cell.style.background).toBe('#eeeeee');
  });
});
