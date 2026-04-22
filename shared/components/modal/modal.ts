export interface ModalShowOptions {
  /** Plain-text title; ignored if `header` is set. */
  title?: string;
  /** Custom header content; takes precedence over `title`. */
  header?: HTMLElement | null;
  body: HTMLElement;
  footer?: HTMLElement | null;
  /** Extra class on the panel (e.g. for narrow confirm dialogs). */
  panelClass?: string;
  /** Called when the modal is dismissed (Escape, backdrop click, or `hide()`). */
  onDismiss?: () => void;
}

/**
 * Centered modal dialog with backdrop. Sections are plain DOM nodes (slot-like).
 */
export class Modal {
  private root: HTMLDivElement | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(private readonly host: HTMLElement) {}

  show(options: ModalShowOptions): void {
    this.hide();

    const onDismiss = options.onDismiss;

    this.root = document.createElement('div');
    this.root.classList.add('idea-modal');
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');

    const backdrop = document.createElement('div');
    backdrop.classList.add('idea-modal__backdrop');

    const panel = document.createElement('div');
    panel.classList.add('idea-modal__panel');
    if (options.panelClass) {
      panel.classList.add(options.panelClass);
    }

    if (options.header) {
      const headerWrap = document.createElement('div');
      headerWrap.classList.add('idea-modal__header');
      headerWrap.appendChild(options.header);
      panel.appendChild(headerWrap);
    } else if (options.title) {
      const headerWrap = document.createElement('div');
      headerWrap.classList.add('idea-modal__header');
      const titleEl = document.createElement('div');
      titleEl.classList.add('idea-modal__title');
      titleEl.textContent = options.title;
      headerWrap.appendChild(titleEl);
      panel.appendChild(headerWrap);
    }

    const bodyWrap = document.createElement('div');
    bodyWrap.classList.add('idea-modal__body');
    bodyWrap.appendChild(options.body);
    panel.appendChild(bodyWrap);

    if (options.footer) {
      const footerWrap = document.createElement('div');
      footerWrap.classList.add('idea-modal__footer');
      footerWrap.appendChild(options.footer);
      panel.appendChild(footerWrap);
    }

    this.root.appendChild(backdrop);
    this.root.appendChild(panel);

    const dismiss = () => {
      onDismiss?.();
      this.hide();
    };

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    });

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    };

    document.addEventListener('keydown', onKeydown, true);
    this.disposers.push(() => document.removeEventListener('keydown', onKeydown, true));

    this.host.appendChild(this.root);

    const focusable = panel.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }

  hide(): void {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  isVisible(): boolean {
    return this.root !== null;
  }
}
