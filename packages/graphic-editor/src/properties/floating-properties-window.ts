import type { GraphicElement } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import { FloatingWindow } from '@shared/components/floating-window';
import { Accordion } from '@shared/components/accordion';
import type { AccordionItem } from '@shared/components/accordion';
import type { GraphicContext } from '../engine/graphic-context';
import type { GraphicBlockProperty } from '../blocks/properties';
import type { RendererResult, RendererContext } from './property-renderers/types';
import { createBorderRenderer } from './property-renderers/border-property';
import { createBackgroundRenderer } from './property-renderers/background-property';
import { createStrokeColorRenderer } from './property-renderers/stroke-color-property';
import { createTextColorRenderer } from './property-renderers/text-color-property';
import { createFontSizeRenderer } from './property-renderers/font-size-property';
import { createTextRenderer } from './property-renderers/text-property';
import { createPivotsRenderer } from './property-renderers/pivots-property';
import { createHtmlTemplateRenderer } from './property-renderers/html-template-property';
import { createCustomRenderer } from './property-renderers/custom-property';
import {
  GRAPHIC_PROPS_BORDER,
  GRAPHIC_PROPS_BACKGROUND,
  GRAPHIC_PROPS_STROKE_COLOR,
  GRAPHIC_PROPS_TEXT_COLOR,
  GRAPHIC_PROPS_FONT_SIZE,
  GRAPHIC_PROPS_WINDOW_TITLE,
  GRAPHIC_PROPS_WINDOW_CLOSE,
  GRAPHIC_PROPS_TEXT,
  GRAPHIC_PROPS_HTML_TEMPLATE,
  GRAPHIC_PROPS_PIVOTS,
  GRAPHIC_PROPS_THICKNESS,
  GRAPHIC_PROPS_COLOR,
} from '../i18n/keys';
import floatingPropsStyles from './floating-properties-window.scss?inline';

export interface FloatingPropertiesWindowConfig {
  i18n: I18nService;
  ctx: GraphicContext;
  /** CSS selector used to constrain the window within the canvas. */
  hostSelector: string;
  /** Called when the user clicks the close icon or selection becomes empty. */
  onClose?: () => void;
  /** Called whenever the focused state changes (for highlighting the block). */
  onFocusedTargetChange?: (targetId: string | null) => void;
}

interface ActiveRenderer {
  property: GraphicBlockProperty;
  result: RendererResult;
}

let stylesInjected = false;

function ensureStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = floatingPropsStyles;
  document.head.appendChild(style);
}

export class FloatingPropertiesWindow {
  private readonly host: HTMLElement;
  private readonly config: FloatingPropertiesWindowConfig;
  private floatingWindow: FloatingWindow | null = null;
  private accordion: Accordion | null = null;
  private activeRenderers: ActiveRenderer[] = [];
  private currentNodeId: string | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(host: HTMLElement, config: FloatingPropertiesWindowConfig) {
    ensureStyles();
    this.host = host;
    this.config = config;
  }

  open(node: GraphicElement): void {
    const { i18n, ctx } = this.config;
    const def = ctx.registry.has(node.type) ? ctx.registry.get(node.type) : null;

    this._destroyWindow();
    this.currentNodeId = node.id;

    const body = this._buildBody(node, def);
    const label = def
      ? (def.labelKey ? i18n.t(def.labelKey) : (def.staticLabel ?? node.type))
      : node.type;

    this.floatingWindow = new FloatingWindow({
      title: i18n.t(GRAPHIC_PROPS_WINDOW_TITLE, { label }),
      body,
      boundsSelector: this.config.hostSelector,
      initialPosition: this._calcInitialPosition(),
      targetId: node.id,
      closeAriaLabel: i18n.t(GRAPHIC_PROPS_WINDOW_CLOSE),
      onClose: () => {
        this.config.onClose?.();
      },
      onFocusedTargetChange: (id) => {
        this.config.onFocusedTargetChange?.(id);
      },
    });

    this.floatingWindow.mount(this.host);
    this.floatingWindow.focus();

    this._subscribeToUpdates();
  }

  /** Engage the floating window and notify the host of the focused target. */
  focus(): void {
    this.floatingWindow?.focus();
  }

  setNode(node: GraphicElement): void {
    if (node.id !== this.currentNodeId || !this.floatingWindow) {
      this.open(node);
      return;
    }

    for (const { result } of this.activeRenderers) {
      if (!result.isActive?.()) {
        result.setValue?.(node);
      }
    }
  }

  close(): void {
    this._destroyWindow();
  }

  destroy(): void {
    this._destroyWindow();
  }

  /** Id of the node this window is bound to, or null if closed. */
  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private _calcInitialPosition(): { x: number; y: number } {
    const hostRect = this.host.getBoundingClientRect();
    const windowWidth = 320;
    const margin = 16; // $spacing-md
    return {
      x: hostRect.width - windowWidth - margin,
      y: margin,
    };
  }

