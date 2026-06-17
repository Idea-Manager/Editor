import './left-panel.scss';
import { Accordion } from '@shared/components/accordion/accordion';
import type { AccordionItem } from '@shared/components/accordion/accordion';
import { createIcon } from '@text-editor/icons/create-icon';
import type { GraphicContext } from '../engine/graphic-context';
import { CUSTOM_BLOCK_GROUP_KEY } from '../blocks/block-registry';
import type { AnyGraphicBlockDefinition } from '../blocks/block-registry';
import { BlockTile, type BlockTileViewMode } from './block-tile';
import {
  GRAPHIC_GROUP_CUSTOM,
  GRAPHIC_GROUP_EMPTY,
  GRAPHIC_LEFT_PANEL_COLLAPSE_ALL,
  GRAPHIC_LEFT_PANEL_EXPAND_ALL,
  GRAPHIC_LEFT_PANEL_SORT_CHAPTERS,
  GRAPHIC_LEFT_PANEL_VIEW_LIST,
  GRAPHIC_LEFT_PANEL_VIEW_TILES,
} from '../i18n/keys';

const UNGROUPED_KEY = '__ungrouped';

export const LEFT_PANEL_MIN_WIDTH = 250;
export const LEFT_PANEL_MAX_WIDTH = 400;
export const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_WIDTH_VAR = '--idea-graphic-left-panel-width';

const TILE_SIZE = 75;
const TILE_MIN_GAP = 8;
/** Horizontal padding inside `.idea-accordion__body-inner` ($spacing-xs + $spacing-md). */
const ACCORDION_BODY_PAD_H = 20;

export type LeftPanelViewMode = 'tiles' | 'list';

export interface LeftPanelOptions {
  /** Group keys whose accordion starts expanded. Defaults to the first group's key. */
  initiallyExpandedGroups?: string[];
  /** Hide certain groups entirely. */
  hiddenGroups?: string[];
  /** Initial panel width in px (clamped to 250–400). Default 280. */
  defaultPanelWidth?: number;
  /** Initial block presentation mode. Default 'tiles'. */
  defaultViewMode?: LeftPanelViewMode;
}

interface NamedGroup {
  groupKey: string;
  definitions: AnyGraphicBlockDefinition[];
  title: string;
}

function clampPanelWidth(width: number): number {
  return Math.min(LEFT_PANEL_MAX_WIDTH, Math.max(LEFT_PANEL_MIN_WIDTH, width));
}

/** Max tile columns that fit in `panelWidth`; capped by `itemCount` when provided. */
export function computeTileLayout(panelWidth: number, itemCount?: number): number {
  const available = panelWidth - ACCORDION_BODY_PAD_H;
  const maxCols = Math.max(1, Math.floor((available + TILE_MIN_GAP) / (TILE_SIZE + TILE_MIN_GAP)));
  if (itemCount != null && itemCount > 0) {
    return Math.min(maxCols, itemCount);
  }
  return maxCols;
}

export class LeftPanel {
  private readonly aside: HTMLElement;
  private readonly toolbarEl: HTMLElement;
  private readonly sortInput: HTMLInputElement;
  private readonly viewModeBtn: HTMLButtonElement;
  private readonly scrollEl: HTMLElement;
  private readonly stickyEl: HTMLElement;
  private readonly resizeHandle: HTMLElement;

  private accordions: Accordion[] = [];
  private tiles: BlockTile[] = [];
  private blockContainers: HTMLElement[] = [];

  private panelWidth: number;
  private viewMode: LeftPanelViewMode;
  private sortQuery = '';

  private rafHandle: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private readonly onResizePointerDown: (e: PointerEvent) => void;
  private readonly onResizePointerMove: (e: PointerEvent) => void;
  private readonly onResizePointerUp: (e: PointerEvent) => void;

