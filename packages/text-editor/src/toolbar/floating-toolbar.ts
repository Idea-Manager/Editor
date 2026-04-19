import type { InlineMark, BlockType } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { PaletteItem } from '../blocks/block-registry';
import { ToggleMarkCommand } from '../inline/toggle-mark-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { SetAlignCommand, type Alignment } from '../engine/commands/set-align-command';
import { createIcon } from '../../../../src/util/icon';

const MARK_BUTTONS: { mark: InlineMark; icon: string }[] = [
  { mark: 'bold', icon: 'format_bold' },
  { mark: 'italic', icon: 'format_italic' },
  { mark: 'underline', icon: 'format_underlined' },
];

const ALIGN_BUTTONS: { align: Alignment; icon: string; titleKey: string }[] = [
  { align: 'left', icon: 'format_align_left', titleKey: 'toolbar.alignLeft' },
  { align: 'center', icon: 'format_align_center', titleKey: 'toolbar.alignCenter' },
  { align: 'right', icon: 'format_align_right', titleKey: 'toolbar.alignRight' },
];

const CONVERTIBLE_BLOCK_TYPES: BlockType[] = ['paragraph', 'heading', 'list_item'];

export class FloatingToolbar {
  private overlay: HTMLDivElement | null = null;
  private visible = false;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly markManager = new InlineMarkManager();
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
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  private attach(): void {
    const unsub = this.ctx.eventBus.on('selection:change', () => {
      this.onSelectionChange();
    });

    const onMousedown = (e: MouseEvent) => {
      if (this.overlay && !this.overlay.contains(e.target as Node)) {
        this.hide();
      }
    };

    document.addEventListener('mousedown', onMousedown);

    this.disposers.push(unsub);
    this.disposers.push(() => document.removeEventListener('mousedown', onMousedown));
  }

  private onSelectionChange(): void {
    const sel = this.ctx.selectionManager.get();

    if (!sel || sel.isCollapsed) {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.hide();
      return;
    }

    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = setTimeout(() => {
      this.showAtSelection();
    }, 80);
  }

  private showAtSelection(): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    if (!this.overlay) {
      this.createOverlay();
    }

    this.updateActiveStates();
    this.positionOverlay();
    this.visible = true;
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.visible = false;
  }

  private getConvertiblePaletteItems(): PaletteItem[] {
    return this.ctx.blockRegistry.getPaletteItems().filter(
      item => CONVERTIBLE_BLOCK_TYPES.includes(item.type as BlockType),
    );
  }

  private findPaletteItemForBlock(block: { type: string; data: Record<string, unknown> }): PaletteItem | undefined {
    const items = this.getConvertiblePaletteItems();
    return items.find(item => {
      if (item.type !== block.type) return false;
      if (!item.matchData) return true;
      return Object.entries(item.matchData).every(([k, v]) => block.data[k] === v);
    });
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-floating-toolbar');

    for (const { mark, icon } of MARK_BUTTONS) {
      const btn = document.createElement('button');
      btn.classList.add('idea-floating-toolbar__btn', 'idea-floating-toolbar__btn--mark');
      btn.setAttribute('data-mark', mark);
      btn.appendChild(createIcon(icon));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.toggleMark(mark);
      });

      this.overlay.appendChild(btn);
    }

    const sep1 = document.createElement('div');
    sep1.classList.add('idea-floating-toolbar__separator');
    this.overlay.appendChild(sep1);

    for (const { align, icon, titleKey } of ALIGN_BUTTONS) {
      const btn = document.createElement('button');
      btn.classList.add('idea-floating-toolbar__btn', 'idea-floating-toolbar__btn--align');
      btn.setAttribute('data-align', align);
      btn.title = this.ctx.i18n.t(titleKey);
      btn.appendChild(createIcon(icon));

      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.setAlign(align);
      });

      this.overlay.appendChild(btn);
    }

    const sel = this.ctx.selectionManager.get();
    const block = sel
      ? this.ctx.document.children.find(b => b.id === sel.anchorBlockId)
      : null;

    if (block && CONVERTIBLE_BLOCK_TYPES.includes(block.type)) {
      const sep2 = document.createElement('div');
      sep2.classList.add('idea-floating-toolbar__separator');
      this.overlay.appendChild(sep2);

      const select = document.createElement('select');
      select.classList.add('idea-floating-toolbar__select');
      select.setAttribute('data-role', 'block-type');

      const paletteItems = this.getConvertiblePaletteItems();
      for (const item of paletteItems) {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = this.ctx.i18n.t(item.labelKey);
        select.appendChild(opt);
      }

      select.addEventListener('change', (e) => {
        e.preventDefault();
        const selectedId = (e.target as HTMLSelectElement).value;
        const item = paletteItems.find(p => p.id === selectedId);
        if (item) {
          this.changeBlockType(item.type as BlockType, item.dataFactory());
        }
      });

      this.overlay.appendChild(select);
    }

    this.host.appendChild(this.overlay);
  }

  private updateActiveStates(): void {
    if (!this.overlay) return;

    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
    if (!block) return;

    const activeMarks = this.markManager.getActiveMarksInRange(
      block,
      Math.min(sel.anchorOffset, sel.focusOffset),
      Math.max(sel.anchorOffset, sel.focusOffset),
    );

    const buttons = this.overlay.querySelectorAll('.idea-floating-toolbar__btn[data-mark]');
    buttons.forEach(btn => {
      const mark = btn.getAttribute('data-mark') as InlineMark;
      btn.classList.toggle('idea-floating-toolbar__btn--active', activeMarks.includes(mark));
    });

    const currentAlign = (block.data as Record<string, unknown>).align as string ?? 'left';
    const alignBtns = this.overlay.querySelectorAll('.idea-floating-toolbar__btn--align[data-align]');
    alignBtns.forEach(btn => {
      const a = btn.getAttribute('data-align');
      btn.classList.toggle('idea-floating-toolbar__btn--active', a === currentAlign);
    });

    const select = this.overlay.querySelector('[data-role="block-type"]') as HTMLSelectElement;
    if (select) {
      const matched = this.findPaletteItemForBlock(block as { type: string; data: Record<string, unknown> });
      if (matched) {
        select.value = matched.id;
      }
    }
  }

  private positionOverlay(): void {
    if (!this.overlay) return;

    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) return;

    const range = domSel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const toolbarWidth = 240;
    const toolbarHeight = 42;

    let top = rect.top - toolbarHeight - 8;
    if (top < 0) {
      top = rect.bottom + 8;
    }

    let left = rect.left + (rect.width - toolbarWidth) / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

    this.overlay.style.top = `${top}px`;
    this.overlay.style.left = `${left}px`;
  }

  private toggleMark(mark: InlineMark): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const block = this.ctx.document.children.find(b => b.id === sel.anchorBlockId);
    if (!block) return;

    const cmd = new ToggleMarkCommand(
      block,
      mark,
      Math.min(sel.anchorOffset, sel.focusOffset),
      Math.max(sel.anchorOffset, sel.focusOffset),
      this.markManager,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
    this.updateActiveStates();
  }

  private setAlign(align: Alignment): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const cmd = new SetAlignCommand(
      this.ctx.document,
      sel.anchorBlockId,
      align,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
    this.updateActiveStates();
  }

  private changeBlockType(newType: BlockType, dataOverride?: Record<string, unknown>): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const cmd = new ChangeBlockTypeCommand(
      this.ctx.document,
      sel.anchorBlockId,
      newType,
      this.ctx.blockRegistry,
      dataOverride,
    );

    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
  }
}
