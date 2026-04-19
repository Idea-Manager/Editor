import type { BlockNode, TableData, TableRow, TableCell, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { generateId } from '@core/id';
import { renderInline } from '../inline/inline-renderer';

const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 3;
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 40;

function createCell(): TableCell {
  return {
    id: generateId('cell'),
    content: [{ id: generateId('txt'), type: 'text', data: { text: '', marks: [] } }],
    colspan: 1,
    rowspan: 1,
    absorbed: false,
    style: { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true },
  };
}

function createRow(colCount: number): TableRow {
  return {
    id: generateId('row'),
    cells: Array.from({ length: colCount }, () => createCell()),
  };
}

export class TableBlock implements BlockDefinition<TableData> {
  readonly type = 'table';
  readonly labelKey = 'block.table';
  readonly icon = 'table_chart';

  defaultData(): TableData {
    return {
      rows: Array.from({ length: DEFAULT_ROWS }, () => createRow(DEFAULT_COLS)),
      columnWidths: Array.from({ length: DEFAULT_COLS }, () => DEFAULT_COL_WIDTH),
    };
  }

  render(node: BlockNode<TableData>, _ctx: RenderContext): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-id', node.id);
    wrapper.classList.add('idea-block', 'idea-block--table');

    const tableEl = document.createElement('table');
    tableEl.classList.add('idea-table-block');

    const colgroupEl = document.createElement('colgroup');
    for (const w of node.data.columnWidths) {
      const col = document.createElement('col');
      col.style.width = `${w}px`;
      colgroupEl.appendChild(col);
    }
    tableEl.appendChild(colgroupEl);

    const tbody = document.createElement('tbody');

    for (const row of node.data.rows) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row-id', row.id);

      for (const cell of row.cells) {
        if (cell.absorbed) continue;

        const td = document.createElement('td');
        td.setAttribute('data-cell-id', cell.id);
        td.setAttribute('contenteditable', 'true');
        td.classList.add('idea-table-cell');

        if (cell.colspan > 1) td.colSpan = cell.colspan;
        if (cell.rowspan > 1) td.rowSpan = cell.rowspan;

        td.style.borderTop = cell.style.borderTop ? '1px solid #d4d4d4' : 'none';
        td.style.borderRight = cell.style.borderRight ? '1px solid #d4d4d4' : 'none';
        td.style.borderBottom = cell.style.borderBottom ? '1px solid #d4d4d4' : 'none';
        td.style.borderLeft = cell.style.borderLeft ? '1px solid #d4d4d4' : 'none';

        if (cell.style.background) {
          td.style.backgroundColor = cell.style.background;
        }

        if (cell.content.length > 0) {
          td.appendChild(renderInline(cell.content));
        }

        td.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            this.navigateCell(wrapper, cell.id, e.shiftKey ? 'prev' : 'next');
          }
        });

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    tableEl.appendChild(tbody);

    this.attachColumnResize(tableEl, node);
    this.attachCellSelection(tableEl, node);

    wrapper.appendChild(tableEl);
    return wrapper;
  }

  private navigateCell(wrapper: HTMLElement, currentCellId: string, direction: 'next' | 'prev'): void {
    const cells = Array.from(wrapper.querySelectorAll<HTMLElement>('td[data-cell-id]'));
    const idx = cells.findIndex(c => c.getAttribute('data-cell-id') === currentCellId);
    if (idx === -1) return;

    const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (targetIdx >= 0 && targetIdx < cells.length) {
      const target = cells[targetIdx];
      target.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (target.firstChild) {
        range.selectNodeContents(target);
        range.collapse(false);
      } else {
        range.setStart(target, 0);
        range.collapse(true);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  private attachColumnResize(table: HTMLTableElement, node: BlockNode<TableData>): void {
    const cols = table.querySelectorAll('col');
    const headerCells = table.querySelectorAll('tbody tr:first-child td');

    headerCells.forEach((cell, colIdx) => {
      const resizer = document.createElement('div');
      resizer.classList.add('idea-table-col-resizer');

      let startX = 0;
      let startWidth = 0;

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + diff);
        node.data.columnWidths[colIdx] = newWidth;
        if (cols[colIdx]) {
          (cols[colIdx] as HTMLElement).style.width = `${newWidth}px`;
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        resizer.classList.remove('idea-table-col-resizer--active');
      };

      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startWidth = node.data.columnWidths[colIdx];
        resizer.classList.add('idea-table-col-resizer--active');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      (cell as HTMLElement).style.position = 'relative';
      cell.appendChild(resizer);
    });
  }

  private attachCellSelection(table: HTMLTableElement, node: BlockNode<TableData>): void {
    let selecting = false;
    let startCellId = '';
    let currentCellId = '';

    const getCellPos = (cellId: string): { row: number; col: number } | null => {
      for (let r = 0; r < node.data.rows.length; r++) {
        for (let c = 0; c < node.data.rows[r].cells.length; c++) {
          if (node.data.rows[r].cells[c].id === cellId) return { row: r, col: c };
        }
      }
      return null;
    };

    const clearSelection = () => {
      table.querySelectorAll('.idea-table-cell--selected').forEach(el => {
        el.classList.remove('idea-table-cell--selected');
      });
    };

    const highlightRange = (startId: string, endId: string) => {
      clearSelection();
      const s = getCellPos(startId);
      const e = getCellPos(endId);
      if (!s || !e) return;

      const minR = Math.min(s.row, e.row);
      const maxR = Math.max(s.row, e.row);
      const minC = Math.min(s.col, e.col);
      const maxC = Math.max(s.col, e.col);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = node.data.rows[r].cells[c];
          if (cell.absorbed) continue;
          const td = table.querySelector(`[data-cell-id="${cell.id}"]`);
          td?.classList.add('idea-table-cell--selected');
        }
      }
    };

    table.addEventListener('mousedown', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
      if (!target) return;
      if ((e.target as HTMLElement).classList.contains('idea-table-col-resizer')) return;

      startCellId = target.getAttribute('data-cell-id') ?? '';
      currentCellId = startCellId;
      selecting = true;
      clearSelection();
    });

    table.addEventListener('mousemove', (e) => {
      if (!selecting) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
      if (!target) return;

      const cellId = target.getAttribute('data-cell-id') ?? '';
      if (cellId !== currentCellId) {
        currentCellId = cellId;
        highlightRange(startCellId, currentCellId);
      }
    });

    const onMouseUp = () => {
      selecting = false;
    };

    table.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseup', onMouseUp);
  }

  serialize(node: BlockNode<TableData>): BlockNode<TableData> {
    return {
      id: node.id,
      type: node.type,
      data: {
        columnWidths: [...node.data.columnWidths],
        rows: node.data.rows.map(r => ({
          id: r.id,
          cells: r.cells.map(c => ({
            ...c,
            content: c.content.map(run => ({
              ...run,
              data: { ...run.data, marks: [...run.data.marks] },
            })),
            style: { ...c.style },
          })),
        })),
      },
      children: node.children ?? [],
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<TableData> {
    const obj = raw as BlockNode<TableData>;
    return {
      id: obj.id,
      type: 'table',
      data: {
        columnWidths: [...(obj.data?.columnWidths ?? [DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH])],
        rows: (obj.data?.rows ?? []).map((r: TableRow) => ({
          id: r.id,
          cells: r.cells.map((c: TableCell) => ({
            id: c.id,
            content: (c.content ?? []).map((run: TextRun) => ({
              id: run.id,
              type: 'text' as const,
              data: {
                text: run.data?.text ?? '',
                marks: [...(run.data?.marks ?? [])],
              },
            })),
            colspan: c.colspan ?? 1,
            rowspan: c.rowspan ?? 1,
            absorbed: c.absorbed ?? false,
            style: {
              borderTop: c.style?.borderTop ?? true,
              borderRight: c.style?.borderRight ?? true,
              borderBottom: c.style?.borderBottom ?? true,
              borderLeft: c.style?.borderLeft ?? true,
              background: c.style?.background,
            },
          })),
        })),
      },
      children: [],
      meta: obj.meta ? { ...obj.meta } : undefined,
    };
  }

  onEnter(_node: BlockNode<TableData>, _ctx: EditorContext): Command | null {
    return null;
  }

  onDelete(_node: BlockNode<TableData>, _ctx: EditorContext): Command | null {
    return null;
  }
}
