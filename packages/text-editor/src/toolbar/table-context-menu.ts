import type { TableData } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { DeleteRowCommand } from '../engine/commands/delete-row-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { DeleteColumnCommand } from '../engine/commands/delete-column-command';
import { MergeCellsCommand, type CellRange } from '../engine/commands/merge-cells-command';
import { SplitCellCommand } from '../engine/commands/split-cell-command';
import { ToggleCellBorderCommand, type BorderSide } from '../engine/commands/toggle-cell-border-command';
import { SetCellBackgroundCommand } from '../engine/commands/set-cell-background-command';
import { createIcon } from '../../../../src/util/icon';

interface CellPosition {
  blockId: string;
  rowIndex: number;
  colIndex: number;
  cellId: string;
}

export class TableContextMenu {
  private overlay: HTMLDivElement | null = null;
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

      this.show(e.clientX, e.clientY, pos, tableWrapper);
    };

    root.addEventListener('contextmenu', onContextMenu);
    this.disposers.push(() => root.removeEventListener('contextmenu', onContextMenu));

    const onMouseDown = (e: MouseEvent) => {
      if (this.overlay && !this.overlay.contains(e.target as Node)) {
        this.hide();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    this.disposers.push(() => document.removeEventListener('mousedown', onMouseDown));
  }

  private resolveCellPosition(blockId: string, cellId: string): CellPosition | null {
    const block = this.ctx.document.children.find(b => b.id === blockId);
    if (!block || block.type !== 'table') return null;

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

  private getSelectedCellRange(tableEl: HTMLElement): CellRange | null {
    const selected = tableEl.querySelectorAll('.idea-table-cell--selected');
    if (selected.length < 2) return null;

    const blockId = tableEl.getAttribute('data-block-id')!;
    const block = this.ctx.document.children.find(b => b.id === blockId);
    if (!block || block.type !== 'table') return null;

    const data = block.data as TableData;
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;

    selected.forEach(el => {
      const cellId = el.getAttribute('data-cell-id');
      for (let r = 0; r < data.rows.length; r++) {
        for (let c = 0; c < data.rows[r].cells.length; c++) {
          if (data.rows[r].cells[c].id === cellId) {
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
          }
        }
      }
    });

    if (maxR < 0) return null;
    return { startRow: minR, startCol: minC, endRow: maxR, endCol: maxC };
  }

  private show(x: number, y: number, pos: CellPosition, tableEl: HTMLElement): void {
    this.hide();

    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-table-ctx-menu');

    const block = this.ctx.document.children.find(b => b.id === pos.blockId);
    const data = block?.data as TableData | undefined;
    const cell = data?.rows[pos.rowIndex]?.cells[pos.colIndex];
    const isMerged = cell && (cell.colspan > 1 || cell.rowspan > 1);
    const cellRange = this.getSelectedCellRange(tableEl);

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    const items: { label: string; action: () => void; disabled?: boolean }[] = [
      { label: t('table.insertRowAbove'), action: () => this.exec(new InsertRowCommand(this.ctx.document, pos.blockId, pos.rowIndex - 1)) },
      { label: t('table.insertRowBelow'), action: () => this.exec(new InsertRowCommand(this.ctx.document, pos.blockId, pos.rowIndex)) },
      { label: t('table.deleteRow'), action: () => this.exec(new DeleteRowCommand(this.ctx.document, pos.blockId, pos.rowIndex)), disabled: (data?.rows.length ?? 0) <= 1 },
      { label: '---', action: () => {} },
      { label: t('table.insertColumnLeft'), action: () => this.exec(new InsertColumnCommand(this.ctx.document, pos.blockId, pos.colIndex - 1)) },
      { label: t('table.insertColumnRight'), action: () => this.exec(new InsertColumnCommand(this.ctx.document, pos.blockId, pos.colIndex)) },
      { label: t('table.deleteColumn'), action: () => this.exec(new DeleteColumnCommand(this.ctx.document, pos.blockId, pos.colIndex)), disabled: (data?.columnWidths.length ?? 0) <= 1 },
      { label: '---', action: () => {} },
      { label: t('table.mergeCells'), action: () => { if (cellRange) this.exec(new MergeCellsCommand(this.ctx.document, pos.blockId, cellRange)); }, disabled: !cellRange },
      { label: t('table.splitCell'), action: () => this.exec(new SplitCellCommand(this.ctx.document, pos.blockId, pos.cellId)), disabled: !isMerged },
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

    if (cell) {
      this.appendSeparator();
      this.appendBorderToggles(pos, cell.style);
      this.appendSeparator();
      this.appendBackgroundPicker(pos, cell.style.background);
    }

    this.overlay.style.left = `${x}px`;
    this.overlay.style.top = `${y}px`;
    this.host.appendChild(this.overlay);

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
    pos: CellPosition,
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

    for (const { side, icon, title, active } of sides) {
      const btn = document.createElement('button');
      btn.classList.add('idea-table-ctx-menu__border-btn');
      if (active) btn.classList.add('idea-table-ctx-menu__border-btn--active');
      btn.title = title;
      btn.appendChild(createIcon(icon));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.exec(new ToggleCellBorderCommand(this.ctx.document, pos.blockId, pos.cellId, side));
        btn.classList.toggle('idea-table-ctx-menu__border-btn--active');
      });

      row.appendChild(btn);
    }

    this.overlay.appendChild(row);
  }

  private appendBackgroundPicker(pos: CellPosition, currentBg: string | undefined): void {
    if (!this.overlay) return;

    const label = document.createElement('div');
    label.classList.add('idea-table-ctx-menu__section-label');
    label.textContent = this.ctx.i18n.t('table.background');
    this.overlay.appendChild(label);

    const row = document.createElement('div');
    row.classList.add('idea-table-ctx-menu__color-row');

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
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

      const isActive = (currentBg ?? undefined) === value ||
        (!currentBg && value === undefined);
      if (isActive) {
        swatch.classList.add('idea-table-ctx-menu__color-swatch--active');
      }

      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.exec(new SetCellBackgroundCommand(this.ctx.document, pos.blockId, pos.cellId, value));
        row.querySelectorAll('.idea-table-ctx-menu__color-swatch').forEach(s =>
          s.classList.remove('idea-table-ctx-menu__color-swatch--active'),
        );
        swatch.classList.add('idea-table-ctx-menu__color-swatch--active');
      });

      row.appendChild(swatch);
    }

    this.overlay.appendChild(row);
  }

  private hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private exec(cmd: import('@core/commands/command').Command): void {
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }
}
