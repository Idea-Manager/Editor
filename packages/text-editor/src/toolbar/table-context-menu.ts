import type { TableData, TableCell } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import { findTableBlock } from '../engine/block-locator';
import { countPrimaryCellsInRange, primaryCellIdsInRange } from '../blocks/table-range-utils';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { DeleteRowCommand } from '../engine/commands/delete-row-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { DeleteColumnCommand } from '../engine/commands/delete-column-command';
import { MergeCellsCommand, type CellRange } from '../engine/commands/merge-cells-command';
import { ToggleCellBorderCommand, type BorderSide } from '../engine/commands/toggle-cell-border-command';
import { ToggleCellBorderSelectionCommand } from '../engine/commands/toggle-cell-border-selection-command';
import { SetCellBackgroundCommand } from '../engine/commands/set-cell-background-command';
import { SetCellsBackgroundCommand } from '../engine/commands/set-cells-background-command';
import { createIcon } from '../../../../src/util/icon';
import { ColorPicker } from '@shared/components/color-picker';

interface CellPosition {
  blockId: string;
  rowIndex: number;
  colIndex: number;
  cellId: string;
}

export interface TableRangeSelectEndPayload {
  clientX: number;
  clientY: number;
  blockId: string;
  /** Cell where the range gesture started (structure ops use this, not range min/max). */
  anchorCellId: string;
  range: CellRange;
  tableWrapper: HTMLElement;
}

const PRESET_CELL_BACKGROUNDS = new Set<string | undefined>([
  undefined,
  '#fafafa',
  '#f5f5f5',
  '#e5e5e5',
  '#d4d4d4',
]);

function normalizeCellBackground(bg: string | undefined): string | undefined {
  if (bg === undefined || bg === '') return undefined;
  return bg.toLowerCase();
}

function isPresetCellBackground(bg: string | undefined): boolean {
  return PRESET_CELL_BACKGROUNDS.has(normalizeCellBackground(bg));
}

function clearTableCellDomSelection(tableWrapper: HTMLElement): void {
  tableWrapper.querySelectorAll('.idea-table-cell--selected').forEach(el => {
    el.classList.remove('idea-table-cell--selected', 'idea-table-cell--range-anchor');
  });
}

