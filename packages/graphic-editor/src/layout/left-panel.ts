import './left-panel.scss';
import { Accordion } from '@shared/components/accordion/accordion';
import type { AccordionItem } from '@shared/components/accordion/accordion';
import type { GraphicContext } from '../engine/graphic-context';
import { CUSTOM_BLOCK_GROUP_KEY } from '../blocks/block-registry';
import type { AnyGraphicBlockDefinition } from '../blocks/block-registry';
import { BlockTile } from './block-tile';
import { GRAPHIC_GROUP_CUSTOM, GRAPHIC_GROUP_EMPTY } from '../i18n/keys';

const UNGROUPED_KEY = '__ungrouped';

export interface LeftPanelOptions {
  /** Group keys whose accordion starts expanded. Defaults to the first group's key. */
  initiallyExpandedGroups?: string[];
  /** Hide certain groups entirely. */
  hiddenGroups?: string[];
}

export class LeftPanel {
  private readonly aside: HTMLElement;
  private readonly scrollEl: HTMLElement;
  private readonly stickyEl: HTMLElement;

  private accordions: Accordion[] = [];
  private tiles: BlockTile[] = [];

  private rafHandle: number | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly ctx: GraphicContext,
    private readonly options: LeftPanelOptions = {},
  ) {
    this.aside = document.createElement('aside');
    this.aside.className = 'idea-graphic-left-panel';

    this.scrollEl = document.createElement('div');
    this.scrollEl.className = 'idea-graphic-left-panel__scroll';

    this.stickyEl = document.createElement('div');
    this.stickyEl.className = 'idea-graphic-left-panel__sticky';

    this.aside.appendChild(this.scrollEl);
    this.aside.appendChild(this.stickyEl);
  }

  /** Mount the aside before the first child of `host` (i.e., before the canvas). */
  mount(): void {
    this.host.insertBefore(this.aside, this.host.firstChild);
    this.refresh();
  }

  refresh(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      this._doRefresh();
    });
  }

  private _doRefresh(): void {
    this._destroyAccordions();

    const { registry, i18n } = this.ctx;
    const allGroups = registry.getGroups();

    const hiddenSet = new Set(this.options.hiddenGroups ?? []);

    // Named groups — exclude special bucket keys
    const namedGroups = allGroups.filter(
      (g) =>
        g.groupKey !== CUSTOM_BLOCK_GROUP_KEY &&
        g.groupKey !== UNGROUPED_KEY &&
        !hiddenSet.has(g.groupKey),
    );

    // Determine which group keys start expanded
    const expandedSet = new Set(
      this.options.initiallyExpandedGroups ??
        (namedGroups.length > 0 ? [namedGroups[0].groupKey] : []),
    );

    // Render named-group accordions into scroll area
    for (const group of namedGroups) {
      const groupTiles: BlockTile[] = [];
      const tilesContainer = this._makeTilesContainer(group.definitions, groupTiles);
      this.tiles.push(...groupTiles);

      const i18nKey = `graphic.group.${group.groupKey}`;
      const translated = i18n.t(i18nKey);
      const title = translated === i18nKey ? group.groupKey : translated;

      const item: AccordionItem = {
        id: group.groupKey,
        title,
        content: tilesContainer,
        defaultOpen: expandedSet.has(group.groupKey),
      };

      const accordion = new Accordion({ items: [item], mode: 'single' });
      accordion.element.dataset['groupKey'] = group.groupKey;
      accordion.element.className =
        accordion.element.className + ' idea-graphic-left-panel__group';
      this.scrollEl.appendChild(accordion.element);
      this.accordions.push(accordion);
    }

    // Sticky custom section
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
      const tilesContainer = this._makeTilesContainer(customDefs, stickyTiles);
      this.tiles.push(...stickyTiles);

      const customItem: AccordionItem = {
        id: CUSTOM_BLOCK_GROUP_KEY,
        title: i18n.t(GRAPHIC_GROUP_CUSTOM),
        content: tilesContainer,
        defaultOpen: false,
      };

      const stickyAccordion = new Accordion({ items: [customItem], mode: 'single' });
      stickyAccordion.element.dataset['groupKey'] = CUSTOM_BLOCK_GROUP_KEY;
      stickyAccordion.element.className =
        stickyAccordion.element.className + ' idea-graphic-left-panel__group';
      this.stickyEl.innerHTML = '';
      this.stickyEl.appendChild(stickyAccordion.element);
      this.accordions.push(stickyAccordion);
    }
  }

  private _makeTilesContainer(
    defs: AnyGraphicBlockDefinition[],
    outTiles: BlockTile[],
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'idea-graphic-left-panel__tiles';

    for (const def of defs) {
      const tile = new BlockTile(container, def, this.ctx.i18n);
      tile.onActivate(() => {
        const toolState = this.ctx.toolState;
        if (!toolState) return;
        toolState.beginPlacement(def.type);
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

  private _destroyAccordions(): void {
    for (const a of this.accordions) a.destroy();
    this.accordions = [];
    for (const t of this.tiles) t.destroy();
    this.tiles = [];
    this.scrollEl.innerHTML = '';
    this.stickyEl.innerHTML = '';
  }

  destroy(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this._destroyAccordions();
    this.aside.remove();
  }
}
