import type { BlockType } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import type { BlockRegistry, PaletteItem } from '../blocks/block-registry';
import { createIcon } from '../../../../src/util/icon';

export type BlockTypeMenuAction = 'insert' | 'change';

export interface BlockTypeMenuCallbacks {
  onSelect(type: BlockType, action: BlockTypeMenuAction, dataOverride?: Record<string, unknown>): void;
  onTableSelect?(action: BlockTypeMenuAction): void;
}

export class BlockTypeMenu {
  private overlay: HTMLDivElement | null = null;
  private activeIndex = 0;
  private items: PaletteItem[] = [];
  private readonly disposers: (() => void)[] = [];

  constructor(
    private readonly registry: BlockRegistry,
    private readonly host: HTMLElement,
    private readonly i18n: I18nService,
  ) {}

  isVisible(): boolean {
    return this.overlay !== null;
  }

  show(
    anchorRect: DOMRect,
    action: BlockTypeMenuAction,
    callbacks: BlockTypeMenuCallbacks,
  ): void {
    this.hide();

    this.items = this.registry.getPaletteItems();
    this.activeIndex = 0;

    this.overlay = document.createElement('div');
    this.overlay.classList.add('idea-block-type-menu');
    this.renderItems(action, callbacks);
    this.host.appendChild(this.overlay);

    this.positionOverlay(anchorRect);

    const onKeydown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          this.activeIndex = Math.min(this.activeIndex + 1, this.items.length - 1);
          this.renderItems(action, callbacks);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          this.activeIndex = Math.max(this.activeIndex - 1, 0);
          this.renderItems(action, callbacks);
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          this.confirmSelection(action, callbacks);
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          this.hide();
          break;
      }
    };

    const onMousedown = (e: MouseEvent) => {
      if (this.overlay && !this.overlay.contains(e.target as Node)) {
        this.hide();
      }
    };

    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('mousedown', onMousedown);

    this.disposers.push(
      () => document.removeEventListener('keydown', onKeydown, true),
      () => document.removeEventListener('mousedown', onMousedown),
    );
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
    this.activeIndex = 0;
  }

  private confirmSelection(
    action: BlockTypeMenuAction,
    callbacks: BlockTypeMenuCallbacks,
  ): void {
    const selected = this.items[this.activeIndex];
    if (!selected) {
      this.hide();
      return;
    }

    if (selected.type === 'table' && callbacks.onTableSelect) {
      callbacks.onTableSelect(action);
    } else {
      callbacks.onSelect(selected.type as BlockType, action, selected.dataFactory());
    }
    this.hide();
  }

  private renderItems(
    action: BlockTypeMenuAction,
    callbacks: BlockTypeMenuCallbacks,
  ): void {
    if (!this.overlay) return;
    this.overlay.innerHTML = '';

    this.items.forEach((paletteItem, i) => {
      const item = document.createElement('div');
      item.classList.add('idea-block-type-menu__item');
      if (i === this.activeIndex) {
        item.classList.add('idea-block-type-menu__item--active');
      }

      const icon = createIcon(paletteItem.icon);
      icon.classList.add('idea-block-type-menu__icon');

      const label = document.createElement('span');
      label.classList.add('idea-block-type-menu__label');
      label.textContent = this.i18n.t(paletteItem.labelKey);

      item.appendChild(icon);
      item.appendChild(label);

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.activeIndex = i;
        this.confirmSelection(action, callbacks);
      });

      item.addEventListener('mouseenter', () => {
        this.activeIndex = i;
        this.renderItems(action, callbacks);
      });

      this.overlay!.appendChild(item);
    });
  }

  private positionOverlay(anchorRect: DOMRect): void {
    if (!this.overlay) return;

    const overlay = this.overlay;
    overlay.style.top = `${anchorRect.bottom + 4}px`;
    overlay.style.left = `${anchorRect.left}px`;

    requestAnimationFrame(() => {
      if (!overlay.isConnected) return;
      const rect = overlay.getBoundingClientRect();

      let top = anchorRect.bottom + 4;
      if (top + rect.height > window.innerHeight) {
        top = anchorRect.top - rect.height - 4;
      }

      let left = anchorRect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));

      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
    });
  }
}
