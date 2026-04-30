import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicContext } from '../engine/graphic-context';
import type { SelectionEntry } from '../engine/selection-manager';
import type { GroupPropertiesWindow } from '../properties/group-properties-window';

export interface GroupControllerConfig {
  ctx: GraphicContext;
  /** Called when a single non-arrow element is selected. */
  showPropertiesWindow: (el: GraphicElement) => void;
  /** Called when the selection no longer warrants a single-element window. */
  hidePropertiesWindow: () => void;
  /** Called when a single arrow element is selected. */
  showArrowToolbar: (el: GraphicElement) => void;
  /** Called when the arrow toolbar should be hidden. */
  hideArrowToolbar: () => void;
  /** Factory for the group properties window (created lazily on first multi-select). */
  createGroupPropertiesWindow: (host: HTMLElement) => GroupPropertiesWindow;
}

/**
 * Centralises `selection:change` routing:
 *
 *  0 items       → close everything
 *  1 non-arrow   → FloatingPropertiesWindow
 *  1 arrow       → FlyoutArrowToolbar
 *  >1 items      → GroupPropertiesWindow
 */
export class GroupController {
  private readonly ctx: GraphicContext;
  private readonly config: GroupControllerConfig;
  private groupWindow: GroupPropertiesWindow | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(config: GroupControllerConfig) {
    this.ctx = config.ctx;
    this.config = config;

    const off = this.ctx.eventBus.on<SelectionEntry[]>(
      'selection:change',
      (entries) => this._onSelectionChange(entries ?? []),
    );
    this.disposers.push(off);
  }

  private _onSelectionChange(entries: SelectionEntry[]): void {
    const { showPropertiesWindow, hidePropertiesWindow, showArrowToolbar, hideArrowToolbar } =
      this.config;

    if (entries.length === 0) {
      hideArrowToolbar();
      hidePropertiesWindow();
      this._closeGroupWindow();
      return;
    }

    if (entries.length === 1 && entries[0].type === 'element') {
      const el = this.ctx.page.elements.find(e => e.id === entries[0].id);
      if (el?.type === 'arrow') {
        this._closeGroupWindow();
        hidePropertiesWindow();
        showArrowToolbar(el);
        return;
      }
      if (el) {
        this._closeGroupWindow();
        hideArrowToolbar();
        showPropertiesWindow(el);
        return;
      }
    }

    // Single frame OR multi-select
    hideArrowToolbar();
    hidePropertiesWindow();

    if (entries.length > 1) {
      this._openOrUpdateGroupWindow(entries);
    } else {
      // Single frame — just close group window
      this._closeGroupWindow();
    }
  }

  private _openOrUpdateGroupWindow(entries: SelectionEntry[]): void {
    if (!this.groupWindow) {
      const host = this.ctx.rootElement;
      this.groupWindow = this.config.createGroupPropertiesWindow(host);
    }
    this.groupWindow.setSelection(entries);
  }

  private _closeGroupWindow(): void {
    this.groupWindow?.destroy();
    this.groupWindow = null;
  }

  destroy(): void {
    for (const off of this.disposers) off();
    this.disposers.length = 0;
    this._closeGroupWindow();
  }
}
