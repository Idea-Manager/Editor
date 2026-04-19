import type { BlockType, TableData, TableRow, TableCell, CellBorderStyle } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { PaletteItem } from '../blocks/block-registry';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { createIcon } from '../../../../src/util/icon';
import { TableSizePicker, type BorderPreset, type TableSizePickerResult } from './table-size-picker';
import { generateId } from '@core/id';

export type SlashPaletteMode = 'change' | 'insert';

export class SlashPalette {
  private overlay: HTMLDivElement | null = null;
  private activeIndex = 0;
  private filterText = '';
  private filteredItems: PaletteItem[] = [];
  private visible = false;
  private blockId: string = '';
  private mode: SlashPaletteMode = 'change';
  private anchorRect: DOMRect | null = null;
  private readonly disposers: (() => void)[] = [];
  private tableSizePicker: TableSizePicker;
  private boundOnClickOutside = (e: MouseEvent) => this.onClickOutside(e);

  constructor(
    private readonly ctx: EditorContext,
    private readonly host: HTMLElement,
  ) {
    this.tableSizePicker = new TableSizePicker(host, ctx.i18n);
    this.attach();
  }

  destroy(): void {
    this.hide();
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onKeydown = (e: KeyboardEvent) => {
      if (this.visible) {
        this.handleNavigationKey(e);
      }
    };

    root.addEventListener('keydown', onKeydown, true);
    this.disposers.push(() => root.removeEventListener('keydown', onKeydown, true));
  }

  show(blockId: string, mode: SlashPaletteMode = 'change', anchorRect?: DOMRect): void {
    if (this.visible) this.hide();

    this.blockId = blockId;
    this.mode = mode;
    this.anchorRect = anchorRect ?? null;
    this.filterText = '';
    this.activeIndex = 0;
    this.visible = true;

    this.filteredItems = this.ctx.blockRegistry.getPaletteItems();
    this.createOverlay();
    this.positionOverlay();
    this.renderItems();

    document.addEventListener('mousedown', this.boundOnClickOutside, true);
  }

  hide(): void {
    document.removeEventListener('mousedown', this.boundOnClickOutside, true);
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.visible = false;
    this.filterText = '';
    this.activeIndex = 0;
    this.anchorRect = null;
  }

