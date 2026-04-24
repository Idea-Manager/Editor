import type { BlockNode } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import { getBlockById } from '../engine/block-locator';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { openLinkUrlFlyout } from './link-url-flyout';
import { createIcon } from '../icons/create-icon';

function positionQuickPopoverAbove(
  el: HTMLElement,
  anchor: DOMRect,
  win: Window,
): void {
  const margin = 8;
  const vw = win.innerWidth;
  const vh = win.innerHeight;
  const w = el.offsetWidth || 120;
  const h = el.offsetHeight || 36;

  let top = anchor.top - h - margin;
  if (top < margin) {
    top = anchor.bottom + margin;
  }
  top = Math.max(margin, Math.min(top, vh - h - margin));

  let left = anchor.left + anchor.width / 2 - w / 2;
  left = Math.max(margin, Math.min(left, vw - w - margin));

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

export class LinkHoverPopover {
  private readonly markManager = new InlineMarkManager();
  private quickEl: HTMLDivElement | null = null;
  private readonly quickDisposers: (() => void)[] = [];
  private urlFlyoutEl: HTMLDivElement | null = null;
  private urlFlyoutClose: (() => void) | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAnchor: HTMLAnchorElement | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(private readonly ctx: EditorContext) {
    this.attach();
  }

  destroy(): void {
    this.clearTimers();
    this.hideQuick();
    this.hideUrlFlyout();
    this.disposers.forEach(d => d());
    this.disposers.length = 0;
  }

  private attach(): void {
    const root = this.ctx.rootElement;

    const onMouseOver = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !root.contains(a)) return;
      const href = a.getAttribute('href');
      if (!href) return;
      this.scheduleShow(a);
    };

    const onMouseOut = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !root.contains(a)) return;
      const related = e.relatedTarget as Node | null;
      if (related && (this.quickEl?.contains(related) || a.contains(related))) return;
      if (related && this.urlFlyoutEl?.contains(related)) return;
      this.scheduleHide();
    };

    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (this.quickEl?.contains(t)) return;
      if (this.urlFlyoutEl?.contains(t)) return;
      const el = t as Element;
      if (el.closest?.('a[href]') && root.contains(t)) return;
      this.hideQuick();
      this.hideUrlFlyout();
    };

    const onLinkClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !root.contains(a)) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
    };

    const onSelChange = () => {
      this.hideQuick();
    };

    root.addEventListener('mouseover', onMouseOver);
    root.addEventListener('mouseout', onMouseOut);
    root.addEventListener('click', onLinkClick, true);
    document.addEventListener('mousedown', onDocMouseDown);
    const unsubSel = this.ctx.eventBus.on('selection:change', onSelChange);

    this.disposers.push(() => root.removeEventListener('mouseover', onMouseOver));
    this.disposers.push(() => root.removeEventListener('mouseout', onMouseOut));
    this.disposers.push(() => root.removeEventListener('click', onLinkClick, true));
    this.disposers.push(() => document.removeEventListener('mousedown', onDocMouseDown));
    this.disposers.push(unsubSel);
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private scheduleShow(anchor: HTMLAnchorElement): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.currentAnchor === anchor && this.quickEl) return;

    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.show(anchor);
    }, 120);
  }

  private scheduleHide(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.hideQuick();
    }, 200);
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private resolveLinkContext(anchor: HTMLAnchorElement): {
    block: BlockNode;
    range: { start: number; end: number };
    href: string;
  } | null {
    const span = anchor.closest('[data-run-id]');
    const blockEl = anchor.closest('[data-block-id]');
    if (!span || !blockEl) return null;
    const runId = span.getAttribute('data-run-id');
    const blockId = blockEl.getAttribute('data-block-id');
    if (!runId || !blockId) return null;
    const block = getBlockById(this.ctx.document, blockId);
    if (!block) return null;
    const range = this.markManager.expandContiguousStyledRange(block, runId);
    if (!range) return null;
    const href = anchor.getAttribute('href');
    if (!href) return null;
    return { block, range, href };
  }

  private show(anchor: HTMLAnchorElement): void {
    const linkCtx = this.resolveLinkContext(anchor);
    if (!linkCtx) return;

    this.hideQuick();
    this.currentAnchor = anchor;

    const t = this.ctx.i18n.t.bind(this.ctx.i18n);
    const win = this.ctx.rootElement.ownerDocument.defaultView ?? window;

    const pop = document.createElement('div');
    pop.classList.add('idea-link-hover-popover');

    const btnOpen = document.createElement('button');
    btnOpen.type = 'button';
    btnOpen.classList.add('idea-link-hover-popover__btn');
    btnOpen.title = t('toolbar.linkOpenNewTab');
    btnOpen.appendChild(createIcon('open_in_new'));

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.classList.add('idea-link-hover-popover__btn');
    btnEdit.title = t('toolbar.linkEdit');
    btnEdit.appendChild(createIcon('edit'));

    const btnCopy = document.createElement('button');
    btnCopy.type = 'button';
    btnCopy.classList.add('idea-link-hover-popover__btn');
    btnCopy.title = t('toolbar.linkCopy');
    btnCopy.appendChild(createIcon('content_copy'));

    pop.appendChild(btnOpen);
    pop.appendChild(btnEdit);
    pop.appendChild(btnCopy);
    document.body.appendChild(pop);
    this.quickEl = pop;

    const place = () => {
      if (!this.quickEl || !this.currentAnchor) return;
      positionQuickPopoverAbove(this.quickEl, this.currentAnchor.getBoundingClientRect(), win);
    };

    const onWinResize = () => place();
    window.addEventListener('resize', onWinResize);
    window.addEventListener('scroll', onWinResize, true);
    this.quickDisposers.push(() => {
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('scroll', onWinResize, true);
    });

    pop.addEventListener('mouseenter', () => this.cancelHide());
    pop.addEventListener('mouseleave', () => this.scheduleHide());

    place();
    requestAnimationFrame(place);

    btnOpen.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = anchor.href;
      win.open(url, '_blank', 'noopener,noreferrer');
      this.hideQuick();
    });

    btnEdit.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideQuick();
      this.openEditFlyout(anchor, linkCtx);
    });

    btnCopy.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = anchor.href;
      void navigator.clipboard.writeText(url).then(() => this.hideQuick());
    });
  }

  private hideQuick(): void {
    this.clearTimers();
    this.quickDisposers.forEach(d => d());
    this.quickDisposers.length = 0;
    this.currentAnchor = null;
    if (this.quickEl) {
      this.quickEl.remove();
      this.quickEl = null;
    }
  }

  private hideUrlFlyout(): void {
    if (this.urlFlyoutClose) {
      this.urlFlyoutClose();
    }
  }

  private openEditFlyout(
    anchor: HTMLAnchorElement,
    linkCtx: { block: BlockNode; range: { start: number; end: number }; href: string },
  ): void {
    this.hideUrlFlyout();

    const { element, close } = openLinkUrlFlyout({
      ctx: this.ctx,
      markManager: this.markManager,
      getAnchorRect: () => anchor.getBoundingClientRect(),
      preferBelow: true,
      initialHref: linkCtx.href,
      targets: [{ block: linkCtx.block, start: linkCtx.range.start, end: linkCtx.range.end }],
      onClosed: () => {
        this.urlFlyoutEl = null;
        this.urlFlyoutClose = null;
      },
    });

    this.urlFlyoutEl = element;
    this.urlFlyoutClose = () => close();
  }
}
