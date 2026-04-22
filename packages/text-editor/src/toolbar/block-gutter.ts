import type { BlockType } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { SlashPalette } from './slash-palette';
import { BlockTypeMenu } from './block-type-menu';
import { TableSizePicker, type TableSizePickerResult } from './table-size-picker';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { MoveBlockCommand } from '../engine/commands/move-block-command';
import { createIcon } from '../../../../src/util/icon';
import { findBlockLocation, getFirstTableCellFirstBlockId } from '../engine/block-locator';
import { buildTableDataFromSizePicker } from '../blocks/table-data-factory';

export class BlockGutter {
  private gutterEl: HTMLDivElement | null = null;
  private dragBtn: HTMLButtonElement | null = null;
  private hoveredBlockId: string | null = null;
  private blockTypeMenu: BlockTypeMenu;
  private tableSizePicker: TableSizePicker;
  private slashPalette: SlashPalette | null = null;
  private dragBlockId: string | null = null;
  private dropIndicator: HTMLDivElement | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly ctx: EditorContext,
    private readonly host: HTMLElement,
  ) {
    this.blockTypeMenu = new BlockTypeMenu(ctx.blockRegistry, host, ctx.i18n);
    this.tableSizePicker = new TableSizePicker(host, ctx.i18n);
    this.createGutter();
    this.attach();
  }

  setSlashPalette(palette: SlashPalette): void {
    this.slashPalette = palette;
  }

  destroy(): void {
    this.blockTypeMenu.hide();
    this.tableSizePicker.hide();
    this.removeGutter();
    this.removeDropIndicator();
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  private createGutter(): void {
    this.gutterEl = document.createElement('div');
    this.gutterEl.classList.add('idea-block-gutter');

    const addBtn = document.createElement('button');
    addBtn.classList.add('idea-block-gutter__btn');
    addBtn.title = this.ctx.i18n.t('gutter.addBlock');
    addBtn.appendChild(createIcon('add'));
    addBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSlashPalette(addBtn);
    });

    const dragBtn = document.createElement('button');
    this.dragBtn = dragBtn;
    dragBtn.classList.add('idea-block-gutter__btn', 'idea-block-gutter__btn--drag');
    dragBtn.title = this.ctx.i18n.t('gutter.dragToReorder');
    dragBtn.setAttribute('draggable', 'true');
    dragBtn.appendChild(createIcon('drag_indicator'));
    dragBtn.addEventListener('dragstart', (e) => this.onDragStart(e));
    dragBtn.addEventListener('dragend', () => this.onDragEnd());

    this.gutterEl.appendChild(addBtn);
    this.gutterEl.appendChild(dragBtn);

    this.host.appendChild(this.gutterEl);
    this.gutterEl.classList.add('idea-block-gutter--hidden');
  }

  private removeGutter(): void {
    if (this.gutterEl) {
      this.gutterEl.remove();
      this.gutterEl = null;
    }
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onMousemove = (e: MouseEvent) => {
      if (this.blockTypeMenu.isVisible() || this.tableSizePicker.isVisible() || this.slashPalette?.isVisible()) return;
      if (this.dragBlockId) return;

      const target = e.target as HTMLElement;

      // Always anchor the gutter to the nearest table block when the pointer is anywhere inside
      // that table (cells, nested blocks). Avoids flicker from resolving nested [data-block-id]
      // vs the table wrapper.
      const tableWrapper = target.closest<HTMLElement>('.idea-block--table');
      if (tableWrapper) {
        const tableBlockId = tableWrapper.getAttribute('data-block-id');
        if (tableBlockId && tableBlockId !== this.hoveredBlockId) {
          this.hoveredBlockId = tableBlockId;
          this.updateGutter();
        }
        return;
      }

      const blockEl = this.findBlockElement(target);
      if (blockEl) {
        const blockId = blockEl.getAttribute('data-block-id')
          ?? blockEl.getAttribute('data-list-wrapper');
        if (blockId && blockId !== this.hoveredBlockId) {
          this.hoveredBlockId = blockId;
          this.updateGutter();
        }
      }
    };

    const onMouseleave = (e: MouseEvent) => {
      if (this.blockTypeMenu.isVisible() || this.tableSizePicker.isVisible() || this.slashPalette?.isVisible()) return;
      const related = e.relatedTarget as HTMLElement | null;
      if (related && this.gutterEl?.contains(related)) return;
      this.hoveredBlockId = null;
      this.updateGutter();
    };

    const onGutterMouseleave = (e: MouseEvent) => {
      if (this.blockTypeMenu.isVisible() || this.tableSizePicker.isVisible() || this.slashPalette?.isVisible()) return;
      const related = e.relatedTarget as HTMLElement | null;
      if (related && root.contains(related)) return;
      this.hoveredBlockId = null;
      this.updateGutter();
    };

    root.addEventListener('mousemove', onMousemove);
    root.addEventListener('mouseleave', onMouseleave);
    this.gutterEl?.addEventListener('mouseleave', onGutterMouseleave);

    const onDragover = (e: DragEvent) => this.onDragOver(e);
    const onDrop = (e: DragEvent) => this.onDrop(e);

    this.host.addEventListener('dragover', onDragover);
    this.host.addEventListener('drop', onDrop);

    this.disposers.push(
      () => root.removeEventListener('mousemove', onMousemove),
      () => root.removeEventListener('mouseleave', onMouseleave),
      () => this.gutterEl?.removeEventListener('mouseleave', onGutterMouseleave),
      () => this.host.removeEventListener('dragover', onDragover),
      () => this.host.removeEventListener('drop', onDrop),
    );
  }

  private findBlockElement(target: HTMLElement): HTMLElement | null {
    const blockEl = target.closest<HTMLElement>('[data-block-id]');
    if (blockEl) return blockEl;
    const listWrapper = target.closest<HTMLElement>('[data-list-wrapper]');
    if (listWrapper) return listWrapper;
    return null;
  }

  private findBlockByY(clientY: number): HTMLElement | null {
    const blocks = this.ctx.rootElement.querySelectorAll<HTMLElement>(
      '[data-block-id], [data-list-wrapper]',
    );
    let closest: HTMLElement | null = null;
    let minDist = Infinity;

    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      const dist = clientY < rect.top
        ? rect.top - clientY
        : clientY > rect.bottom
          ? clientY - rect.bottom
          : 0;
      if (dist < minDist) {
        minDist = dist;
        closest = block;
      }
    }

    return closest;
  }

  private updateGutter(): void {
    const blockId = this.hoveredBlockId;
    if (!blockId) {
      this.hideGutter();
      return;
    }

    const blockEl = this.ctx.rootElement.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"], [data-list-wrapper="${blockId}"]`,
    );
    if (!blockEl) {
      this.hideGutter();
      return;
    }

    this.positionGutter(blockEl);
  }

  private positionGutter(blockEl: HTMLElement): void {
    if (!this.gutterEl) return;

    this.gutterEl.classList.remove('idea-block-gutter--hidden');
    this.gutterEl.classList.add('idea-block-gutter--visible');

    const blockRect = blockEl.getBoundingClientRect();
    const hostRect = this.host.getBoundingClientRect();
    const gutterWidth = 49;

    let leftRef = blockRect.left;
    const rootList = blockEl.closest<HTMLElement>('.idea-list-group:not(.idea-list-group--nested)');
    if (rootList) {
      leftRef = rootList.getBoundingClientRect().left;
    }

    this.gutterEl.style.top = `${blockRect.top - hostRect.top}px`;
    this.gutterEl.style.left = `${leftRef - hostRect.left - gutterWidth - 4}px`;

    if (this.dragBtn) {
      this.dragBtn.style.display = '';
      this.dragBtn.setAttribute('draggable', 'true');
    }
  }

  private hideGutter(): void {
    if (this.gutterEl) {
      this.gutterEl.classList.remove('idea-block-gutter--visible');
      this.gutterEl.classList.add('idea-block-gutter--hidden');
    }
    if (this.dragBtn) {
      this.dragBtn.style.display = '';
      this.dragBtn.setAttribute('draggable', 'true');
    }
  }

  private openSlashPalette(anchorBtn: HTMLElement): void {
    const blockId = this.hoveredBlockId;
    if (!blockId || !this.slashPalette) return;

    const anchorRect = anchorBtn.getBoundingClientRect();
    const el = this.ctx.rootElement.querySelector(
      `[data-block-id="${blockId}"], [data-list-wrapper="${blockId}"]`,
    );
    const insideCell = !!el?.closest('[data-cell-id]');
    this.slashPalette.show(blockId, 'insert', anchorRect, insideCell ? ['table'] : undefined);
  }

  private openMenu(mode: 'insert' | 'change', anchorBtn: HTMLElement): void {
    const blockId = this.hoveredBlockId;
    if (!blockId) return;

    const anchorRect = anchorBtn.getBoundingClientRect();
    const action = mode === 'insert' ? 'insert' as const : 'change' as const;

    this.blockTypeMenu.show(anchorRect, action, {
      onSelect: (type: BlockType, _action, dataOverride) => {
        if (mode === 'insert') {
          this.insertBlock(blockId, type, dataOverride);
        } else {
          this.changeBlockType(blockId, type, dataOverride);
        }
      },
      onTableSelect: () => {
        this.openTablePicker(blockId, mode);
      },
    });
  }

  private openTablePicker(blockId: string, mode: 'insert' | 'change'): void {
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

  private insertBlock(afterBlockId: string, type: BlockType, dataOverride?: Record<string, unknown>): void {
    const cmd = new InsertBlockCommand(
      this.ctx.document,
      afterBlockId,
      type,
      this.ctx.blockRegistry,
      dataOverride,
    );
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  private changeBlockType(blockId: string, type: BlockType, dataOverride?: Record<string, unknown>): void {
    const cmd = new ChangeBlockTypeCommand(
      this.ctx.document,
      blockId,
      type,
      this.ctx.blockRegistry,
      dataOverride,
    );
    this.ctx.undoRedoManager.push(cmd);
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

    const updated = findBlockLocation(this.ctx.document, blockId)?.block;
    if (updated?.type === 'table') {
      const focusId = getFirstTableCellFirstBlockId(updated);
      if (focusId) this.ctx.selectionManager.setCollapsed(focusId, 0);
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }

  // ── Drag & Drop ──────────────────────────────────────

  private onDragStart(e: DragEvent): void {
    const blockId = this.hoveredBlockId;
    if (!blockId || !e.dataTransfer) return;

    const blockEl = this.ctx.rootElement.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"], [data-list-wrapper="${blockId}"]`,
    );
    if (blockEl?.closest('[data-cell-id]')) {
      e.preventDefault();
      return;
    }

    this.dragBlockId = blockId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dragBlockId);

    if (blockEl) {
      blockEl.classList.add('idea-block--dragging');
    }
  }

  private onDragOver(e: DragEvent): void {
    if (!this.dragBlockId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const blockEl = this.findBlockElement(e.target as HTMLElement)
      ?? this.findBlockByY(e.clientY);
    if (!blockEl) {
      this.removeDropIndicator();
      return;
    }

    const targetId = blockEl.getAttribute('data-block-id')
      ?? blockEl.getAttribute('data-list-wrapper');
    if (!targetId || targetId === this.dragBlockId) {
      this.removeDropIndicator();
      return;
    }

    if (blockEl.closest('[data-cell-id]')) {
      this.removeDropIndicator();
      return;
    }

    const rect = blockEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const above = e.clientY < midY;

    this.showDropIndicator(blockEl, above);
  }

  private onDrop(e: DragEvent): void {
    e.preventDefault();
    if (!this.dragBlockId) return;

    const blockEl = this.findBlockElement(e.target as HTMLElement)
      ?? this.findBlockByY(e.clientY);
    if (!blockEl) {
      this.onDragEnd();
      return;
    }

    const targetId = blockEl.getAttribute('data-block-id')
      ?? blockEl.getAttribute('data-list-wrapper');
    if (!targetId || targetId === this.dragBlockId) {
      this.onDragEnd();
      return;
    }

    if (blockEl.closest('[data-cell-id]')) {
      this.onDragEnd();
      return;
    }

    const fromLoc = findBlockLocation(this.ctx.document, this.dragBlockId);
    if (fromLoc?.parentKind === 'table-cell') {
      this.onDragEnd();
      return;
    }

    const rect = blockEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const above = e.clientY < midY;

    let targetIndex = this.ctx.document.children.findIndex(b => b.id === targetId);
    if (targetIndex === -1) {
      this.onDragEnd();
      return;
    }

    if (!above) targetIndex += 1;

    const fromIndex = this.ctx.document.children.findIndex(b => b.id === this.dragBlockId);
    if (fromIndex < targetIndex) targetIndex -= 1;

    const cmd = new MoveBlockCommand(this.ctx.document, this.dragBlockId, targetIndex);
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });

    this.onDragEnd();
  }

  private onDragEnd(): void {
    if (this.dragBlockId) {
      const blockEl = this.ctx.rootElement.querySelector<HTMLElement>(
        `[data-block-id="${this.dragBlockId}"], [data-list-wrapper="${this.dragBlockId}"]`,
      );
      blockEl?.classList.remove('idea-block--dragging');
    }
    this.dragBlockId = null;
    this.hoveredBlockId = null;
    this.removeDropIndicator();
    this.hideGutter();
  }

  private showDropIndicator(blockEl: HTMLElement, above: boolean): void {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement('div');
      this.dropIndicator.classList.add('idea-block-drop-indicator');
      this.ctx.rootElement.appendChild(this.dropIndicator);
    }

    const rect = blockEl.getBoundingClientRect();
    const rootRect = this.ctx.rootElement.getBoundingClientRect();

    this.dropIndicator.style.top = above
      ? `${rect.top - rootRect.top - 1}px`
      : `${rect.bottom - rootRect.top - 1}px`;
    this.dropIndicator.style.left = `${rect.left - rootRect.left}px`;
    this.dropIndicator.style.width = `${rect.width}px`;
  }

  private removeDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
  }
}
