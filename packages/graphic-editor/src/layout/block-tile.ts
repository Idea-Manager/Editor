import './block-tile.scss';
import type { I18nService } from '@core/i18n/i18n';
import type { EventBus } from '@core/events/event-bus';
import type { AnyGraphicBlockDefinition } from '../blocks/block-registry';
import { GRAPHIC_BLOCK_TILE_ADD } from '../i18n/keys';

/**
 * Session-scoped gate: the one-time placement hint toast is shown only once
 * per browser session across all tiles.
 */
const _shownHintTypes = new Set<string>();

export class BlockTile {
  private readonly btn: HTMLButtonElement;
  private readonly activateListeners: Array<() => void> = [];
  private readonly pointerHandler: (e: PointerEvent) => void;

  constructor(
    host: HTMLElement,
    private readonly def: AnyGraphicBlockDefinition,
    private readonly i18n: I18nService,
  ) {
    const label = def.staticLabel ?? (def.labelKey ? i18n.t(def.labelKey) : def.type);

    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.className = 'idea-graphic-block-tile';
    this.btn.title = label;

    const icon = document.createElement('span');
    icon.className = 'idea-graphic-block-tile__icon material-symbols-outlined';
    icon.textContent = def.icon;

    const labelEl = document.createElement('span');
    labelEl.className = 'idea-graphic-block-tile__label';
    labelEl.textContent = label;

    this.btn.appendChild(icon);
    this.btn.appendChild(labelEl);

    this.pointerHandler = (e: PointerEvent) => {
      e.preventDefault();
      for (const cb of this.activateListeners) {
        cb();
      }
    };

    this.btn.addEventListener('pointerdown', this.pointerHandler);
    host.appendChild(this.btn);
  }

  /**
   * Register a callback that fires on `pointerdown`. Returns an unsubscribe fn.
   */
  onActivate(callback: () => void): () => void {
    this.activateListeners.push(callback);
    return () => {
      const idx = this.activateListeners.indexOf(callback);
      if (idx !== -1) this.activateListeners.splice(idx, 1);
    };
  }

  /**
   * Emits a one-time hint toast the first time any block type is placed in the
   * session. Call this inside the activate handler.
   */
  static maybeShowPlacementHint(type: string, i18n: I18nService, eventBus: EventBus): void {
    if (_shownHintTypes.has('placement')) return;
    _shownHintTypes.add('placement');
    eventBus.emit('graphic:toast', { message: i18n.t(GRAPHIC_BLOCK_TILE_ADD), type });
  }

  destroy(): void {
    this.btn.removeEventListener('pointerdown', this.pointerHandler);
    this.activateListeners.length = 0;
    this.btn.remove();
  }
}