  constructor(
    private readonly host: HTMLElement,
    private readonly ctx: GraphicContext,
    private readonly options: LeftPanelOptions = {},
  ) {
    this.panelWidth = clampPanelWidth(options.defaultPanelWidth ?? LEFT_PANEL_DEFAULT_WIDTH);
    this.viewMode = options.defaultViewMode ?? 'tiles';

    this.aside = document.createElement('aside');
    this.aside.className = 'idea-graphic-left-panel';
    this.aside.dataset['viewMode'] = this.viewMode;

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'idea-graphic-left-panel__toolbar';

    this.sortInput = document.createElement('input');
    this.sortInput.type = 'text';
    this.sortInput.className = 'idea-graphic-left-panel__sort-input';
    this.sortInput.placeholder = this.ctx.i18n.t(GRAPHIC_LEFT_PANEL_SORT_CHAPTERS);
    this.sortInput.setAttribute('aria-label', this.ctx.i18n.t(GRAPHIC_LEFT_PANEL_SORT_CHAPTERS));

    const actionsEl = document.createElement('div');
    actionsEl.className = 'idea-graphic-left-panel__toolbar-actions';

    const expandBtn = this._makeToolbarBtn('unfold_more', GRAPHIC_LEFT_PANEL_EXPAND_ALL, () => {
      this._expandAll();
    });
    const collapseBtn = this._makeToolbarBtn('unfold_less', GRAPHIC_LEFT_PANEL_COLLAPSE_ALL, () => {
      this._collapseAll();
    });
    this.viewModeBtn = document.createElement('button');
    this.viewModeBtn.type = 'button';
    this.viewModeBtn.className =
      'idea-graphic-left-panel__toolbar-btn idea-graphic-left-panel__view-mode-btn';
    this.viewModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setViewMode(this.viewMode === 'tiles' ? 'list' : 'tiles');
    });

    actionsEl.appendChild(expandBtn);
    actionsEl.appendChild(collapseBtn);
    actionsEl.appendChild(this.viewModeBtn);

    this.toolbarEl.appendChild(this.sortInput);
    this.toolbarEl.appendChild(actionsEl);

    this.sortInput.addEventListener('input', () => {
      this.sortQuery = this.sortInput.value;
      this.refresh();
    });

    this._syncViewModeButton();

    this.scrollEl = document.createElement('div');
    this.scrollEl.className = 'idea-graphic-left-panel__scroll';

    this.stickyEl = document.createElement('div');
    this.stickyEl.className = 'idea-graphic-left-panel__sticky';

    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'idea-graphic-left-panel__resize-handle';
    this.resizeHandle.setAttribute('aria-hidden', 'true');

    this.aside.appendChild(this.toolbarEl);
    this.aside.appendChild(this.scrollEl);
    this.aside.appendChild(this.stickyEl);
    this.aside.appendChild(this.resizeHandle);

    this.onResizePointerDown = (e) => this._handleResizePointerDown(e);
    this.onResizePointerMove = (e) => this._handleResizePointerMove(e);
    this.onResizePointerUp = (e) => this._handleResizePointerUp(e);

    this.resizeHandle.addEventListener('pointerdown', this.onResizePointerDown);
  }

  /** Mount the aside before the first child of `host` (i.e., before the canvas). */
  mount(): void {
    this.host.insertBefore(this.aside, this.host.firstChild);
    this._applyPanelWidth(this.panelWidth);
    this._bindResizeObserver();
    this.refresh();
  }

  refresh(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this._doRefresh();
    });
  }

  private _makeToolbarBtn(
    icon: string,
    labelKey: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'idea-graphic-left-panel__toolbar-btn';
    btn.setAttribute('title', this.ctx.i18n.t(labelKey));
    btn.setAttribute('aria-label', this.ctx.i18n.t(labelKey));
    btn.appendChild(createIcon(icon));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private _resolveGroupTitle(groupKey: string): string {
    const i18nKey = `graphic.group.${groupKey}`;
    const translated = this.ctx.i18n.t(i18nKey);
    return translated === i18nKey ? groupKey : translated;
  }

  private _orderNamedGroups(
    namedGroups: Array<{ groupKey: string; definitions: AnyGraphicBlockDefinition[] }>,
  ): NamedGroup[] {
    const titled: NamedGroup[] = namedGroups.map((g) => ({
      ...g,
      title: this._resolveGroupTitle(g.groupKey),
    }));

    if (this.sortQuery.trim().length >= 2) {
      return [...titled].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { numeric: true }),
      );
    }

    return titled;
  }

  private _snapshotOpenIds(): Set<string> {
    const open = new Set<string>();
    for (const accordion of this.accordions) {
      for (const id of accordion.getOpen()) {
        open.add(id);
      }
    }
    return open;
  }

  private _doRefresh(): void {
    const openIds = this._snapshotOpenIds();

    this._destroyAccordions();

    const { registry, i18n } = this.ctx;
    const allGroups = registry.getGroups();

    const hiddenSet = new Set(this.options.hiddenGroups ?? []);

    const namedGroups = allGroups.filter(
      (g) =>
        g.groupKey !== CUSTOM_BLOCK_GROUP_KEY &&
        g.groupKey !== UNGROUPED_KEY &&
        !hiddenSet.has(g.groupKey),
    );

    const orderedGroups = this._orderNamedGroups(namedGroups);

    const expandedSet = new Set<string>();
    if (openIds.size > 0) {
      for (const id of openIds) {
        expandedSet.add(id);
      }
    } else {
      const initial =
        this.options.initiallyExpandedGroups ??
        (orderedGroups.length > 0 ? [orderedGroups[0].groupKey] : []);
      for (const id of initial) {
        expandedSet.add(id);
      }
    }

    for (const group of orderedGroups) {
      const groupTiles: BlockTile[] = [];
      const blocksContainer = this._makeBlocksContainer(group.definitions, groupTiles);
      this.tiles.push(...groupTiles);

      const item: AccordionItem = {
        id: group.groupKey,
        title: group.title,
        content: blocksContainer,
        defaultOpen: expandedSet.has(group.groupKey),
      };

      const accordion = new Accordion({ items: [item], mode: 'single' });
      accordion.element.dataset['groupKey'] = group.groupKey;
      accordion.element.className =
        accordion.element.className + ' idea-graphic-left-panel__group';
      this.scrollEl.appendChild(accordion.element);
      this.accordions.push(accordion);
    }

    const customGroup = allGroups.find((g) => g.groupKey === CUSTOM_BLOCK_GROUP_KEY);
    const ungroupedGroup = allGroups.find((g) => g.groupKey === UNGROUPED_KEY);

    const customDefs: AnyGraphicBlockDefinition[] = [
      ...(customGroup?.definitions ?? []),
      ...(ungroupedGroup?.definitions ?? []),
    ];

    if (customDefs.length === 0) {
      this.stickyEl.style.display = 'none';
    } else {
      this.stickyEl.style.display = '';

      const stickyTiles: BlockTile[] = [];
      const blocksContainer = this._makeBlocksContainer(customDefs, stickyTiles);
      this.tiles.push(...stickyTiles);

      const customItem: AccordionItem = {
        id: CUSTOM_BLOCK_GROUP_KEY,
        title: i18n.t(GRAPHIC_GROUP_CUSTOM),
        content: blocksContainer,
        defaultOpen: expandedSet.has(CUSTOM_BLOCK_GROUP_KEY),
      };

      const stickyAccordion = new Accordion({ items: [customItem], mode: 'single' });
      stickyAccordion.element.dataset['groupKey'] = CUSTOM_BLOCK_GROUP_KEY;
      stickyAccordion.element.className =
        stickyAccordion.element.className + ' idea-graphic-left-panel__group';
      this.stickyEl.innerHTML = '';
      this.stickyEl.appendChild(stickyAccordion.element);
      this.accordions.push(stickyAccordion);
    }

    this._updateTileLayout();
  }

  private _blocksContainerClass(): string {
    const mode = this.viewMode === 'tiles' ? 'tiles' : 'list';
    return `idea-graphic-left-panel__blocks idea-graphic-left-panel__blocks--${mode}`;
  }

  private _makeBlocksContainer(
    defs: AnyGraphicBlockDefinition[],
    outTiles: BlockTile[],
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = this._blocksContainerClass();
    this.blockContainers.push(container);

    const tileViewMode: BlockTileViewMode = this.viewMode === 'tiles' ? 'tile' : 'list';

    for (const def of defs) {
      const tile = new BlockTile(container, def, this.ctx.i18n, { viewMode: tileViewMode });
      tile.onActivate(() => {
        const focusManager = this.ctx.focusManager;
        if (!focusManager) return;
        focusManager.armPlacement(def.type);
        BlockTile.maybeShowPlacementHint(def.type, this.ctx.i18n, this.ctx.eventBus);
      });
      outTiles.push(tile);
    }

    if (defs.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'idea-graphic-left-panel__empty';
      empty.textContent = this.ctx.i18n.t(GRAPHIC_GROUP_EMPTY);
      container.appendChild(empty);
    }

    return container;
  }

  private _setViewMode(mode: LeftPanelViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.aside.dataset['viewMode'] = mode;
    this._applyViewMode();
    this._syncViewModeButton();
    if (mode === 'tiles') {
      this._updateTileLayout();
    }
  }

  private _applyViewMode(): void {
    const tileViewMode: BlockTileViewMode = this.viewMode === 'tiles' ? 'tile' : 'list';

    for (const container of this.blockContainers) {
      container.className = this._blocksContainerClass();
    }

    for (const tile of this.tiles) {
      tile.setViewMode(tileViewMode);
    }
  }

  private _syncViewModeButton(): void {
    const isTiles = this.viewMode === 'tiles';
    const iconName = isTiles ? 'grid_view' : 'list';
    const labelKey = isTiles ? GRAPHIC_LEFT_PANEL_VIEW_TILES : GRAPHIC_LEFT_PANEL_VIEW_LIST;
    const label = this.ctx.i18n.t(labelKey);

    let icon = this.viewModeBtn.querySelector<HTMLElement>('.material-symbols-outlined');
    if (!icon) {
      icon = createIcon(iconName);
      this.viewModeBtn.appendChild(icon);
    } else {
      icon.textContent = iconName;
    }

    this.viewModeBtn.setAttribute('title', label);
    this.viewModeBtn.setAttribute('aria-label', label);
  }

  private _expandAll(): void {
    for (const accordion of this.accordions) {
      const groupKey = accordion.element.dataset['groupKey'];
      if (groupKey) {
        accordion.open(groupKey);
      }
    }
  }

  private _collapseAll(): void {
    for (const accordion of this.accordions) {
      for (const id of accordion.getOpen()) {
        accordion.close(id);
      }
    }
  }

  private _applyPanelWidth(width: number): void {
    this.panelWidth = clampPanelWidth(width);
    const px = `${this.panelWidth}px`;
    this.host.style.setProperty(LEFT_PANEL_WIDTH_VAR, px);
    this._updateTileLayout();
  }

  private _updateTileLayout(): void {
    if (this.viewMode !== 'tiles') return;

    for (const container of this.blockContainers) {
      if (!container.classList.contains('idea-graphic-left-panel__blocks--tiles')) continue;
      const itemCount = container.querySelectorAll('.idea-graphic-block-tile').length;
      const cols = computeTileLayout(this.panelWidth, itemCount);
      container.style.setProperty('--tile-cols', String(cols));
    }
  }

  private _bindResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      const width = this.aside.getBoundingClientRect().width;
      if (width > 0) {
        this.panelWidth = clampPanelWidth(Math.round(width));
        this._updateTileLayout();
      }
    });
    this.resizeObserver.observe(this.aside);
  }

  private _handleResizePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    if (typeof this.resizeHandle.setPointerCapture === 'function') {
      this.resizeHandle.setPointerCapture(e.pointerId);
    }
    window.addEventListener('pointermove', this.onResizePointerMove);
    window.addEventListener('pointerup', this.onResizePointerUp);
    window.addEventListener('pointercancel', this.onResizePointerUp);
  }

  private _handleResizePointerMove(e: PointerEvent): void {
    if (
      typeof this.resizeHandle.hasPointerCapture === 'function' &&
      !this.resizeHandle.hasPointerCapture(e.pointerId)
    ) {
      return;
    }

    const hostRect = this.host.getBoundingClientRect();
    const nextWidth = clampPanelWidth(e.clientX - hostRect.left);
    this._applyPanelWidth(nextWidth);
  }

  private _handleResizePointerUp(e: PointerEvent): void {
    if (
      typeof this.resizeHandle.hasPointerCapture === 'function' &&
      !this.resizeHandle.hasPointerCapture(e.pointerId)
    ) {
      return;
    }
    if (typeof this.resizeHandle.releasePointerCapture === 'function') {
      this.resizeHandle.releasePointerCapture(e.pointerId);
    }
    window.removeEventListener('pointermove', this.onResizePointerMove);
    window.removeEventListener('pointerup', this.onResizePointerUp);
    window.removeEventListener('pointercancel', this.onResizePointerUp);
  }

  private _destroyAccordions(): void {
    for (const a of this.accordions) a.destroy();
    this.accordions = [];
    for (const t of this.tiles) t.destroy();
    this.tiles = [];
    this.blockContainers = [];
    this.scrollEl.innerHTML = '';
    this.stickyEl.innerHTML = '';
  }

  destroy(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.resizeHandle.removeEventListener('pointerdown', this.onResizePointerDown);
    window.removeEventListener('pointermove', this.onResizePointerMove);
    window.removeEventListener('pointerup', this.onResizePointerUp);
    window.removeEventListener('pointercancel', this.onResizePointerUp);

    this._destroyAccordions();
    this.host.style.removeProperty(LEFT_PANEL_WIDTH_VAR);
    this.aside.remove();
  }
}
