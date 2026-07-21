import { createIcon } from '../../../src/util/icon';
import './floating-window.scss';

export interface FloatingWindowConfig {
  /** Title bar text or custom node. */
  title: string | HTMLElement;
  /** Body content (slot). The component owns scrolling inside the body. */
  body: HTMLElement;
  /**
   * CSS selector resolved (closest, then querySelector) at every layout
   * computation to derive the parent bounding rectangle.
   * Default: the host element passed to mount().
   */
  boundsSelector?: string;
  /** Initial size. Default { width: 320, height: 400 }. */
  initialSize?: { width: number; height: number };
  /** Initial position relative to host. Default: top-right with 16 px margin. */
  initialPosition?: { x: number; y: number };
  /** ID forwarded to onFocusedTargetChange so the host can map it back to a graphic element / group. */
  targetId?: string | null;
  /** Fired when the window is closed by the user. */
  onClose?: () => void;
  /**
   * Fired with targetId when the window receives focus, and with null when it
   * loses focus. Hosts use this to highlight the target.
   */
  onFocusedTargetChange?: (targetId: string | null) => void;
  /**
   * Accessible label for the close button.
   * Callers should pass i18n.t('graphic.floatingWindow.close').
   * Defaults to 'Close'.
   */
  closeAriaLabel?: string;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 400;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

export class FloatingWindow {
  readonly element: HTMLElement;

  private host: HTMLElement | null = null;
  private readonly titleEl: HTMLElement;
  private readonly bodyWrap: HTMLElement;

  private x = 0;
  private y = 0;
  private width: number;
  private height: number;

  private isFocused = false;
  private targetId: string | null;

  private readonly config: FloatingWindowConfig;
  private readonly disposers: (() => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;

  constructor(config: FloatingWindowConfig) {
    this.config = config;
    this.targetId = config.targetId ?? null;
    this.width = config.initialSize?.width ?? DEFAULT_WIDTH;
    this.height = config.initialSize?.height ?? DEFAULT_HEIGHT;

    // Root
    const root = document.createElement('div');
    root.classList.add('idea-graphic-floating-window');
    root.setAttribute('tabindex', '-1');
    root.setAttribute('role', 'dialog');
    this.element = root;

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.classList.add('idea-graphic-floating-window__titlebar');

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('idea-graphic-floating-window__title');
    this.titleEl = titleSpan;

    const closeBtn = document.createElement('button');
    closeBtn.classList.add('idea-graphic-floating-window__close');
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', config.closeAriaLabel ?? 'Close');
    closeBtn.appendChild(createIcon('close'));
    closeBtn.addEventListener('click', () => {
      config.onClose?.();
      this.unmount();
    });

    titlebar.appendChild(titleSpan);
    titlebar.appendChild(closeBtn);
    root.appendChild(titlebar);

    // Body
    const bodyWrap = document.createElement('div');
    bodyWrap.classList.add('idea-graphic-floating-window__body');
    this.bodyWrap = bodyWrap;
    root.appendChild(bodyWrap);

    // 8 resize handles
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const) {
      const handle = document.createElement('div');
      handle.classList.add(
        'idea-graphic-floating-window__resize',
        `idea-graphic-floating-window__resize--${dir}`,
      );
      handle.dataset['dir'] = dir;
      root.appendChild(handle);
    }

    // Apply initial content
    this.setTitle(config.title);
    this.setBody(config.body);
  }

