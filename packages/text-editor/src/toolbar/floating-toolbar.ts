import type { BlockNode, BlockSelection, InlineMark, BlockType } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { PaletteItem } from '../blocks/block-registry';
import { ToggleMarkCommand } from '../inline/toggle-mark-command';
import { SetTextColorCommand } from '../inline/set-text-color-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { openLinkUrlFlyout } from './link-url-flyout';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import { SetAlignCommand, type Alignment } from '../engine/commands/set-align-command';
import { createIcon } from '../icons/create-icon';
import { getBlockById, getSelectionSpansInDocumentOrder } from '../engine/block-locator';
import { SelectionSync, escapeSelectorAttr } from '../engine/selection-sync';
import { ColorPicker } from '@shared/components/color-picker';
import {
  mergeFloatingToolbarConfig,
  type FloatingToolbarConfig,
} from './toolbar-options';

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

export class FloatingToolbar {
  private overlay: HTMLDivElement | null = null;
  private colorPicker: ColorPicker | null = null;
  private linkFlyout: HTMLDivElement | null = null;
  private linkFlyoutClose: (() => void) | null = null;
  private visible = false;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  /** Suppress toolbar during table cell range drag or while table context menu is open. */
  private tableRangeUiActive = false;
  private readonly markManager = new InlineMarkManager();
  private readonly disposers: (() => void)[] = [];
  private readonly selectionSync: SelectionSync;
  private readonly toolbarConfig: FloatingToolbarConfig;

  constructor(
    private readonly ctx: EditorContext,
    private readonly host: HTMLElement,
    selectionSync?: SelectionSync,
    config?: Partial<FloatingToolbarConfig>,
  ) {
    this.selectionSync = selectionSync ?? new SelectionSync();
    this.toolbarConfig = mergeFloatingToolbarConfig(config);
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

    const unsubTableRangeUi = this.ctx.eventBus.on('table:range-ui', (p: { active: boolean }) => {
      this.tableRangeUiActive = p.active;
      if (p.active) {
        if (this.showTimer) {
          clearTimeout(this.showTimer);
          this.showTimer = null;
        }
        this.hide();
      } else {
        this.onSelectionChange();
      }
    });

    const onMousedown = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideToolbar = this.overlay && !this.overlay.contains(target);
      const outsidePicker = !this.colorPicker?.element?.contains(target);
      const outsideLinkFlyout = !this.linkFlyout?.contains(target);
      const outsideLinkHover = !(target as Element).closest?.('.idea-link-hover-popover');
      if (outsideToolbar && outsidePicker && outsideLinkFlyout && outsideLinkHover) {
        this.hide();
      }
    };

    document.addEventListener('mousedown', onMousedown);