  updateFilter(char: string): void {
    if (char === 'Backspace') {
      this.filterText = this.filterText.slice(0, -1);
    } else if (char.length === 1) {
      this.filterText += char;
    }

    const query = this.filterText.toLowerCase();
    this.filteredItems = this.ctx.blockRegistry.getPaletteItems().filter(item =>
      this.ctx.i18n.t(item.labelKey).toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query),
    );

    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.filteredItems.length - 1));
    this.renderItems();
  }

  private handleNavigationKey(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        this.updateHighlight(
          Math.min(this.activeIndex + 1, this.filteredItems.length - 1),
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        this.updateHighlight(Math.max(this.activeIndex - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        this.confirm();
        break;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        break;
    }
  }

  private confirm(): void {
    const selected = this.filteredItems[this.activeIndex];
    if (!selected) {
      this.hide();
      return;
    }

    if (selected.type === 'table') {
      this.showTablePicker();
      return;
    }

    this.applyPaletteItem(selected);
  }

  private applyPaletteItem(item: PaletteItem): void {
    const type = item.type as BlockType;
    const dataOverride = item.dataFactory();

    if (this.mode === 'insert') {
      this.insertBlock(type, dataOverride);
    } else {
      this.changeBlock(type, dataOverride);
    }
    this.hide();
  }

  private changeBlock(type: BlockType, dataOverride?: Record<string, unknown>): void {
    const block = this.ctx.document.children.find(b => b.id === this.blockId);
    if (block) {
      const textLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
      if (textLen > 0) {
        for (const run of block.children) {
          run.data.text = '';
        }
        block.children = [{
          id: block.children[0]?.id ?? '',
          type: 'text',
          data: { text: '', marks: [] },
        }];
      }
    }

    const cmd = new ChangeBlockTypeCommand(
      this.ctx.document,
      this.blockId,
      type,
      this.ctx.blockRegistry,
      dataOverride,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private insertBlock(type: BlockType, dataOverride?: Record<string, unknown>): void {
    const cmd = new InsertBlockCommand(
      this.ctx.document,
      this.blockId,
      type,
      this.ctx.blockRegistry,
      dataOverride,
    );
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.selectionManager.setCollapsed(cmd.getNewBlockId(), 0);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private showTablePicker(): void {
    let pickerAnchor: DOMRect;
    if (this.anchorRect) {
      pickerAnchor = this.anchorRect;
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        pickerAnchor = sel.getRangeAt(0).getBoundingClientRect();
      } else if (this.overlay) {
        pickerAnchor = this.overlay.getBoundingClientRect();
      } else {
        pickerAnchor = new DOMRect(0, 0, 0, 0);
      }
    }

    const blockId = this.blockId;
    const mode = this.mode;
    this.hide();

    this.tableSizePicker.show(
      pickerAnchor,
      (result: TableSizePickerResult) => {
        if (mode === 'insert') {
          this.insertTableBlock(blockId, result);
        } else {
          this.changeToTable(blockId, result);
        }
      },
      () => {},
    );
  }

  private changeToTable(blockId: string, result: TableSizePickerResult): void {
    const block = this.ctx.document.children.find(b => b.id === blockId);
    if (block) {
      const textLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
      if (textLen > 0) {
        block.children = [{
          id: block.children[0]?.id ?? '',
          type: 'text',
          data: { text: '', marks: [] },
        }];
      }
    }

    const cmd = new ChangeBlockTypeCommand(
      this.ctx.document,
      blockId,
      'table',
      this.ctx.blockRegistry,
    );
    this.ctx.undoRedoManager.push(cmd);

    const updatedBlock = this.ctx.document.children.find(b => b.id === blockId);
    if (updatedBlock) {
      updatedBlock.data = this.buildTableData(result);
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private insertTableBlock(afterBlockId: string, result: TableSizePickerResult): void {
    const cmd = new InsertBlockCommand(
      this.ctx.document,
      afterBlockId,
      'table',
      this.ctx.blockRegistry,
    );
    this.ctx.undoRedoManager.push(cmd);

    const newBlock = this.ctx.document.children.find(b => b.id === cmd.getNewBlockId());
    if (newBlock) {
      newBlock.data = this.buildTableData(result);
    }

    this.ctx.selectionManager.setCollapsed(cmd.getNewBlockId(), 0);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private buildTableData(result: TableSizePickerResult): TableData {
    const rows: TableRow[] = Array.from({ length: result.rows }, (_, rowIdx) =>
      ({
        id: generateId('row'),
        cells: Array.from({ length: result.cols }, (__, colIdx) => {
          const style = this.cellBorderForPreset(
            result.borderPreset, rowIdx, colIdx, result.rows, result.cols,
          );
          return {
            id: generateId('cell'),
            content: [{ id: generateId('txt'), type: 'text' as const, data: { text: '', marks: [] as never[] } }],
            colspan: 1,
            rowspan: 1,
            absorbed: false,
            style,
          } satisfies TableCell;
        }),
      } satisfies TableRow),
    );
    return {
      rows,
      columnWidths: Array.from({ length: result.cols }, () => 120),
    };
  }

  private cellBorderForPreset(
    preset: BorderPreset, row: number, col: number,
    totalRows: number, totalCols: number,
  ): CellBorderStyle {
    switch (preset) {
      case 'all':
        return { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true };
      case 'none':
        return { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false };
      case 'outside':
        return {
          borderTop: row === 0, borderRight: col === totalCols - 1,
          borderBottom: row === totalRows - 1, borderLeft: col === 0,
        };
      case 'inside':
        return {
          borderTop: row > 0, borderRight: col < totalCols - 1,
          borderBottom: row < totalRows - 1, borderLeft: col > 0,
        };
      default:
        return { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true };
    }
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-slash-palette');

    this.overlay.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.host.appendChild(this.overlay);
  }

  private positionOverlay(): void {
    if (!this.overlay) return;

    let rect: DOMRect | null = this.anchorRect;

    if (!rect) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        rect = sel.getRangeAt(0).getBoundingClientRect();
      }

      if (!rect || rect.height === 0) {
        const blockEl = this.ctx.rootElement.querySelector(
          `[data-block-id="${this.blockId}"]`,
        );
        if (blockEl) {
          rect = blockEl.getBoundingClientRect();
        }
      }
    }

    if (!rect) {
      this.overlay.style.top = '0px';
      this.overlay.style.left = '0px';
      return;
    }

    const overlay = this.overlay;
    overlay.style.top = `${rect.bottom + 4}px`;
    overlay.style.left = `${rect.left}px`;

    requestAnimationFrame(() => {
      if (!overlay.isConnected) return;
      const overlayRect = overlay.getBoundingClientRect();

      let top = rect!.bottom + 4;
      if (top + overlayRect.height > window.innerHeight) {
        top = rect!.top - overlayRect.height - 4;
      }

      let left = rect!.left;
      left = Math.max(8, Math.min(left, window.innerWidth - overlayRect.width - 8));

      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
    });
  }

  private onClickOutside(e: MouseEvent): void {
    if (this.overlay && !this.overlay.contains(e.target as Node)) {
      this.hide();
    }
  }

  private updateHighlight(newIndex: number): void {
    if (newIndex === this.activeIndex || !this.overlay) return;
    const items = this.overlay.querySelectorAll('.idea-slash-palette__item');
    items[this.activeIndex]?.classList.remove('idea-slash-palette__item--active');
    items[newIndex]?.classList.add('idea-slash-palette__item--active');
    this.activeIndex = newIndex;
  }

  private renderItems(): void {
    if (!this.overlay) return;

    this.overlay.innerHTML = '';

    if (this.filteredItems.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('idea-slash-palette__empty');
      empty.textContent = this.ctx.i18n.t('slash.noResults');
      this.overlay.appendChild(empty);
      return;
    }

    this.filteredItems.forEach((item, i) => {
      const el = document.createElement('div');
      el.classList.add('idea-slash-palette__item');
      if (i === this.activeIndex) {
        el.classList.add('idea-slash-palette__item--active');
      }

      const icon = createIcon(item.icon);
      icon.classList.add('idea-slash-palette__icon');

      const label = document.createElement('span');
      label.classList.add('idea-slash-palette__label');
      label.textContent = this.ctx.i18n.t(item.labelKey);

      el.appendChild(icon);
      el.appendChild(label);

      el.addEventListener('click', () => {
        this.activeIndex = i;
        this.confirm();
      });

      el.addEventListener('mouseenter', () => {
        this.updateHighlight(i);
      });

      this.overlay!.appendChild(el);
    });
  }
}