export class TableContextMenu {
  private overlay: HTMLDivElement | null = null;
  private colorPicker: ColorPicker | null = null;
  /** Table wrapper whose cell highlights / range-select class we clear when the menu closes. */
  private menuTableWrapper: HTMLElement | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly ctx: EditorContext,
    private readonly host: HTMLElement,
  ) {
    this.attach();
  }

  destroy(): void {
    this.hide();
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onContextMenu = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell-id]');
      if (!target) return;

      const tableWrapper = target.closest<HTMLElement>('[data-block-id]');
      if (!tableWrapper) return;

      e.preventDefault();
      const pos = this.resolveCellPosition(tableWrapper.getAttribute('data-block-id')!, target.getAttribute('data-cell-id')!);
      if (!pos) return;

      clearTableCellDomSelection(tableWrapper);
      this.show(e.clientX, e.clientY, pos, tableWrapper);
    };

    root.addEventListener('contextmenu', onContextMenu);
    this.disposers.push(() => root.removeEventListener('contextmenu', onContextMenu));

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideMenu = this.overlay && !this.overlay.contains(target);
      const outsidePicker = !this.colorPicker?.element?.contains(target);
      if (outsideMenu && outsidePicker) {
        this.hide();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    this.disposers.push(() => document.removeEventListener('mousedown', onMouseDown));

    this.disposers.push(
      this.ctx.eventBus.on('table:range-select-end', (payload: TableRangeSelectEndPayload) => {
        this.showForRange(
          payload.clientX,
          payload.clientY,
          payload.blockId,
          payload.anchorCellId,
          payload.range,
          payload.tableWrapper,
        );
      }),
    );
  }

  private resolveCellPosition(blockId: string, cellId: string): CellPosition | null {
    const block = findTableBlock(this.ctx.document, blockId);
    if (!block) return null;

    const data = block.data as TableData;
    for (let r = 0; r < data.rows.length; r++) {
      for (let c = 0; c < data.rows[r].cells.length; c++) {
        if (data.rows[r].cells[c].id === cellId) {
          return { blockId, rowIndex: r, colIndex: c, cellId };
        }
      }
    }
    return null;
  }

  private showForRange(
    x: number,
    y: number,
    blockId: string,
    anchorCellId: string,
    range: CellRange,
    tableEl: HTMLElement,
  ): void {
    const block = findTableBlock(this.ctx.document, blockId);
    const data = block?.data as TableData | undefined;
    if (!block || !data) {
      this.cleanupTableRangeVisuals(tableEl);
      return;
    }

    const pos = this.resolveCellPosition(blockId, anchorCellId);
    if (!pos) {
      this.cleanupTableRangeVisuals(tableEl);
      return;
    }

    this.renderMenu(x, y, tableEl, pos, range, data);
  }

  private cleanupTableRangeVisuals(tableWrapper: HTMLElement): void {
    clearTableCellDomSelection(tableWrapper);
    tableWrapper.classList.remove('idea-block--table--range-select');
    this.ctx.eventBus.emit('table:range-ui', { active: false });
  }

  private show(x: number, y: number, pos: CellPosition, tableEl: HTMLElement): void {
    const block = findTableBlock(this.ctx.document, pos.blockId);
    const data = block?.data as TableData | undefined;
    if (!data) return;

    const range: CellRange = {
      startRow: pos.rowIndex,
      endRow: pos.rowIndex,
      startCol: pos.colIndex,
      endCol: pos.colIndex,
    };

    this.renderMenu(x, y, tableEl, pos, range, data);
  }

  private renderMenu(
    x: number,
    y: number,
    tableEl: HTMLElement,
    pos: CellPosition,
    range: CellRange,
    data: TableData,
  ): void {
    this.clearColorPicker();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.menuTableWrapper && this.menuTableWrapper !== tableEl) {
      clearTableCellDomSelection(this.menuTableWrapper);
      this.menuTableWrapper.classList.remove('idea-block--table--range-select');
      this.menuTableWrapper = null;
      this.ctx.eventBus.emit('table:range-ui', { active: false });
    }

    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-table-ctx-menu');

    const primaryCount = countPrimaryCellsInRange(data, range);
    const anchorRow = pos.rowIndex;
    const anchorCol = pos.colIndex;

    const cellIds = primaryCellIdsInRange(data, range);
    const anchorPrimary: TableCell | undefined = data.rows[pos.rowIndex]?.cells.find(
      c => c.id === pos.cellId && !c.absorbed,
    );
    const anchorCell = anchorPrimary;

    const topLeft = data.rows[range.startRow]?.cells[range.startCol];
    const canMerge = primaryCount >= 2 && !!topLeft && !topLeft.absorbed;

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    const doc = this.ctx.document;
    const bid = pos.blockId;

    const deleteRowsDisabled = data.rows.length <= 1;
    const deleteColsDisabled = data.columnWidths.length <= 1;

    const items: { label: string; action: () => void; disabled?: boolean }[] = [
      {
        label: t('table.insertRowAbove'),
        action: () => this.exec(new InsertRowCommand(doc, bid, anchorRow - 1, anchorRow)),
        disabled: false,
      },
      {
        label: t('table.insertRowBelow'),
        action: () => this.exec(new InsertRowCommand(doc, bid, anchorRow, anchorRow)),
        disabled: false,
      },
      {
        label: t('table.deleteRow'),
        action: () => this.exec(new DeleteRowCommand(doc, bid, anchorRow)),
        disabled: deleteRowsDisabled,
      },
      { label: '---', action: () => {} },
      {
        label: t('table.insertColumnLeft'),
        action: () => this.exec(new InsertColumnCommand(doc, bid, anchorCol - 1, anchorCol)),
        disabled: false,
      },
      {
        label: t('table.insertColumnRight'),
        action: () => this.exec(new InsertColumnCommand(doc, bid, anchorCol, anchorCol)),
        disabled: false,
      },
      {
        label: t('table.deleteColumn'),
        action: () => this.exec(new DeleteColumnCommand(doc, bid, anchorCol)),
        disabled: deleteColsDisabled,
      },
      { label: '---', action: () => {} },
      {
        label: t('table.mergeCells'),
        action: () => this.exec(new MergeCellsCommand(doc, bid, range)),
        disabled: !canMerge,
      },
    ];

    for (const item of items) {
      if (item.label === '---') {
        const sep = document.createElement('div');
        sep.classList.add('idea-table-ctx-menu__separator');
        this.overlay.appendChild(sep);
        continue;
      }

      const btn = document.createElement('button');
      btn.classList.add('idea-table-ctx-menu__item');
      btn.textContent = item.label;
      if (item.disabled) {
        btn.classList.add('idea-table-ctx-menu__item--disabled');
      } else {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          item.action();
          this.hide();
        });
      }
      this.overlay.appendChild(btn);
    }

    if (anchorCell) {
      this.appendSeparator();
      this.appendBorderToggles(bid, cellIds, anchorCell.style);
      this.appendSeparator();
      this.appendBackgroundPicker(bid, cellIds, anchorCell.style.background);
    }

    this.overlay.style.left = `${x}px`;
    this.overlay.style.top = `${y}px`;
    this.host.appendChild(this.overlay);

    this.menuTableWrapper = tableEl;
    this.ctx.eventBus.emit('table:range-ui', { active: true });

    requestAnimationFrame(() => {
      if (!this.overlay) return;
      const rect = this.overlay.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.overlay.style.left = `${window.innerWidth - rect.width - 8}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.overlay.style.top = `${window.innerHeight - rect.height - 8}px`;
      }
    });
  }

  private appendSeparator(): void {
    if (!this.overlay) return;
    const sep = document.createElement('div');
    sep.classList.add('idea-table-ctx-menu__separator');
    this.overlay.appendChild(sep);
  }

  private appendBorderToggles(
    blockId: string,
    cellIds: string[],
    style: { borderTop: boolean; borderRight: boolean; borderBottom: boolean; borderLeft: boolean },
  ): void {
    if (!this.overlay) return;

    const label = document.createElement('div');
    label.classList.add('idea-table-ctx-menu__section-label');
    label.textContent = this.ctx.i18n.t('table.cellBorders');
    this.overlay.appendChild(label);

    const row = document.createElement('div');
    row.classList.add('idea-table-ctx-menu__border-row');

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    const sides: { side: BorderSide; icon: string; title: string; active: boolean }[] = [
      { side: 'borderTop', icon: 'border_top', title: t('table.borderTop'), active: style.borderTop },
      { side: 'borderRight', icon: 'border_right', title: t('table.borderRight'), active: style.borderRight },
      { side: 'borderBottom', icon: 'border_bottom', title: t('table.borderBottom'), active: style.borderBottom },
      { side: 'borderLeft', icon: 'border_left', title: t('table.borderLeft'), active: style.borderLeft },
    ];

    const doc = this.ctx.document;

    for (const { side, icon, title, active } of sides) {
      const btn = document.createElement('button');
      btn.classList.add('idea-table-ctx-menu__border-btn');
      if (active) btn.classList.add('idea-table-ctx-menu__border-btn--active');
      btn.title = title;
      btn.appendChild(createIcon(icon));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cellIds.length <= 1) {
          this.exec(new ToggleCellBorderCommand(doc, blockId, cellIds[0]!, side));
        } else {
          this.exec(new ToggleCellBorderSelectionCommand(doc, blockId, cellIds, side));
        }
        btn.classList.toggle('idea-table-ctx-menu__border-btn--active');
      });

      row.appendChild(btn);
    }

    this.overlay.appendChild(row);
  }

  private appendBackgroundPicker(blockId: string, cellIds: string[], currentBg: string | undefined): void {
    if (!this.overlay) return;

    const label = document.createElement('div');
    label.classList.add('idea-table-ctx-menu__section-label');
    label.textContent = this.ctx.i18n.t('table.background');
    this.overlay.appendChild(label);

    const row = document.createElement('div');
    row.classList.add('idea-table-ctx-menu__color-row');

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    const doc = this.ctx.document;
    const applyBg = (value: string | undefined) => {
      if (cellIds.length <= 1) {
        this.exec(new SetCellBackgroundCommand(doc, blockId, cellIds[0]!, value));
      } else {
        this.exec(new SetCellsBackgroundCommand(doc, blockId, cellIds, value));
      }
    };

    const colors = [
      { value: undefined, hex: '#ffffff', title: t('table.bgNone') },
      { value: '#fafafa', hex: '#fafafa', title: t('table.bgGray50') },
      { value: '#f5f5f5', hex: '#f5f5f5', title: t('table.bgGray100') },
      { value: '#e5e5e5', hex: '#e5e5e5', title: t('table.bgGray200') },
      { value: '#d4d4d4', hex: '#d4d4d4', title: t('table.bgGray300') },
    ];

    for (const { value, hex, title } of colors) {
      const swatch = document.createElement('button');
      swatch.classList.add('idea-table-ctx-menu__color-swatch');
      swatch.style.backgroundColor = hex;
      swatch.title = title;

      const isActive = (currentBg ?? undefined) === value || (!currentBg && value === undefined);
      if (isActive) {
        swatch.classList.add('idea-table-ctx-menu__color-swatch--active');
      }

      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearColorPicker();
        applyBg(value);
        row.querySelectorAll('.idea-table-ctx-menu__color-swatch').forEach(s =>
          s.classList.remove('idea-table-ctx-menu__color-swatch--active'),
        );
        swatch.classList.add('idea-table-ctx-menu__color-swatch--active');
      });

      row.appendChild(swatch);
    }

    const customSwatch = document.createElement('button');
    customSwatch.type = 'button';
    customSwatch.classList.add(
      'idea-table-ctx-menu__color-swatch',
      'idea-table-ctx-menu__color-swatch--custom',
    );
    customSwatch.title = t('colorPicker.custom');
    if (!isPresetCellBackground(currentBg)) {
      customSwatch.classList.add('idea-table-ctx-menu__color-swatch--active');
      if (currentBg) {
        customSwatch.style.backgroundColor = currentBg;
      }
    }

    customSwatch.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearColorPicker();
      const picker = new ColorPicker();
      this.colorPicker = picker;
      picker.show({
        anchorX: e.clientX,
        anchorY: e.clientY,
        initialColor: currentBg?.trim() || 'rgba(0,0,0,0)',
        initialColorParseAs: 'background',
        labels: {
          select: t('colorPicker.select'),
          cancel: t('colorPicker.cancel'),
        },
        onSelect: (color) => {
          applyBg(color);
          row.querySelectorAll('.idea-table-ctx-menu__color-swatch').forEach(s =>
            s.classList.remove('idea-table-ctx-menu__color-swatch--active'),
          );
          customSwatch.classList.add('idea-table-ctx-menu__color-swatch--active');
          customSwatch.style.backgroundColor = color;
          this.clearColorPicker();
        },
        onCancel: () => {
          this.clearColorPicker();
        },
      });
    });

    row.appendChild(customSwatch);

    this.overlay.appendChild(row);
  }

  private hide(): void {
    this.clearColorPicker();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.menuTableWrapper) {
      clearTableCellDomSelection(this.menuTableWrapper);
      this.menuTableWrapper.classList.remove('idea-block--table--range-select');
      this.menuTableWrapper = null;
    }
    this.ctx.eventBus.emit('table:range-ui', { active: false });
  }

  private clearColorPicker(): void {
    this.colorPicker?.hide();
    this.colorPicker = null;
  }

  private exec(cmd: import('@core/commands/command').Command): void {
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }
}