  mount(host: HTMLElement): void {
    if (this.host) this.unmount();
    this.host = host;

    // Determine initial position
    if (this.config.initialPosition) {
      this.x = this.config.initialPosition.x;
      this.y = this.config.initialPosition.y;
    } else {
      const boundsRect = this.getBoundsRect();
      const hostRect = host.getBoundingClientRect();
      const bTop = boundsRect.top - hostRect.top;
      const bRight = boundsRect.right - hostRect.left;
      this.x = bRight - this.width - 16;
      this.y = bTop + 16;
    }

    this.applyLayout();
    host.appendChild(this.element);
    this.syncAriaLabel();

    // Bind titlebar drag
    const titlebar = this.element.querySelector<HTMLElement>(
      '.idea-graphic-floating-window__titlebar',
    )!;
    this.bindTitlebarDrag(titlebar);

    // Bind each resize handle
    this.element
      .querySelectorAll<HTMLElement>('.idea-graphic-floating-window__resize')
      .forEach((handle) => {
        this.bindResizeHandle(handle, handle.dataset['dir']!);
      });

    // Focus: pointerdown inside the window
    const onInternalDown = () => {
      if (!this.isFocused) {
        this.isFocused = true;
        this.bringToFront();
        this.config.onFocusedTargetChange?.(this.targetId);
      }
    };
    this.element.addEventListener('pointerdown', onInternalDown);
    this.disposers.push(() =>
      this.element.removeEventListener('pointerdown', onInternalDown),
    );

    // Lose focus: pointerdown outside the layout bounds (document capture runs first).
    // Clicks inside the same bounded surface (e.g. full graphic editor) keep the
    // window "engaged" so canvas interaction does not clear the target highlight.
    const onDocDown = (e: PointerEvent) => {
      if (!this.isFocused || this.element.contains(e.target as Node)) return;
      const bounds = this.getBoundsRect();
      const { clientX, clientY } = e;
      const insideBounds =
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom;
      if (insideBounds) return;
      this.isFocused = false;
      this.config.onFocusedTargetChange?.(null);
    };
    document.addEventListener('pointerdown', onDocDown, true);
    this.disposers.push(() =>
      document.removeEventListener('pointerdown', onDocDown, true),
    );

    this.attachResizeObserver();
  }

  unmount(): void {
    this.element.remove();
    this.host = null;
    this.disposers.forEach((fn) => fn());
    this.disposers.length = 0;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  setTitle(title: string | HTMLElement): void {
    this.titleEl.textContent = '';
    if (typeof title === 'string') {
      this.titleEl.textContent = title;
    } else {
      this.titleEl.appendChild(title);
    }
    this.syncAriaLabel();
  }

  setBody(body: HTMLElement): void {
    this.bodyWrap.textContent = '';
    this.bodyWrap.appendChild(body);
  }

  setTargetId(id: string | null): void {
    this.targetId = id;
  }

  focus(): void {
    if (!this.host) return;
    if (!this.isFocused) {
      this.isFocused = true;
      this.bringToFront();
      this.config.onFocusedTargetChange?.(this.targetId);
    }
    this.element.focus();
  }

  getRect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private syncAriaLabel(): void {
    const text = this.titleEl.textContent ?? '';
    this.element.setAttribute('aria-label', text || 'Floating window');
  }

  private getBoundsRect(): DOMRect {
    const sel = this.config.boundsSelector;
    if (sel && this.host) {
      const el =
        (this.host.closest(sel) as HTMLElement | null) ??
        (this.host.querySelector(sel) as HTMLElement | null);
      if (el) return el.getBoundingClientRect();
    }
    if (this.host) return this.host.getBoundingClientRect();
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight - 32);
  }

  private applyLayout(): void {
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
  }

  private setPosition(newX: number, newY: number): void {
    if (!this.host) return;
    const hostRect = this.host.getBoundingClientRect();
    const boundsRect = this.getBoundsRect();
    const bLeft = boundsRect.left - hostRect.left;
    const bTop = boundsRect.top - hostRect.top;
    const bRight = boundsRect.right - hostRect.left;
    const bBottom = boundsRect.bottom - hostRect.top;

    this.x = clamp(newX, bLeft, bRight - this.width);
    this.y = clamp(newY, bTop, bBottom - this.height);
    this.applyLayout();
  }

  private reclamp(): void {
    if (!this.host) return;
    const boundsRect = this.getBoundsRect();
    const maxW = Math.max(MIN_WIDTH, boundsRect.width / 2);
    const maxH = Math.max(MIN_HEIGHT, boundsRect.height);
    this.width = clamp(this.width, MIN_WIDTH, maxW);
    this.height = clamp(this.height, MIN_HEIGHT, maxH);
    this.setPosition(this.x, this.y);
  }