  private _buildBody(node: GraphicElement, def: import('../blocks/block-definition').GraphicBlockDefinition | null): HTMLElement {
    const { i18n, ctx } = this.config;
    const styleMemory = ctx.styleMemory;

    this.activeRenderers = [];

    const renderCtx = {
      document: ctx.document,
      page: ctx.page,
      registry: ctx.registry,
      rootElement: ctx.rootElement,
      i18n,
      undoRedoManager: ctx.undoRedoManager,
      eventBus: ctx.eventBus,
      overlayHost: this.host,
    };

    const properties = def?.properties?.(node, renderCtx) ?? [];

    const rendCtx: RendererContext = { node, ctx, styleMemory };

    const textItems: { prop: GraphicBlockProperty; result: RendererResult }[] = [];
    const fontSizeItems: { prop: GraphicBlockProperty; result: RendererResult }[] = [];
    const otherItems: { prop: GraphicBlockProperty; result: RendererResult }[] = [];

    for (const prop of properties) {
      if (def && def.supportsDefaultText === false && prop.kind === 'text') {
        continue;
      }

      const result = this._buildRenderer(prop, rendCtx, i18n);
      if (!result) continue;

      if (prop.kind === 'text') {
        textItems.push({ prop, result });
      } else if (prop.kind === 'fontSize') {
        fontSizeItems.push({ prop, result });
      } else {
        otherItems.push({ prop, result });
      }
    }

    const orderedItems = [...textItems, ...fontSizeItems, ...otherItems];

    const accordionItems: AccordionItem[] = orderedItems.map(({ prop, result }) => {
      this.activeRenderers.push({ property: prop, result });
      return {
        id: this._propId(prop),
        title: this._propTitle(prop, i18n),
        content: result.element,
        defaultOpen: true,
      };
    });

    this.accordion = new Accordion({ items: accordionItems, mode: 'multiple' });
    return this.accordion.element;
  }

  private _buildRenderer(
    prop: GraphicBlockProperty,
    rendCtx: RendererContext,
    i18n: I18nService,
  ): RendererResult | null {
    switch (prop.kind) {
      case 'border':
        return createBorderRenderer(
          prop,
          rendCtx,
          i18n.t(GRAPHIC_PROPS_THICKNESS),
          i18n.t(GRAPHIC_PROPS_COLOR),
        );
      case 'background':
        return createBackgroundRenderer(prop, rendCtx);
      case 'strokeColor':
        return createStrokeColorRenderer(prop, rendCtx);
      case 'textColor':
        return createTextColorRenderer(prop, rendCtx);
      case 'fontSize':
        return createFontSizeRenderer(prop, rendCtx);
      case 'text':
        return createTextRenderer(prop, rendCtx, i18n);
      case 'pivots':
        return createPivotsRenderer(prop, rendCtx);
      case 'htmlTemplate':
        return createHtmlTemplateRenderer(prop);
      case 'custom':
        return createCustomRenderer(prop);
      default:
        return null;
    }
  }

  private _propId(prop: GraphicBlockProperty): string {
    switch (prop.kind) {
      case 'border':     return 'prop-border';
      case 'background': return 'prop-background';
      case 'strokeColor': return 'prop-strokeColor';
      case 'textColor':  return 'prop-textColor';
      case 'fontSize':   return 'prop-fontSize';
      case 'text':       return 'prop-text';
      case 'pivots':     return 'prop-pivots';
      case 'htmlTemplate': return `prop-tpl-${prop.titleKey}`;
      case 'custom':     return `prop-custom-${prop.titleKey}`;
    }
  }

  private _propTitle(prop: GraphicBlockProperty, i18n: I18nService): string {
    switch (prop.kind) {
      case 'border':       return i18n.t(GRAPHIC_PROPS_BORDER);
      case 'background':   return i18n.t(GRAPHIC_PROPS_BACKGROUND);
      case 'strokeColor':  return i18n.t(GRAPHIC_PROPS_STROKE_COLOR);
      case 'textColor':    return i18n.t(GRAPHIC_PROPS_TEXT_COLOR);
      case 'fontSize':     return i18n.t(GRAPHIC_PROPS_FONT_SIZE);
      case 'text':         return i18n.t(GRAPHIC_PROPS_TEXT);
      case 'pivots':       return i18n.t(GRAPHIC_PROPS_PIVOTS);
      case 'htmlTemplate': return i18n.t(prop.titleKey);
      case 'custom':       return i18n.t(prop.titleKey);
    }
  }

  private _subscribeToUpdates(): void {
    for (const d of this.disposers) d();
    this.disposers.length = 0;

    const { ctx } = this.config;
    const nodeId = this.currentNodeId;

    const disposer = ctx.eventBus.on('element:update', () => {
      if (!nodeId) return;
      const updated = ctx.page.elements.find(e => e.id === nodeId);
      if (updated) {
        this.setNode(updated);
      }
    });

    this.disposers.push(disposer);
  }

  private _destroyWindow(): void {
    for (const d of this.disposers) d();
    this.disposers.length = 0;

    this.accordion?.destroy();
    this.accordion = null;
    this.activeRenderers = [];

    this.floatingWindow?.unmount();
    this.floatingWindow = null;
    this.currentNodeId = null;
  }
}