    this.disposers.push(unsub);
    this.disposers.push(unsubTableRangeUi);
    this.disposers.push(() => document.removeEventListener('mousedown', onMousedown));
  }

  private onSelectionChange(): void {
    if (this.tableRangeUiActive) {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.hide();
      return;
    }

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
    if (this.tableRangeUiActive) return;

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
    this.hideLinkFlyout();
    this.clearColorPicker();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.visible = false;
  }

  private clearColorPicker(): void {
    this.colorPicker?.hide();
    this.colorPicker = null;
  }

  private hideLinkFlyout(): void {
    if (this.linkFlyoutClose) {
      this.linkFlyoutClose();
    }
  }

  private getConvertiblePaletteItems(): PaletteItem[] {
    const types = this.toolbarConfig.convertibleBlockTypes;
    return this.ctx.blockRegistry.getPaletteItems().filter(item =>
      (types as readonly string[]).includes(item.type),
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

  /** Unique blocks touched by the selection (paragraphs, headings, etc.), in span order. */
  private getToolbarTargetBlocks(sel: BlockSelection): BlockNode[] {
    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    if (!spans || spans.length === 0) {
      const b = getBlockById(this.ctx.document, sel.anchorBlockId);
      return b ? [b] : [];
    }
    const seen = new Set<string>();
    const out: BlockNode[] = [];
    for (const s of spans) {
      if (!seen.has(s.block.id)) {
        seen.add(s.block.id);
        out.push(s.block);
      }
    }
    return out;
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-floating-toolbar');

    const s = this.toolbarConfig.sections;
    let prevSection = false;

    const between = () => {
      if (!prevSection) return;
      const sep = document.createElement('div');
      sep.classList.add('idea-floating-toolbar__separator');
      this.overlay!.appendChild(sep);
    };

    if (s.marks) {
      between();
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
      prevSection = true;
    }

    if (s.color || s.link) {
      between();
      if (s.color) {
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.classList.add('idea-floating-toolbar__btn', 'idea-floating-toolbar__btn--color');
        colorBtn.title = this.ctx.i18n.t('toolbar.textColor');
        colorBtn.appendChild(createIcon('format_color_text'));
        colorBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.openTextColorPicker(e);
        });
        this.overlay.appendChild(colorBtn);
      }

      if (s.link) {
        const linkBtn = document.createElement('button');
        linkBtn.type = 'button';
        linkBtn.classList.add('idea-floating-toolbar__btn', 'idea-floating-toolbar__btn--link');
        linkBtn.title = this.ctx.i18n.t('toolbar.addLink');
        linkBtn.appendChild(createIcon('link_2'));
        linkBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.openLinkFlyout(e);
        });
        this.overlay.appendChild(linkBtn);
      }
      prevSection = true;
    }

    if (s.align) {
      between();
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
      prevSection = true;
    }

    if (s.blockConvert && this.getConvertiblePaletteItems().length > 0) {
      if (prevSection) {
        const sep2 = document.createElement('div');
        sep2.classList.add('idea-floating-toolbar__separator');
        sep2.setAttribute('data-role', 'block-type-sep');
        this.overlay.appendChild(sep2);
      }

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
      prevSection = true;
    }

    if (this.toolbarConfig.extraButtons.length > 0) {
      between();

      const wrap = document.createElement('div');
      wrap.classList.add('idea-floating-toolbar__extra');
      wrap.setAttribute('data-role', 'floating-toolbar-extra');

      for (const eb of this.toolbarConfig.extraButtons) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('idea-floating-toolbar__btn', 'idea-floating-toolbar__btn--extra');
        btn.setAttribute('data-extra-id', eb.id);
        btn.title = this.ctx.i18n.t(eb.titleKey);
        btn.appendChild(createIcon(eb.icon));
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          eb.onClick(this.ctx);
          this.updateActiveStates();
        });
        wrap.appendChild(btn);
      }
      this.overlay.appendChild(wrap);
    }

    this.host.appendChild(this.overlay);
  }

  private updateActiveStates(): void {
    if (!this.overlay) return;

    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    const toolbarBlocks = this.getToolbarTargetBlocks(sel);
    if (toolbarBlocks.length === 0) return;

    const block = toolbarBlocks[0];

    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    let activeMarks: InlineMark[] = [];
    if (spans && spans.length > 0) {
      let acc: InlineMark[] | null = null;
      for (const span of spans) {
        const marks = this.markManager.getActiveMarksInRange(span.block, span.start, span.end);
        acc = acc === null ? marks : acc.filter(m => marks.includes(m));
      }
      activeMarks = acc ?? [];
    } else {
      activeMarks = this.markManager.getActiveMarksInRange(
        block,
        Math.min(sel.anchorOffset, sel.focusOffset),
        Math.max(sel.anchorOffset, sel.focusOffset),
      );
    }

    const convertibleTypes = this.toolbarConfig.convertibleBlockTypes as readonly string[];

    const buttons = this.overlay.querySelectorAll('.idea-floating-toolbar__btn[data-mark]');
    buttons.forEach(btn => {
      const mark = btn.getAttribute('data-mark') as InlineMark;
      btn.classList.toggle('idea-floating-toolbar__btn--active', activeMarks.includes(mark));
    });

    const alignBtns = this.overlay.querySelectorAll('.idea-floating-toolbar__btn--align[data-align]');
    alignBtns.forEach(btn => {
      const a = btn.getAttribute('data-align') as Alignment;
      const allMatch =
        toolbarBlocks.length > 0 &&
        toolbarBlocks.every(
          b => ((b.data as Record<string, unknown>).align as string ?? 'left') === a,
        );
      btn.classList.toggle('idea-floating-toolbar__btn--active', allMatch);
    });

    this.overlay.querySelectorAll<HTMLButtonElement>('.idea-floating-toolbar__btn--extra[data-extra-id]').forEach(btn => {
      const id = btn.getAttribute('data-extra-id');
      const eb = this.toolbarConfig.extraButtons.find(x => x.id === id);
      if (eb?.isActive) {
        btn.classList.toggle('idea-floating-toolbar__btn--active', eb.isActive(this.ctx));
      }
    });

    const convertibleBlocks = toolbarBlocks.filter(b => convertibleTypes.includes(b.type));
    const select = this.overlay.querySelector('[data-role="block-type"]') as HTMLSelectElement;
    const blockTypeSep = this.overlay.querySelector('[data-role="block-type-sep"]') as HTMLElement | null;
    const showBlockType = convertibleBlocks.length > 0;
    if (select) {
      select.classList.toggle('idea-floating-toolbar__block-type-hidden', !showBlockType);
      if (showBlockType) {
        const items = convertibleBlocks.map(b =>
          this.findPaletteItemForBlock(b as { type: string; data: Record<string, unknown> }),
        );
        const first = items[0];
        const allSame = first && items.every(i => i && i.id === first.id);
        if (first && allSame) {
          select.value = first.id;
        } else if (convertibleBlocks[0]) {
          const fb = this.findPaletteItemForBlock(
            convertibleBlocks[0] as { type: string; data: Record<string, unknown> },
          );
          if (fb) select.value = fb.id;
        }
      }
    }
    if (blockTypeSep) {
      blockTypeSep.classList.toggle('idea-floating-toolbar__block-type-hidden', !showBlockType);
    }
  }

  private getSelectionBoundingRect(): DOMRect | null {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return null;

    let rect = this.selectionSync.getSelectionClientRect(this.ctx.rootElement, sel);

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const domSel = this.ctx.rootElement.ownerDocument.defaultView?.getSelection();
      if (domSel && domSel.rangeCount > 0) {
        rect = domSel.getRangeAt(0).getBoundingClientRect();
      }
    }

    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const blockEl = this.ctx.rootElement.querySelector(
        `[data-block-id="${escapeSelectorAttr(sel.anchorBlockId)}"]`,
      );
      if (blockEl) {
        rect = blockEl.getBoundingClientRect();
      }
    }

    if (!rect) return null;
    return rect;
  }

  private positionOverlay(): void {
    if (!this.overlay) return;

    const rect = this.getSelectionBoundingRect();
    if (!rect) return;

    const margin = 8;
    const vw = this.ctx.rootElement.ownerDocument.defaultView?.innerWidth ?? window.innerWidth;
    const vh = this.ctx.rootElement.ownerDocument.defaultView?.innerHeight ?? window.innerHeight;

    const place = () => {
      const toolbarW = this.overlay!.offsetWidth || 240;
      const toolbarH = this.overlay!.offsetHeight || 42;

      let top = rect.top - toolbarH - margin;
      const below = rect.bottom + margin;
      if (top < margin) {
        top = below;
      }
      if (top + toolbarH > vh - margin && rect.top - toolbarH - margin >= margin) {
        top = rect.top - toolbarH - margin;
      }
      if (top + toolbarH > vh - margin) {
        top = Math.max(margin, vh - toolbarH - margin);
      }

      let left = rect.left + rect.width / 2 - toolbarW / 2;
      left = Math.max(margin, Math.min(left, vw - toolbarW - margin));

      this.overlay!.style.top = `${top}px`;
      this.overlay!.style.left = `${left}px`;
    };

    place();
    requestAnimationFrame(place);
  }

  private resolveInitialTextColorForPicker(sel: BlockSelection): string {
    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    if (spans && spans.length > 0) {
      let acc: string | undefined;
      let first = true;
      for (const span of spans) {
        const c = this.markManager.getUniformTextColorInRange(span.block, span.start, span.end);
        if (first) {
          acc = c;
          first = false;
        } else if ((c ?? '') !== (acc ?? '')) {
          return this.fallbackComputedTextColor();
        }
      }
      if (acc !== undefined) return acc;
      return this.fallbackComputedTextColor();
    }

    const block = getBlockById(this.ctx.document, sel.anchorBlockId);
    if (!block) return '#000000';
    const lo = Math.min(sel.anchorOffset, sel.focusOffset);
    const hi = Math.max(sel.anchorOffset, sel.focusOffset);
    const c = this.markManager.getUniformTextColorInRange(block, lo, hi);
    if (c !== undefined) return c;
    return this.fallbackComputedTextColor();
  }

  private fallbackComputedTextColor(): string {
    const win = this.ctx.rootElement.ownerDocument.defaultView;
    const domSel = win?.getSelection();
    if (domSel && domSel.rangeCount > 0) {
      const range = domSel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node as HTMLElement | null;
      if (el && win) {
        const computed = win.getComputedStyle(el).color;
        if (computed) return computed;
      }
    }
    return '#000000';
  }

  private resolveInitialHrefForInput(sel: BlockSelection): string | undefined {
    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    if (spans && spans.length > 0) {
      let acc: string | undefined;
      let first = true;
      for (const span of spans) {
        const h = this.markManager.getUniformHrefInRange(span.block, span.start, span.end);
        if (first) {
          acc = h;
          first = false;
        } else if ((h ?? '') !== (acc ?? '')) {
          return undefined;
        }
      }
      return acc;
    }

    const block = getBlockById(this.ctx.document, sel.anchorBlockId);
    if (!block) return undefined;
    const lo = Math.min(sel.anchorOffset, sel.focusOffset);
    const hi = Math.max(sel.anchorOffset, sel.focusOffset);
    return this.markManager.getUniformHrefInRange(block, lo, hi);
  }

  private openLinkFlyout(_e: MouseEvent): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    this.hideLinkFlyout();
    this.clearColorPicker();

    const initialHref = this.resolveInitialHrefForInput(sel);
    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    if (!spans || spans.length === 0) return;

    const { element, close } = openLinkUrlFlyout({
      ctx: this.ctx,
      markManager: this.markManager,
      getAnchorRect: () => this.getSelectionBoundingRect(),
      preferBelow: true,
      initialHref,
      targets: spans.map(s => ({ block: s.block, start: s.start, end: s.end })),
      onAfterCommit: () => this.updateActiveStates(),
      onClosed: () => {
        this.linkFlyout = null;
        this.linkFlyoutClose = null;
      },
    });

    this.linkFlyout = element;
    this.linkFlyoutClose = () => close();
  }

  private openTextColorPicker(e: MouseEvent): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    this.hideLinkFlyout();
    this.clearColorPicker();
    const initial = this.resolveInitialTextColorForPicker(sel);
    const picker = new ColorPicker();
    this.colorPicker = picker;
    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    picker.show({
      anchorX: e.clientX,
      anchorY: e.clientY,
      initialColor: initial,
      initialColorParseAs: 'color',
      labels: {
        select: t('colorPicker.select'),
        cancel: t('colorPicker.cancel'),
      },
      onSelect: (color) => {
        const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
        if (!spans || spans.length === 0) return;
        for (const span of spans) {
          this.ctx.undoRedoManager.push(
            new SetTextColorCommand(
              this.ctx.document,
              span.block.id,
              span.start,
              span.end,
              color,
              this.markManager,
            ),
          );
        }
        this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
        this.clearColorPicker();
        this.updateActiveStates();
      },
      onCancel: () => {
        this.clearColorPicker();
      },
    });
  }

  private toggleMark(mark: InlineMark): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel || sel.isCollapsed) return;

    const spans = getSelectionSpansInDocumentOrder(this.ctx.document, sel);
    if (!spans || spans.length === 0) return;

    for (const span of spans) {
      const cmd = new ToggleMarkCommand(
        this.ctx.document,
        span.block.id,
        mark,
        span.start,
        span.end,
        this.markManager,
      );
      this.ctx.undoRedoManager.push(cmd);
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
    this.updateActiveStates();
  }

  private setAlign(align: Alignment): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    for (const b of this.getToolbarTargetBlocks(sel)) {
      this.ctx.undoRedoManager.push(new SetAlignCommand(this.ctx.document, b.id, align));
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
    this.updateActiveStates();
  }

  private changeBlockType(newType: BlockType, dataOverride?: Record<string, unknown>): void {
    const sel = this.ctx.selectionManager.get();
    if (!sel) return;

    for (const b of this.getToolbarTargetBlocks(sel)) {
      if (!(this.toolbarConfig.convertibleBlockTypes as readonly string[]).includes(b.type)) continue;
      this.ctx.undoRedoManager.push(
        new ChangeBlockTypeCommand(
          this.ctx.document,
          b.id,
          newType,
          this.ctx.blockRegistry,
          dataOverride,
        ),
      );
    }

    this.ctx.eventBus.emit('doc:change', { document: this.ctx.document });
    this.updateActiveStates();
  }
}
