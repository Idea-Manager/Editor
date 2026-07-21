import './accordion.scss';

export interface AccordionItem {
  id: string;
  /** Plain text or any HTMLElement — rendered into the title row. */
  title: string | HTMLElement;
  /** DOM rendered into the collapsible body (slot). */
  content: HTMLElement;
  /** Initial state. Default: false. */
  defaultOpen?: boolean;
  /** Set to true to disable interaction (e.g. empty Custom group). */
  disabled?: boolean;
}

export interface AccordionConfig {
  items: AccordionItem[];
  /**
   * 'single' = at most one item is open at a time.
   * 'multiple' = each item toggles independently.
   */
  mode?: 'single' | 'multiple';
  /** Optional callback fired on every open/close change. */
  onToggle?: (id: string, open: boolean) => void;
}

interface ItemState {
  section: HTMLElement;
  header: HTMLButtonElement;
  body: HTMLElement;
  bodyInner: HTMLElement;
  clickHandler: () => void;
  transitionHandler: (e: TransitionEvent) => void;
}

export class Accordion {
  readonly element: HTMLElement;

  private readonly mode: 'single' | 'multiple';
  private readonly onToggle?: (id: string, open: boolean) => void;
  private openIds: string[] = [];
  private itemStates = new Map<string, ItemState>();
  private destroyed = false;

  constructor(config: AccordionConfig) {
    this.mode = config.mode ?? 'single';
    this.onToggle = config.onToggle;

    this.element = document.createElement('div');
    this.element.classList.add('idea-accordion');
    this.element.dataset['mode'] = this.mode;

    this.renderItems(config.items, []);
  }

  open(id: string): void {
    if (this.destroyed) return;
    const state = this.itemStates.get(id);
    if (!state) return;
    if (state.section.dataset['open'] === 'true') return;
    if (state.header.disabled) return;

    if (this.mode === 'single') {
      for (const openId of [...this.openIds]) {
        this.closeItem(openId);
      }
    }

    this.openItem(id);
  }

  close(id: string): void {
    if (this.destroyed) return;
    const state = this.itemStates.get(id);
    if (!state) return;
    if (state.section.dataset['open'] === 'false') return;

    this.closeItem(id);
  }

  toggle(id: string): void {
    if (this.destroyed) return;
    const state = this.itemStates.get(id);
    if (!state) return;
    if (state.section.dataset['open'] === 'true') {
      this.close(id);
    } else {
      this.open(id);
    }
  }

  getOpen(): string[] {
    return [...this.openIds];
  }

  setItems(items: AccordionItem[]): void {
    if (this.destroyed) return;

    const currentOpenIds = new Set(this.openIds);
    const newIds = new Set(items.map((i) => i.id));
    const preservedOpenIds = [...currentOpenIds].filter((id) => newIds.has(id));

    this.destroyItemListeners();
    this.element.innerHTML = '';
    this.itemStates.clear();
    this.openIds = [];

    this.renderItems(items, preservedOpenIds);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.destroyItemListeners();
    this.element.innerHTML = '';
    this.itemStates.clear();
    this.openIds = [];
  }

  private renderItems(items: AccordionItem[], preservedOpenIds: string[]): void {
    for (const item of items) {
      const section = document.createElement('section');
      section.classList.add('idea-accordion__item');
      section.dataset['id'] = item.id;

      const header = document.createElement('button');
      header.classList.add('idea-accordion__header');
      header.type = 'button';

      const chevron = document.createElement('span');
      chevron.classList.add('material-symbols-outlined', 'idea-accordion__chevron');
      chevron.textContent = 'chevron_right';

      const titleSpan = document.createElement('span');
      titleSpan.classList.add('idea-accordion__title');
      if (typeof item.title === 'string') {
        titleSpan.textContent = item.title;
      } else {
        titleSpan.appendChild(item.title);
      }

      header.appendChild(chevron);
      header.appendChild(titleSpan);

      const body = document.createElement('div');
      body.classList.add('idea-accordion__body');
      body.setAttribute('role', 'region');
      body.style.maxHeight = '0';
      body.style.overflow = 'hidden';

      const bodyInner = document.createElement('div');
      bodyInner.classList.add('idea-accordion__body-inner');
      bodyInner.appendChild(item.content);
      body.appendChild(bodyInner);

      section.appendChild(header);
      section.appendChild(body);

      if (item.disabled) {
        header.disabled = true;
        section.classList.add('idea-accordion__item--disabled');
      }

      const isOpen =
        preservedOpenIds.includes(item.id) || (!item.disabled && (item.defaultOpen ?? false));

      if (isOpen) {
        section.dataset['open'] = 'true';
        header.setAttribute('aria-expanded', 'true');
        header.classList.add('idea-accordion__header--open');
        body.style.maxHeight = 'none';
        this.openIds.push(item.id);
      } else {
        section.dataset['open'] = 'false';
        header.setAttribute('aria-expanded', 'false');
      }

      const clickHandler = () => {
        this.toggle(item.id);
      };

      const transitionHandler = (e: TransitionEvent) => {
        if (e.propertyName !== 'max-height') return;
        if (section.dataset['open'] === 'true') {
          body.style.maxHeight = 'none';
        }
      };

      header.addEventListener('click', clickHandler);
      body.addEventListener('transitionend', transitionHandler);

      this.itemStates.set(item.id, {
        section,
        header,
        body,
        bodyInner,
        clickHandler,
        transitionHandler,
      });

      this.element.appendChild(section);
    }
  }

  private openItem(id: string): void {
    const state = this.itemStates.get(id);
    if (!state) return;

    const { section, header, body } = state;

    section.dataset['open'] = 'true';
    header.setAttribute('aria-expanded', 'true');
    header.classList.add('idea-accordion__header--open');

    body.style.maxHeight = body.scrollHeight + 'px';

    if (!this.openIds.includes(id)) {
      this.openIds.push(id);
    }

    this.onToggle?.(id, true);
  }

  private closeItem(id: string): void {
    const state = this.itemStates.get(id);
    if (!state) return;

    const { section, header, body } = state;

    // Freeze current height before collapsing (needed if currently 'none')
    if (body.style.maxHeight === 'none') {
      body.style.maxHeight = body.scrollHeight + 'px';
      // Force reflow so browser registers the from-value
      body.getBoundingClientRect();
    }

    section.dataset['open'] = 'false';
    header.setAttribute('aria-expanded', 'false');
    header.classList.remove('idea-accordion__header--open');

    body.style.maxHeight = '0';

    this.openIds = this.openIds.filter((openId) => openId !== id);

    this.onToggle?.(id, false);
  }

  private destroyItemListeners(): void {
    for (const [, state] of this.itemStates) {
      state.header.removeEventListener('click', state.clickHandler);
      state.body.removeEventListener('transitionend', state.transitionHandler);
    }
  }
}
