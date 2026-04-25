import type { BlockNode, TableData, TableRow, TableCell, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { BlockRegistry } from './block-registry';
import type { RenderContext } from '../engine/render-context';
import type { CellRange } from '../engine/commands/merge-cells-command';
import type { EditorContext } from '../engine/editor-context';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';
import { cloneBlockNodeDeep } from '../engine/document-snapshot';
import { deserializeCellBlocks } from './cell-block-deserialize';
import { collectRenderedBlockListElements } from '../renderer/block-renderer';
import { reconcileChildren } from '../engine/reconciler';
import { DEFAULT_TABLE_COL_WIDTH, defaultTableData } from './table-data-factory';
import { normalizeTableBorders } from './table-border-sync';
import { absorbedSlotCoveredBySameRowColspan, countPrimaryCellsInRange } from './table-range-utils';

const MIN_COL_WEIGHT = 8;

/** Keeps the same table wrapper/grid in the document when layout is unchanged so cell inners (and iframes) are not reparented through a fresh subtree. */
const tableStableRoots = new Map<string, { signature: string; el: HTMLElement }>();

/** Layout-only: column widths excluded so column resize does not force a full rebuild. */
function tableStructureSignature(node: BlockNode<TableData>): string {
  return JSON.stringify({
    borderWidth: node.data.borderWidth,
    rows: node.data.rows.map(r => ({
      id: r.id,
      cells: r.cells.map(c => ({
        id: c.id,
        absorbed: c.absorbed,
        colspan: c.colspan,
        rowspan: c.rowspan,
        style: c.style,
      })),
    })),
  });
}

export function pruneTableStableRoots(presentBlockIds: Set<string>): void {
  for (const id of tableStableRoots.keys()) {
    if (!presentBlockIds.has(id)) {
      tableStableRoots.delete(id);
    }
  }
}

function columnTemplatePercent(weights: number[]): string {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map(w => `${(w / sum) * 100}%`).join(' ');
}

const TABLE_CELL_BORDER_TOP = 'idea-table-cell--border-top';
const TABLE_CELL_BORDER_RIGHT = 'idea-table-cell--border-right';
const TABLE_CELL_BORDER_BOTTOM = 'idea-table-cell--border-bottom';
const TABLE_CELL_BORDER_LEFT = 'idea-table-cell--border-left';

const TABLE_CELL_RANGE_EDGE_TOP = 'idea-table-cell--range-edge-top';
const TABLE_CELL_RANGE_EDGE_RIGHT = 'idea-table-cell--range-edge-right';
const TABLE_CELL_RANGE_EDGE_BOTTOM = 'idea-table-cell--range-edge-bottom';
const TABLE_CELL_RANGE_EDGE_LEFT = 'idea-table-cell--range-edge-left';

/** Clears table cell range-selection UI classes (long-press / context menu). */
export function clearTableCellRangeDomClasses(el: Element): void {
  el.classList.remove(
    'idea-table-cell--selected',
    'idea-table-cell--range-anchor',
    TABLE_CELL_RANGE_EDGE_TOP,
    TABLE_CELL_RANGE_EDGE_RIGHT,
    TABLE_CELL_RANGE_EDGE_BOTTOM,
    TABLE_CELL_RANGE_EDGE_LEFT,
  );
}

function applyTableCellBorderClasses(cellEl: HTMLElement, cell: TableCell): void {
  cellEl.classList.toggle(TABLE_CELL_BORDER_TOP, !!cell.style.borderTop);
  cellEl.classList.toggle(TABLE_CELL_BORDER_RIGHT, !!cell.style.borderRight);
  cellEl.classList.toggle(TABLE_CELL_BORDER_BOTTOM, !!cell.style.borderBottom);
  cellEl.classList.toggle(TABLE_CELL_BORDER_LEFT, !!cell.style.borderLeft);
}

export class TableBlock implements BlockDefinition<TableData> {
  readonly type = 'table';
  readonly labelKey = 'block.table';
  readonly icon = 'table_chart';

  defaultData(): TableData {
    return defaultTableData();
  }

  render(node: BlockNode<TableData>, ctx: RenderContext): HTMLElement {
    const registry = ctx.blockRegistry;
    if (!registry) {
      throw new Error('TableBlock.render requires blockRegistry on RenderContext');
    }

    const sig = tableStructureSignature(node);
    const cached = tableStableRoots.get(node.id);
    if (cached && cached.signature === sig && cached.el.isConnected) {
      if (this.syncTableDom(cached.el, node, ctx, registry)) {
        return cached.el;
      }
      tableStableRoots.delete(node.id);
    } else if (cached) {
      tableStableRoots.delete(node.id);
    }

    const wrapper = this.buildFreshTableDom(node, ctx, registry);
    tableStableRoots.set(node.id, { signature: sig, el: wrapper });
    return wrapper;
  }

  /**
   * Updates grid/cell chrome and reconciles cell inners in place. Returns false if DOM is missing
   * expected cells (caller should rebuild).
   */
  private syncTableDom(
    wrapper: HTMLElement,
    node: BlockNode<TableData>,
    ctx: RenderContext,
    registry: BlockRegistry,
  ): boolean {
    const grid = wrapper.querySelector<HTMLElement>(':scope > .idea-table-block');
    if (!grid) return false;

    const numRows = node.data.rows.length;
    const numCols = node.data.columnWidths.length;
    const weights = node.data.columnWidths;

    grid.style.gridTemplateColumns = columnTemplatePercent(weights);
    grid.style.gridTemplateRows = `repeat(${numRows}, auto)`;
    const w = node.data.borderWidth ?? 1;
    grid.style.setProperty('--idea-table-border-width', `${w}px`);

    grid.querySelectorAll('.idea-table-col-resizer').forEach(el => el.remove());
    grid.querySelectorAll('.idea-table-cell').forEach(el => {
      clearTableCellRangeDomClasses(el);
    });

    const resizerTargets: { el: HTMLElement; boundaryCol: number }[] = [];

    for (let r = 0; r < numRows; r++) {
      let col = 0;
      const rowCells = node.data.rows[r].cells;
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c];
        if (cell.absorbed) {
          if (!absorbedSlotCoveredBySameRowColspan(node.data, r, c)) {
            col++;
          }
          continue;
        }

        const cellEl = grid.querySelector<HTMLElement>(`:scope > [data-cell-id="${CSS.escape(cell.id)}"]`);
        if (!cellEl) return false;

        cellEl.style.gridColumn = `${col + 1} / span ${cell.colspan}`;
        cellEl.style.gridRow = `${r + 1} / span ${cell.rowspan}`;

        applyTableCellBorderClasses(cellEl, cell);

        if (cell.style.background) {
          cellEl.style.backgroundColor = cell.style.background;
        } else {
          cellEl.style.backgroundColor = '';
        }

        let inner = cellEl.querySelector<HTMLElement>(':scope > .idea-table-cell__inner');
        if (!inner) {
          inner = document.createElement('div');
          inner.classList.add('idea-table-cell__inner');
          cellEl.appendChild(inner);
        }

        const cellElements = collectRenderedBlockListElements(registry, cell.blocks, ctx);
        reconcileChildren(inner, cellElements);

        if (r === 0) {
          const cEnd = col + cell.colspan - 1;
          if (cEnd < numCols - 1) {
            resizerTargets.push({ el: cellEl, boundaryCol: cEnd });
          }
        }

        col += cell.colspan;
      }
    }

    this.attachColumnResize(grid, node, resizerTargets);
    if (!grid.dataset.tableSelectionAttached) {
      grid.dataset.tableSelectionAttached = '1';
      this.attachCellSelection(grid, node, ctx);
    }
    return true;
  }

  private buildFreshTableDom(
    node: BlockNode<TableData>,
    ctx: RenderContext,
    registry: BlockRegistry,
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-id', node.id);
    wrapper.classList.add('idea-block', 'idea-block--table');

    const grid = document.createElement('div');
    grid.classList.add('idea-table-block');

    const numRows = node.data.rows.length;
    const numCols = node.data.columnWidths.length;
    const weights = node.data.columnWidths;

    grid.style.gridTemplateColumns = columnTemplatePercent(weights);
    grid.style.gridTemplateRows = `repeat(${numRows}, auto)`;
    const w = node.data.borderWidth ?? 1;
    grid.style.setProperty('--idea-table-border-width', `${w}px`);

    const resizerTargets: { el: HTMLElement; boundaryCol: number }[] = [];

    for (let r = 0; r < numRows; r++) {
      let col = 0;
      const rowCells = node.data.rows[r].cells;
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c];
        if (cell.absorbed) {
          if (!absorbedSlotCoveredBySameRowColspan(node.data, r, c)) {
            col++;
          }
          continue;
        }

        const cellEl = document.createElement('div');
        cellEl.setAttribute('data-cell-id', cell.id);
        cellEl.classList.add('idea-table-cell');
        cellEl.style.gridColumn = `${col + 1} / span ${cell.colspan}`;
        cellEl.style.gridRow = `${r + 1} / span ${cell.rowspan}`;

        applyTableCellBorderClasses(cellEl, cell);

        if (cell.style.background) {
          cellEl.style.backgroundColor = cell.style.background;
        }

        const inner = document.createElement('div');
        inner.classList.add('idea-table-cell__inner');
        const cellElements = collectRenderedBlockListElements(registry, cell.blocks, ctx);
        reconcileChildren(inner, cellElements);
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

    wrapper.appendChild(grid);
    // Selection handlers need grid.parentElement (the wrapper); append grid first.
    grid.dataset.tableSelectionAttached = '1';
    this.attachCellSelection(grid, node, ctx);

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

      cellEl.appendChild(resizer);
    }
  }

  private attachCellSelection(grid: HTMLElement, node: BlockNode<TableData>, ctx: RenderContext): void {
    const eventBus = ctx.eventBus;
    const wrapper = grid.parentElement as HTMLElement;
    const LONG_MS = 480;
    const MOVE_CANCEL_SQ = 8 * 8;

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let pointerDown = false;
    let startX = 0;
    let startY = 0;
    let pendingAnchorId = '';
    let tableSelectActive = false;
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
        clearTableCellRangeDomClasses(el);
      });
    };

    const highlightRange = (anchorId: string, endId: string) => {
      clearSelection();
      const s = getCellPos(anchorId);
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
          const cellEl = grid.querySelector<HTMLElement>(`[data-cell-id="${CSS.escape(cell.id)}"]`);
          if (!cellEl) continue;
          cellEl.classList.add('idea-table-cell--selected');
          if (r === minR) cellEl.classList.add(TABLE_CELL_RANGE_EDGE_TOP);
          if (r === maxR) cellEl.classList.add(TABLE_CELL_RANGE_EDGE_BOTTOM);
          if (c === minC) cellEl.classList.add(TABLE_CELL_RANGE_EDGE_LEFT);
          if (c === maxC) cellEl.classList.add(TABLE_CELL_RANGE_EDGE_RIGHT);
        }
      }
    };

    const clearLongPressTimer = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onDocMoveSelect = (ev: MouseEvent) => {
      if (!tableSelectActive) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cellEl = el?.closest<HTMLElement>('[data-cell-id]');
      if (!cellEl || !grid.contains(cellEl)) return;
      const id = cellEl.getAttribute('data-cell-id') ?? '';
      if (id && id !== currentCellId) {
        currentCellId = id;
        highlightRange(startCellId, currentCellId);
      }
    };

    const endTableRangeInteraction = () => {
      wrapper.classList.remove('idea-block--table--range-select');
      eventBus.emit('table:range-ui', { active: false });
    };

    const startTableRangeInteraction = () => {
      wrapper.classList.add('idea-block--table--range-select');
      window.getSelection()?.removeAllRanges();
      eventBus.emit('table:range-ui', { active: true });
    };

    const onDocUpSelect = (ev: MouseEvent) => {
      if (!tableSelectActive) return;
      tableSelectActive = false;
      document.removeEventListener('mousemove', onDocMoveSelect);
      document.removeEventListener('mouseup', onDocUpSelect);

      const s = getCellPos(startCellId);
      const e = getCellPos(currentCellId);
      if (s && e) {
        const range: CellRange = {
          startRow: Math.min(s.row, e.row),
          startCol: Math.min(s.col, e.col),
          endRow: Math.max(s.row, e.row),
          endCol: Math.max(s.col, e.col),
        };
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const pointerMoved = dx * dx + dy * dy > MOVE_CANCEL_SQ;
        const spanMultipleCells = startCellId !== currentCellId;
        const multiPrimary = countPrimaryCellsInRange(node.data, range) >= 2;
        if (!multiPrimary && !pointerMoved && !spanMultipleCells) {
          clearSelection();
          endTableRangeInteraction();
          return;
        }
        eventBus.emit('table:range-select-end', {
          clientX: ev.clientX,
          clientY: ev.clientY,
          blockId: node.id,
          anchorCellId: startCellId,
          range,
          tableWrapper: wrapper,
        });
      } else {
        clearSelection();
        endTableRangeInteraction();
      }
    };

    const onPendingMove = (ev: MouseEvent) => {
      if (!pointerDown || tableSelectActive) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (dx * dx + dy * dy > MOVE_CANCEL_SQ) {
        clearLongPressTimer();
      }
    };

    const onPendingUp = () => {
      pointerDown = false;
      clearLongPressTimer();
      document.removeEventListener('mousemove', onPendingMove);
      document.removeEventListener('mouseup', onPendingUp, true);
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (!tableSelectActive && !grid.querySelector('.idea-table-cell--selected')) return;
      clearLongPressTimer();
      pointerDown = false;
      tableSelectActive = false;
      document.removeEventListener('mousemove', onDocMoveSelect);
      document.removeEventListener('mouseup', onDocUpSelect);
      document.removeEventListener('mousemove', onPendingMove);
      document.removeEventListener('mouseup', onPendingUp, true);
      clearSelection();
      endTableRangeInteraction();
    };
    document.addEventListener('keydown', onKeyDown);

    const onSelectStart = (e: Event) => {
      if (!wrapper.classList.contains('idea-block--table--range-select')) return;
      if (wrapper.contains(e.target as Node)) e.preventDefault();
    };
    document.addEventListener('selectstart', onSelectStart, true);

    grid.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
      if (!target || !grid.contains(target)) return;
      if ((e.target as HTMLElement).classList.contains('idea-table-col-resizer')) return;

      const cellId = target.getAttribute('data-cell-id') ?? '';
      const inner = target.querySelector<HTMLElement>('.idea-table-cell__inner');
      const onInner = !!(inner && inner.contains(e.target as Node));

      startX = e.clientX;
      startY = e.clientY;
      pendingAnchorId = cellId;
      pointerDown = true;
      tableSelectActive = false;

      if (onInner) {
        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          if (!pointerDown) return;
          document.removeEventListener('mousemove', onPendingMove);
          document.removeEventListener('mouseup', onPendingUp, true);
          tableSelectActive = true;
          startCellId = pendingAnchorId;
          currentCellId = startCellId;
          startTableRangeInteraction();
          clearSelection();
          highlightRange(startCellId, currentCellId);
          document.addEventListener('mousemove', onDocMoveSelect);
          document.addEventListener('mouseup', onDocUpSelect);
        }, LONG_MS);
        document.addEventListener('mousemove', onPendingMove);
        document.addEventListener('mouseup', onPendingUp, { capture: true });
      } else {
        tableSelectActive = true;
        startCellId = cellId;
        currentCellId = cellId;
        startTableRangeInteraction();
        clearSelection();
        highlightRange(startCellId, currentCellId);
        document.addEventListener('mousemove', onDocMoveSelect);
        document.addEventListener('mouseup', onDocUpSelect);
      }
    });
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
        ...(node.data.borderWidth != null ? { borderWidth: node.data.borderWidth } : {}),
      },
      children: node.children ?? [],
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<TableData> {
    const obj = raw as BlockNode<TableData>;
    type LegacyCell = TableCell & { content?: TextRun[] };

    const columnWidths = [
      ...(obj.data?.columnWidths ?? [
        DEFAULT_TABLE_COL_WIDTH,
        DEFAULT_TABLE_COL_WIDTH,
        DEFAULT_TABLE_COL_WIDTH,
      ]),
    ];
    const rows: TableRow[] = (obj.data?.rows ?? []).map((r: TableRow) => ({
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
    }));
    const data: TableData = {
      columnWidths,
      rows,
      ...(obj.data != null && obj.data.borderWidth != null
        ? { borderWidth: obj.data.borderWidth as number }
        : {}),
    };
    // Structural row/column/merge edits also run reconcilers in table-border-sync.
    normalizeTableBorders(data);
    return {
      id: obj.id,
      type: 'table',
      data,
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
