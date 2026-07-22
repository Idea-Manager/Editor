import type { BlockType } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { PaletteItem } from '../blocks/block-registry';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { createIcon } from '../icons/create-icon';
import { TableSizePicker, type TableSizePickerResult } from './table-size-picker';
import { showEmbedUrlModal } from './embed-url-modal';
import { embedDataFromUrl } from '../blocks/embed-url';
import { findBlockLocation, getFirstTableCellFirstBlockId } from '../engine/block-locator';
import { buildTableDataFromSizePicker } from '../blocks/table-data-factory';
import type { SlashPaletteOptions } from './toolbar-options';
import { getCollapsedCaretRect } from '../engine/scroll-caret-into-view';
import { overlayViewportPositionNearRect } from './block-gutter-position';

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
  private paletteExcludeTypes: BlockType[] | undefined;
  private scrollHost: HTMLElement | null = null;
  private scrollSyncFrame: number | null = null;
  private scrollResizeObserver: ResizeObserver | null = null;
  private boundOnReposition = () => this.onScrollHostScroll();
  private boundOnWindowScroll: ((e: Event) => void) | null = null;
  private boundOnDocumentScroll: ((e: Event) => void) | null = null;
  private boundOnWindowResize: (() => void) | null = null;

  constructor(
    private readonly ctx: EditorContext,
    private readonly host: HTMLElement,
    private readonly paletteOptions?: SlashPaletteOptions,
  ) {
    this.tableSizePicker = new TableSizePicker(host, ctx.i18n);
    this.attach();
  }

  private applyPaletteFilter(items: PaletteItem[]): PaletteItem[] {
    return this.paletteOptions?.filterItems ? this.paletteOptions.filterItems(items) : items;
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

  show(
    blockId: string,
    mode: SlashPaletteMode = 'change',
    anchorRect?: DOMRect,
    excludeTypes?: BlockType[],
  ): void {
    if (this.visible) this.hide();

    this.blockId = blockId;
    this.mode = mode;
    this.anchorRect = anchorRect ?? null;
    const effectiveExclude = excludeTypes ?? this.paletteOptions?.excludeTypes;
    this.paletteExcludeTypes = effectiveExclude;
    this.filterText = '';
    this.activeIndex = 0;
    this.visible = true;

    this.filteredItems = this.applyPaletteFilter(this.ctx.blockRegistry.getPaletteItems(effectiveExclude));
    this.createOverlay();
    this.attachScrollListener();
    this.renderItems();
    this.positionOverlay();

    document.addEventListener('mousedown', this.boundOnClickOutside, true);
  }

  hide(): void {
    document.removeEventListener('mousedown', this.boundOnClickOutside, true);
    this.detachScrollListener();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.visible = false;
    this.filterText = '';
    this.activeIndex = 0;
    this.anchorRect = null;
    this.paletteExcludeTypes = undefined;
  }

  updateFilter(char: string): void {
    if (char === 'Backspace') {
      this.filterText = this.filterText.slice(0, -1);
    } else if (char.length === 1) {
      this.filterText += char;
    }

    const query = this.filterText.toLowerCase();
    const base = this.applyPaletteFilter(
      this.ctx.blockRegistry.getPaletteItems(this.paletteExcludeTypes),
    );
    this.filteredItems = base.filter(
      item =>
        this.ctx.i18n.t(item.labelKey).toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query),
    );

    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.filteredItems.length - 1));
    this.renderItems();
    this.positionOverlay();
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
      if (this.paletteExcludeTypes?.includes('table')) {
        this.hide();
        return;
      }
      this.showTablePicker();
      return;
    }

    if (selected.type === 'embed') {
      this.showEmbedPicker();
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
    const block = findBlockLocation(this.ctx.document, this.blockId)?.block;
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
    const blockId = this.blockId;
    const mode = this.mode;
    this.hide();

    this.tableSizePicker.show(
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

  private showEmbedPicker(): void {
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

    const mode = this.mode;
    this.hide();

    showEmbedUrlModal(
      this.host,
      this.ctx.i18n,
      pickerAnchor,
      (url) => {
        const dataOverride = embedDataFromUrl(url);
        if (mode === 'insert') {
          this.insertBlock('embed', dataOverride);
        } else {
          this.changeBlock('embed', dataOverride);
        }
      },
      () => {},
    );
  }

  private changeToTable(blockId: string, result: TableSizePickerResult): void {
    const block = findBlockLocation(this.ctx.document, blockId)?.block;
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

    const tableData = buildTableDataFromSizePicker(result);
    const cmd = new ChangeBlockTypeCommand(
      this.ctx.document,
      blockId,
      'table',
      this.ctx.blockRegistry,
      tableData as unknown as Record<string, unknown>,
    );
    this.ctx.undoRedoManager.push(cmd);

    const updatedBlock = findBlockLocation(this.ctx.document, blockId)?.block;
    if (updatedBlock?.type === 'table') {
      const focusId = getFirstTableCellFirstBlockId(updatedBlock);
      if (focusId) this.ctx.selectionManager.setCollapsed(focusId, 0);
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private insertTableBlock(afterBlockId: string, result: TableSizePickerResult): void {
    const tableData = buildTableDataFromSizePicker(result);
    const cmd = new InsertBlockCommand(
      this.ctx.document,
      afterBlockId,
      'table',
      this.ctx.blockRegistry,
      tableData as unknown as Record<string, unknown>,
    );
    this.ctx.undoRedoManager.push(cmd);

    const newBlock = findBlockLocation(this.ctx.document, cmd.getNewBlockId())?.block;
    if (newBlock?.type === 'table') {
      const focusId = getFirstTableCellFirstBlockId(newBlock);
      if (focusId) this.ctx.selectionManager.setCollapsed(focusId, 0);
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-slash-palette');
    const mh = this.paletteOptions?.maxHeightPx;
    if (mh != null && mh > 0) {
      this.overlay.style.maxHeight = `${mh}px`;
      this.overlay.style.overflowY = 'auto';
    }

    this.overlay.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.host.ownerDocument.body.appendChild(this.overlay);
  }

  private attachScrollListener(): void {
    this.scrollHost = this.host;
    const doc = this.scrollHost.ownerDocument;
    const win = doc.defaultView;
    if (!win) return;

    this.scrollHost.addEventListener('scroll', this.boundOnReposition, { passive: true });
    this.boundOnWindowScroll = () => this.onScrollHostScroll();
    this.boundOnDocumentScroll = () => this.onScrollHostScroll();
    this.boundOnWindowResize = () => this.onScrollHostScroll();
    win.addEventListener('scroll', this.boundOnWindowScroll, true);
    doc.addEventListener('scroll', this.boundOnDocumentScroll, true);
    win.addEventListener('resize', this.boundOnWindowResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.scrollResizeObserver = new ResizeObserver(() => this.onScrollHostScroll());
      this.scrollResizeObserver.observe(this.scrollHost);
    }
  }

  private detachScrollListener(): void {
    const doc = this.scrollHost?.ownerDocument;
    const win = doc?.defaultView;
    if (this.scrollSyncFrame != null && win) {
      win.cancelAnimationFrame(this.scrollSyncFrame);
      this.scrollSyncFrame = null;
    }
    this.scrollResizeObserver?.disconnect();
    this.scrollResizeObserver = null;
    this.scrollHost?.removeEventListener('scroll', this.boundOnReposition);
    if (win && this.boundOnWindowScroll) {
      win.removeEventListener('scroll', this.boundOnWindowScroll, true);
    }
    if (doc && this.boundOnDocumentScroll) {
      doc.removeEventListener('scroll', this.boundOnDocumentScroll, true);
    }
    if (win && this.boundOnWindowResize) {
      win.removeEventListener('resize', this.boundOnWindowResize);
    }
    this.boundOnWindowScroll = null;
    this.boundOnDocumentScroll = null;
    this.boundOnWindowResize = null;
    this.scrollHost = null;
  }

  private onScrollHostScroll(): void {
    if (!this.visible) return;
    const win = this.scrollHost?.ownerDocument.defaultView;
    if (!win) return;
    if (this.scrollSyncFrame != null) {
      win.cancelAnimationFrame(this.scrollSyncFrame);
    }
    this.scrollSyncFrame = win.requestAnimationFrame(() => {
      this.scrollSyncFrame = null;
      this.positionOverlay();
    });
  }

  private isCaretInTriggerBlock(): boolean {
    const win = this.ctx.rootElement.ownerDocument.defaultView;
    const sel = win?.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;

    const range = sel.getRangeAt(0);
    if (!this.ctx.rootElement.contains(range.startContainer)) return false;

    const blockEl = (
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement
    )?.closest<HTMLElement>('[data-block-id]');

    return blockEl?.getAttribute('data-block-id') === this.blockId;
  }

  private resolveAnchorRect(): DOMRect | null {
    if (this.isCaretInTriggerBlock()) {
      const caretRect = getCollapsedCaretRect(this.ctx.rootElement);
      if (caretRect) return caretRect;
    }

    const blockEl = this.ctx.rootElement.querySelector(
      `[data-block-id="${this.blockId}"]`,
    );
    if (blockEl) {
      return blockEl.getBoundingClientRect();
    }

    return this.anchorRect;
  }

  private applyOverlayPosition(): void {
    if (!this.overlay) return;

    const scrollHost = this.scrollHost ?? this.host;
    const overlay = this.overlay;

    const place = () => {
      if (!overlay.isConnected) return;
      const anchorRect = this.resolveAnchorRect();
      if (!anchorRect) return;

      const scrollHostRect = scrollHost.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      const { top, left } = overlayViewportPositionNearRect(
        anchorRect,
        overlayRect,
        scrollHostRect,
      );
      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
    };

    place();
    requestAnimationFrame(place);
  }

  private positionOverlay(): void {
    if (!this.overlay) return;
    this.applyOverlayPosition();
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
