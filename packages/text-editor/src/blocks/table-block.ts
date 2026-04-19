import type { BlockNode, TableData, TableRow, TableCell, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';
import { cloneBlockNodeDeep } from '../engine/document-snapshot';
import { deserializeCellBlocks } from './cell-block-deserialize';
import { appendRenderedBlockList } from '../renderer/block-renderer';

const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 3;
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WEIGHT = 8;

function createCell(): TableCell {
  return {
    id: generateId('cell'),
    blocks: createDefaultCellBlocks(),
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

function columnTemplatePercent(weights: number[]): string {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => `${(w / sum) * 100}%`).join(' ');
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

  render(node: BlockNode<TableData>, ctx: RenderContext): HTMLElement {
    const registry = ctx.blockRegistry;
    if (!registry) {
      throw new Error('TableBlock.render requires blockRegistry on RenderContext');
    }

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-id', node.id);
    wrapper.classList.add('idea-block', 'idea-block--table');

    const grid = document.createElement('div');
    grid.classList.add('idea-table-block');

    const numRows = node.data.rows.length;
    const numCols = node.data.columnWidths.length;
    const weights = node.data.columnWidths;

    grid.style.display = 'grid';
    grid.style.width = '100%';
    grid.style.gridTemplateColumns = columnTemplatePercent(weights);
    grid.style.gridTemplateRows = `repeat(${numRows}, auto)`;

    const resizerTargets: { el: HTMLElement; boundaryCol: number }[] = [];

    for (let r = 0; r < numRows; r++) {
      let col = 0;
      for (const cell of node.data.rows[r].cells) {
        if (cell.absorbed) {
          col++;
          continue;
        }

        const cellEl = document.createElement('div');
        cellEl.setAttribute('data-cell-id', cell.id);
        cellEl.classList.add('idea-table-cell');
        cellEl.style.gridColumn = `${col + 1} / span ${cell.colspan}`;
        cellEl.style.gridRow = `${r + 1} / span ${cell.rowspan}`;

        cellEl.style.borderTop = cell.style.borderTop ? '1px solid #d4d4d4' : 'none';
        cellEl.style.borderRight = cell.style.borderRight ? '1px solid #d4d4d4' : 'none';
        cellEl.style.borderBottom = cell.style.borderBottom ? '1px solid #d4d4d4' : 'none';
        cellEl.style.borderLeft = cell.style.borderLeft ? '1px solid #d4d4d4' : 'none';

        if (cell.style.background) {
          cellEl.style.backgroundColor = cell.style.background;
        }

        const inner = document.createElement('div');
        inner.classList.add('idea-table-cell__inner');
        appendRenderedBlockList(registry, cell.blocks, inner, ctx);
        cellEl.appendChild(inner);

        if (r === 0) {
          const cEnd = col + cell.colspan - 1;
          if (cEnd < numCols - 1) {
            resizerTargets.push({ el: cellEl, boundaryCol: cEnd });
          }
        }

        grid.appendChild(cellEl);
        col += cell.colspan;
      }
    }

    this.attachColumnResize(grid, node, resizerTargets);
    this.attachCellSelection(grid, node);

    wrapper.appendChild(grid);
    return wrapper;
  }

  private attachColumnResize(
    gridEl: HTMLElement,
    node: BlockNode<TableData>,
    resizerTargets: { el: HTMLElement; boundaryCol: number }[],
  ): void {
    for (const { el: cellEl, boundaryCol: i } of resizerTargets) {
      const resizer = document.createElement('div');
      resizer.classList.add('idea-table-col-resizer');
      resizer.setAttribute('contenteditable', 'false');
      resizer.tabIndex = -1;
      resizer.setAttribute('aria-hidden', 'true');

      let startX = 0;
      let startWeights: number[] = [];

      const onMouseMove = (e: MouseEvent) => {
        const diffPx = e.clientX - startX;
        const W = gridEl.getBoundingClientRect().width || 1;
        const weights = node.data.columnWidths;
        const n = weights.length;
        const total = startWeights.reduce((a, b) => a + b, 0) || 1;
        const dW = (diffPx / W) * total;

        if (i < 0 || i >= n - 1) return;

        const rightSum = startWeights.slice(i + 1).reduce((a, b) => a + b, 0);
        if (rightSum <= 0) return;

        const newW = [...startWeights];
        newW[i] = startWeights[i] + dW;
        for (let j = i + 1; j < n; j++) {
          newW[j] = startWeights[j] - dW * (startWeights[j] / rightSum);
        }

        for (let j = i + 1; j < n; j++) {
          if (newW[j] < MIN_COL_WEIGHT) {
            const deficit = MIN_COL_WEIGHT - newW[j];
            newW[j] = MIN_COL_WEIGHT;
            newW[i] -= deficit;
          }
        }
        if (newW[i] < MIN_COL_WEIGHT) {
          newW[i] = MIN_COL_WEIGHT;
        }

        for (let k = 0; k < n; k++) {
          node.data.columnWidths[k] = newW[k];
        }

        gridEl.style.gridTemplateColumns = columnTemplatePercent(node.data.columnWidths);
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
        startWeights = [...node.data.columnWidths];
        resizer.classList.add('idea-table-col-resizer--active');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      cellEl.style.position = 'relative';
      cellEl.appendChild(resizer);
    }
  }

  private attachCellSelection(grid: HTMLElement, node: BlockNode<TableData>): void {
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
      grid.querySelectorAll('.idea-table-cell--selected').forEach(el => {
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
          const cellEl = grid.querySelector(`[data-cell-id="${cell.id}"]`);
          cellEl?.classList.add('idea-table-cell--selected');
        }
      }
    };

    grid.addEventListener('mousedown', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
      if (!target) return;
      if ((e.target as HTMLElement).classList.contains('idea-table-col-resizer')) return;

      startCellId = target.getAttribute('data-cell-id') ?? '';
      currentCellId = startCellId;
      selecting = true;
      clearSelection();
    });

    grid.addEventListener('mousemove', (e) => {
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

    grid.addEventListener('mouseup', onMouseUp);
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
            blocks: c.blocks.map(cloneBlockNodeDeep),
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
    type LegacyCell = TableCell & { content?: TextRun[] };

    return {
      id: obj.id,
      type: 'table',
      data: {
        columnWidths: [...(obj.data?.columnWidths ?? [DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH, DEFAULT_COL_WIDTH])],
        rows: (obj.data?.rows ?? []).map((r: TableRow) => ({
          id: r.id,
          cells: r.cells.map((c: LegacyCell) => ({
            id: c.id,
            blocks: deserializeCellBlocks(c.blocks, c.content),
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