  private bringToFront(): void {
    if (!this.host) return;
    let maxZ = 0;
    this.host
      .querySelectorAll<HTMLElement>('.idea-graphic-floating-window')
      .forEach((el) => {
        if (el === this.element) return;
        const z = parseInt(el.style.zIndex, 10);
        if (!isNaN(z) && z > maxZ) maxZ = z;
      });
    this.element.style.zIndex = String(maxZ + 1);
  }

  private bindTitlebarDrag(titlebar: HTMLElement): void {
    let startClientX = 0;
    let startClientY = 0;
    let startX = 0;
    let startY = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      titlebar.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      startX = this.x;
      startY = this.y;
    };
    const onMove = (e: PointerEvent) => {
      if (!titlebar.hasPointerCapture(e.pointerId)) return;
      this.setPosition(
        startX + (e.clientX - startClientX),
        startY + (e.clientY - startClientY),
      );
    };
    const onUp = (e: PointerEvent) => {
      if (titlebar.hasPointerCapture(e.pointerId)) {
        titlebar.releasePointerCapture(e.pointerId);
      }
    };

    titlebar.addEventListener('pointerdown', onDown);
    titlebar.addEventListener('pointermove', onMove);
    titlebar.addEventListener('pointerup', onUp);
    titlebar.addEventListener('pointercancel', onUp);
    this.disposers.push(() => {
      titlebar.removeEventListener('pointerdown', onDown);
      titlebar.removeEventListener('pointermove', onMove);
      titlebar.removeEventListener('pointerup', onUp);
      titlebar.removeEventListener('pointercancel', onUp);
    });
  }

  private bindResizeHandle(handle: HTMLElement, dir: string): void {
    let startClientX = 0;
    let startClientY = 0;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      startX = this.x;
      startY = this.y;
      startW = this.width;
      startH = this.height;
    };

    const onMove = (e: PointerEvent) => {
      if (!handle.hasPointerCapture(e.pointerId)) return;

      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      const boundsRect = this.getBoundsRect();
      const maxW = Math.max(MIN_WIDTH, boundsRect.width / 2);
      const maxH = Math.max(MIN_HEIGHT, boundsRect.height);

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      // East / west
      if (dir === 'e' || dir === 'ne' || dir === 'se') {
        newW = clamp(startW + dx, MIN_WIDTH, maxW);
      }
      if (dir === 'w' || dir === 'nw' || dir === 'sw') {
        newW = clamp(startW - dx, MIN_WIDTH, maxW);
        newX = startX + (startW - newW); // keep right edge fixed
      }

      // South / north
      if (dir === 's' || dir === 'se' || dir === 'sw') {
        newH = clamp(startH + dy, MIN_HEIGHT, maxH);
      }
      if (dir === 'n' || dir === 'ne' || dir === 'nw') {
        newH = clamp(startH - dy, MIN_HEIGHT, maxH);
        newY = startY + (startH - newH); // keep bottom edge fixed
      }

      // Clamp position to bounds
      if (this.host) {
        const hostRect = this.host.getBoundingClientRect();
        const bLeft = boundsRect.left - hostRect.left;
        const bTop = boundsRect.top - hostRect.top;
        const bRight = boundsRect.right - hostRect.left;
        const bBottom = boundsRect.bottom - hostRect.top;
        newX = clamp(newX, bLeft, bRight - newW);
        newY = clamp(newY, bTop, bBottom - newH);
      }

      this.x = newX;
      this.y = newY;
      this.width = newW;
      this.height = newH;
      this.applyLayout();
    };

    const onUp = (e: PointerEvent) => {
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    this.disposers.push(() => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    });
  }

  private attachResizeObserver(): void {
    if (!this.host) return;
    const onBoundsChange = () => this.reclamp();
    const sel = this.config.boundsSelector;

    let target: Element = this.host;
    if (sel) {
      const el =
        (this.host.closest(sel) as HTMLElement | null) ??
        (this.host.querySelector(sel) as HTMLElement | null);
      if (el) target = el;
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(onBoundsChange);
      this.resizeObserver.observe(target);
    } else {
      window.addEventListener('resize', onBoundsChange);
      this.disposers.push(() =>
        window.removeEventListener('resize', onBoundsChange),
      );
    }
  }
}
