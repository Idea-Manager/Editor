import type { DocumentNode, GraphicPageNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import { I18nService } from '@core/i18n/i18n';
import { createGraphicPage } from '@core/model/factory';
import { ShortcutManager } from '@core/shortcuts/shortcut-manager';
import type { GraphicContext } from './graphic-context';
import { ViewportController, type Viewport, type ViewportChangeReason } from './viewport-controller';
import { CanvasRenderer } from './canvas-renderer';
import { SetViewportCommand } from './commands/set-viewport-command';
import { ZoomPanel } from '../layout/zoom-panel';
import { BottomToolbar } from '../layout/bottom-toolbar';
import { GRAPHIC_PAGE_UNTITLED } from '../i18n/keys';
import { GraphicBlockRegistry } from '../blocks/block-registry';
import { registerDefaultBlocks } from '../blocks/index';
import type { GraphicBlockDefinition } from '../blocks/block-definition';
import { GraphicSelectionManager } from './selection-manager';
import { DragController } from './drag-controller';
import { ResizeController } from './resize-controller';
import { LassoController } from './lasso-controller';
import { PlacementController } from './placement-controller';
import { FrameController } from './frame-controller';
import { PenController } from './pen-controller';
import { ArrowController } from './arrow-controller';
import { ArrowLabelEditor } from './arrow-label-editor';
import { ToolState } from './tool-state';
import type { ToolStateSnapshot } from './tool-state';
import { hitTest } from './hit-tester';
import { RemoveSelectionCommand } from './commands/remove-selection-command';
import { UpdateElementCommand } from './commands/update-element-command';
import { FlyoutArrowToolbar } from '../toolbar/flyout-arrow-toolbar';
import type { ArrowToolbarValues } from '../toolbar/flyout-arrow-toolbar';
import type { ArrowData } from '../blocks/arrow/arrow-block';
import { ARROW_DEFAULTS } from '../blocks/arrow/arrow-block';
import { arrowMidpoint } from '../blocks/arrow/arrow-geometry';
import { getGraphicPreferences } from '@core/model/document-data';
import { StyleMemoryService } from '../preferences/style-memory-service';
import { FloatingPropertiesWindow } from '../properties/floating-properties-window';
import { GroupPropertiesWindow } from '../properties/group-properties-window';
import { GroupController } from '../groups/group-controller';
import { LeftPanel } from '../layout/left-panel';
import type { LeftPanelOptions } from '../layout/left-panel';
import groupPropertiesWindowStyles from '../properties/group-properties-window.scss?inline';
import graphicEditorStyles from './graphic-editor.scss?inline';
import zoomPanelStyles from '../layout/zoom-panel.scss?inline';
import toolStateStyles from './tool-state.scss?inline';
import baseShapeStyles from '../blocks/shapes/base-shape.scss?inline';
import stickerStyles from '../blocks/sticker/sticker.scss?inline';
import selectionManagerStyles from './selection-manager.scss?inline';
import bottomToolbarStyles from '../layout/bottom-toolbar.scss?inline';
import frameRendererStyles from './frame-renderer.scss?inline';
import pathBlockStyles from '../blocks/path/path-block.scss?inline';
import arrowBlockStyles from '../blocks/arrow/arrow-block.scss?inline';
import flyoutArrowToolbarStyles from '../toolbar/flyout-arrow-toolbar.scss?inline';
import leftPanelStyles from '../layout/left-panel.scss?inline';
import blockTileStyles from '../layout/block-tile.scss?inline';

export interface GraphicEditorOptions {
  locale?: Locale;
  /** Active page id; default: first existing page or auto-create one named "Untitled". */
  pageId?: string;
  /** When false, skip the bundled CSS injection. Default true. */
  includeDefaultStyles?: boolean;
  /** Optional extra style text added per host. */
  extraStyleText?: string;
  /** Optional locale overrides — merged on top of the active locale. */
  i18nOverrides?: Partial<TranslationDictionary>;
  /** When true, the five built-in blocks (rectangle, triangle, circle, ellipse, sticker) are NOT registered. */
  skipDefaultBlocks?: boolean;
  /** Custom blocks to register in addition to (or instead of) the defaults. */
  blocks?: GraphicBlockDefinition[];
  /** Options for the left-panel block library. */
  leftPanel?: LeftPanelOptions;
}

const STYLE_ID = 'idea-graphic-editor-styles';
const EXTRA_STYLE_CLASS = 'idea-graphic-editor-extra-style';

const DEFAULT_STYLE_BUNDLES: string[] = [
  graphicEditorStyles,
  zoomPanelStyles,
  toolStateStyles,
  baseShapeStyles,
  stickerStyles,
  selectionManagerStyles,
  bottomToolbarStyles,
  frameRendererStyles,
  pathBlockStyles,
  arrowBlockStyles,
  flyoutArrowToolbarStyles,
  groupPropertiesWindowStyles,
  leftPanelStyles,
  blockTileStyles,
];

function ensureGlobalStyles(options: GraphicEditorOptions | undefined): void {
  if (document.getElementById(STYLE_ID)) return;
  if (options?.includeDefaultStyles === false) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DEFAULT_STYLE_BUNDLES.join('\n');
  document.head.appendChild(style);
}

function setExtraStyle(host: HTMLElement, extra: string | undefined): void {
  const existing = host.getElementsByClassName(EXTRA_STYLE_CLASS)[0] as HTMLStyleElement | undefined;
  if (extra == null || extra === '') {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('style');
  el.classList.add(EXTRA_STYLE_CLASS);
  el.textContent = extra;
  if (!existing) host.appendChild(el);
}

export class GraphicEditor extends HTMLElement {
  private ctx!: GraphicContext;
  private canvasRenderer!: CanvasRenderer;
  private canvasEl!: HTMLDivElement;
  private zoomPanel!: ZoomPanel;
  private instanceId!: string;
  private resizeObserver: ResizeObserver | null = null;
  private readonly eventDisposers: (() => void)[] = [];

  private toolState!: ToolState;
  private selectionManager!: GraphicSelectionManager;
  private dragController!: DragController;
  private resizeController!: ResizeController;
  private lassoController!: LassoController;
  private placementController!: PlacementController;
  private frameController!: FrameController;
  private penController!: PenController;
  private arrowController!: ArrowController;
  private arrowLabelEditor!: ArrowLabelEditor;
  private flyoutArrowToolbar: FlyoutArrowToolbar | null = null;
  private floatingPropertiesWindow: FloatingPropertiesWindow | null = null;
  private groupController: GroupController | null = null;
  private bottomToolbar!: BottomToolbar;
  private leftPanel!: LeftPanel;
  private shortcutManager!: ShortcutManager;

  // Mutable reference used by the viewport controller closures so that
  // replaceDocument / setPage can swap pages without rebuilding ViewportController.
  private activePage!: GraphicPageNode;

  connectedCallback(): void {
    // Idempotent: safe to call more than once (e.g. HMR remount, or called defensively from init()).
    if (this.instanceId) return;
    this.classList.add('idea-graphic-editor');
    this.instanceId = `ge-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Called by the host after this element transitions from display:none to visible.
   * Re-applies the viewport transform and re-renders so absolutely-positioned
   * overlays (zoom panel, bottom toolbar, selection layer) land in the right place.
   *
   * Idempotent and safe to call any time after init(). No-op before init().
   * Does NOT push an undoable command.
   */
  onHostResize(): void {
    if (!this.ctx) return;
    this.canvasRenderer.applyViewport(this.ctx.viewportController);
    this.canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer());
    this.ctx.eventBus.emit('viewport:change', {
      pageId: this.activePage.id,
      viewport: this.activePage.viewport,
      reason: 'set',
    });
  }

  init(
    doc: DocumentNode,
    eventBus: EventBus,
    undoRedoManager: UndoRedoManager,
    options?: GraphicEditorOptions,
  ): void {
    // init() may be called before connectedCallback if the host inserts us off-tree.
    // Calling connectedCallback() directly is safe because it is idempotent.
    if (!this.instanceId) this.connectedCallback();

    ensureGlobalStyles(options);
    setExtraStyle(this, options?.extraStyleText);

    const i18n = new I18nService(options?.locale ?? 'en', options?.i18nOverrides);
    this.activePage = this.resolvePage(doc, options?.pageId, i18n);

    const viewportController = new ViewportController(
      () => this.activePage.viewport,
      (next: Viewport, reason: ViewportChangeReason) => {
        const cmd = new SetViewportCommand(doc, this.activePage.id, next, reason);
        undoRedoManager.push(cmd);
        eventBus.emit('doc:change');
        eventBus.emit('viewport:change', { pageId: this.activePage.id, viewport: next, reason });
      },
    );

    // Build block registry
    const registry = new GraphicBlockRegistry();
    if (!options?.skipDefaultBlocks) {
      registerDefaultBlocks(registry);
    }
    for (const block of options?.blocks ?? []) {
      registry.register(block);
    }
    // Register any custom blocks already persisted in the document
    registry.syncCustomBlocks(doc);

    this.toolState = new ToolState(eventBus);

    const styleMemory = new StyleMemoryService(doc, undoRedoManager);

    this.ctx = {
      document: doc,
      page: this.activePage,
      undoRedoManager,
      eventBus,
      rootElement: this,
      i18n,
      viewportController,
      registry,
      toolState: this.toolState,
      styleMemory,
    };

    // Expose instanceId on the root element so block renderers can reference
    // SVG filter IDs (e.g. sticker shadow).
    this.dataset.instanceId = this.instanceId;

    // Build canvas layers
    this.canvasRenderer = new CanvasRenderer();
    const { canvas, selectionLayer } = this.canvasRenderer.build(this, this.instanceId);
    this.canvasEl = canvas;

    // Selection system
    this.selectionManager = new GraphicSelectionManager(this.ctx);
    this.dragController = new DragController(this.ctx, this.selectionManager);
    this.resizeController = new ResizeController(this.ctx, this.selectionManager);
    this.lassoController = new LassoController(this.ctx, this.selectionManager, selectionLayer);

    // Placement controller (ghost + sticker single-click)
    this.placementController = new PlacementController(this.ctx, this.selectionManager, canvas);

    // Frame controller (drag-to-create frames)
    this.frameController = new FrameController(this.ctx, canvas, this.canvasRenderer);

    // Pen controller (freehand path drawing)
    this.penController = new PenController(this.ctx, canvas, this.canvasRenderer);

    // Arrow controller (drawing + endpoint editing)
    this.arrowController = new ArrowController(this.ctx, canvas, this.canvasRenderer, this.selectionManager);

    // Arrow label editor (double-click → inline label input)
    this.arrowLabelEditor = new ArrowLabelEditor(this.ctx, canvas);

    // Apply initial viewport and render initial page state
    this.canvasRenderer.applyViewport(viewportController);
    this.canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer());

    // Zoom panel — mounted inside canvas so it stays in the canvas grid column
    this.zoomPanel = new ZoomPanel(viewportController, canvas, eventBus, i18n);
    this.zoomPanel.mount(canvas);

    // Bottom toolbar — mounted inside canvas so it stays in the canvas grid column
    this.bottomToolbar = new BottomToolbar(eventBus, i18n, {
      onToolSelect: (tool) => this.toolState.setTool(tool),
    });
    this.bottomToolbar.mount(canvas);

    // Left panel block library — inserted before canvas (first child) → grid column 1
    this.leftPanel = new LeftPanel(this, this.ctx, options?.leftPanel);
    this.leftPanel.mount();

    // Keyboard shortcuts (graphic scope)
    this.shortcutManager = new ShortcutManager();
    this.shortcutManager.setScope('graphic');
    this._registerShortcuts(canvas);
    this.eventDisposers.push(this.shortcutManager.attach(canvas));

    const rerender = () => {
      this.canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer());
    };

    // Subscribe to viewport changes to update the canvas transform + re-render
    this.eventDisposers.push(
      eventBus.on('viewport:change', () => {
        this.canvasRenderer.applyViewport(viewportController);
        rerender();
      }),
      eventBus.on('element:add', rerender),
      eventBus.on('element:remove', rerender),
      eventBus.on('element:update', rerender),
      eventBus.on('frame:add', rerender),
      eventBus.on('frame:remove', rerender),
      eventBus.on('frame:update', rerender),
      eventBus.on('doc:change', rerender),
      eventBus.on('selection:change', rerender),
      eventBus.on('history:undo', () => {
        this.canvasRenderer.applyViewport(viewportController);
        rerender();
        eventBus.emit('viewport:change', {
          pageId: this.activePage.id,
          viewport: this.activePage.viewport,
          reason: 'set',
        });
      }),
      eventBus.on('history:redo', () => {
        this.canvasRenderer.applyViewport(viewportController);
        rerender();
        eventBus.emit('viewport:change', {
          pageId: this.activePage.id,
          viewport: this.activePage.viewport,
          reason: 'set',
        });
      }),
    );

    this.bindPointerEvents(canvas, viewportController);
    this._bindArrowInteractions(canvas, viewportController);

    // Sync custom block definitions whenever the document's customBlocks array changes,
    // then refresh the left panel so new custom blocks appear immediately.
    this.eventDisposers.push(
      eventBus.on('doc:change', () => {
        registry.syncCustomBlocks(this.ctx.document);
        this.leftPanel.refresh();
      }),
    );

    // GroupController — routes selection:change to the correct window
    this.groupController = new GroupController({
      ctx: this.ctx,
      showPropertiesWindow: (el) => this._openPropertiesWindow(el),
      hidePropertiesWindow: () => this._closePropertiesWindow(),
      showArrowToolbar: (el) => {
        this._showArrowToolbar(
          el as unknown as import('@core/model/interfaces').GraphicElement<import('../blocks/arrow/arrow-block').ArrowData>,
          false,
        );
      },
      hideArrowToolbar: () => this._destroyArrowToolbar(),
      createGroupPropertiesWindow: (host) =>
        new GroupPropertiesWindow(host, {
          i18n: this.ctx.i18n,
          ctx: this.ctx,
          hostSelector: '.idea-graphic-editor',
          selection: this.selectionManager.getSelection(),
          onClose: () => {
            this.selectionManager?.clear();
          },
        }),
    });

    // ResizeObserver keeps layout fresh whenever the host element's box changes
    // (window resize, side-panel toggle, etc.). Disconnected in disconnectedCallback.
    this.resizeObserver = new ResizeObserver(() => this.onHostResize());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.querySelector(`.${EXTRA_STYLE_CLASS}`)?.remove();
    this.zoomPanel?.destroy();
    this.bottomToolbar?.destroy();
    this.leftPanel?.destroy();
    this.shortcutManager?.destroy();
    this.placementController?.destroy();
    this.frameController?.destroy();
    this.penController?.destroy();
    this.arrowController?.destroy();
    this.arrowLabelEditor?.destroy();
    this.flyoutArrowToolbar?.destroy();
    this.flyoutArrowToolbar = null;
    this.floatingPropertiesWindow?.destroy();
    this.floatingPropertiesWindow = null;
    this.groupController?.destroy();
    this.groupController = null;
    this.canvasRenderer?.destroy();
    this.selectionManager?.destroy();
    this.dragController?.destroy();
    this.resizeController?.destroy();
    this.lassoController?.destroy();
    this.eventDisposers.forEach(fn => fn());
    this.eventDisposers.length = 0;
  }

  getContext(): GraphicContext {
    return this.ctx;
  }

  getViewport(): Viewport {
    return { ...this.ctx.page.viewport };
  }

  /** Replace document root (e.g. after JSON import). Rebinds without leaks. */
  replaceDocument(doc: DocumentNode): void {
    if (!this.ctx) return;
    this.ctx.document = doc;
    this.ctx.undoRedoManager.clear();
    this.selectionManager?.clear();

    // Rebind to the first available page, or create one.
    // The ViewportController closures reference `this.activePage`, so updating
    // it here is sufficient — no need to rebuild the controller.
    this.activePage = this.resolvePage(doc, undefined, this.ctx.i18n);
    this.ctx.page = this.activePage;

    this.canvasRenderer.applyViewport(this.ctx.viewportController);
    this.canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer());
    this.ctx.eventBus.emit('viewport:change', {
      pageId: this.activePage.id,
      viewport: this.activePage.viewport,
      reason: 'set',
    });
  }

  /** Switch to a different graphic page by id. */
  setPage(pageId: string): void {
    if (!this.ctx) return;
    const page = this.ctx.document.graphicPages.find(p => p.id === pageId);
    if (!page) return;
    this.activePage = page;
    this.ctx.page = page;
    this.selectionManager?.clear();
    this.canvasRenderer.applyViewport(this.ctx.viewportController);
    this.canvasRenderer.renderPage(page, this.ctx, this._makeSelectionRenderer());
    this.ctx.eventBus.emit('viewport:change', {
      pageId: page.id,
      viewport: page.viewport,
      reason: 'set',
    });
  }

  private _makeSelectionRenderer() {
    return (host: HTMLElement, page: GraphicPageNode, renderCtx: import('./render-context').GraphicRenderContext) => {
      this.selectionManager?.renderOverlay(host, page, renderCtx);
    };
  }

  private _registerShortcuts(canvas: HTMLElement): void {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el?.closest('[contenteditable], input, textarea');
    };

    this.shortcutManager.registerAll([
      {
        keys: 'v',
        scope: 'graphic',
        label: 'Selection tool',
        command: () => { if (!isTyping()) this.toolState.setTool('selection'); },
      },
      {
        keys: 'f',
        scope: 'graphic',
        label: 'Frame tool',
        command: () => { if (!isTyping()) this.toolState.setTool('frame'); },
      },
      {
        keys: 'a',
        scope: 'graphic',
        label: 'Arrow tool',
        command: () => { if (!isTyping()) this.toolState.setTool('arrow'); },
      },
      {
        keys: 'p',
        scope: 'graphic',
        label: 'Pen tool',
        command: () => { if (!isTyping()) this.toolState.setTool('pen'); },
      },
      {
        keys: 's',
        scope: 'graphic',
        label: 'Sticker tool',
        command: () => { if (!isTyping()) this.toolState.setTool('sticker'); },
      },
      {
        keys: 'h',
        scope: 'graphic',
        label: 'Hand tool',
        command: () => { if (!isTyping()) this.toolState.setTool('hand'); },
      },
      {
        keys: 'escape',
        scope: 'graphic',
        label: 'Cancel placement or clear selection',
        command: () => {
          if (isTyping()) return;
          if (this.toolState.getTool() === 'placement') {
            this.toolState.cancelPlacement();
          } else if (this.toolState.getTool() === 'sticker') {
            this.toolState.setTool('selection');
          } else if (this.toolState.getTool() === 'frame') {
            if (this.frameController.isDrawing()) {
              this.frameController.cancelDraw();
            } else {
              this.toolState.setTool('selection');
            }
          } else if (this.toolState.getTool() === 'pen') {
            if (this.penController.isDrawing()) {
              this.penController.cancelDraw();
            } else {
              this.toolState.setTool('selection');
            }
          } else if (this.toolState.getTool() === 'arrow') {
            if (this.arrowController.isDrawing()) {
              this.arrowController.cancelDraw();
            } else {
              this.toolState.setTool('selection');
            }
          } else if (this.toolState.getTool() === 'hand') {
            this.toolState.setTool('selection');
          } else {
            this.selectionManager?.clear();
          }
        },
      },
    ]);

  }

  private resolvePage(doc: DocumentNode, pageId: string | undefined, i18n: I18nService): GraphicPageNode {
    if (pageId) {
      const found = doc.graphicPages.find(p => p.id === pageId);
      if (found) return found;
    }
    if (doc.graphicPages.length > 0) {
      return doc.graphicPages[0];
    }
    const page = createGraphicPage(i18n.t(GRAPHIC_PAGE_UNTITLED));
    doc.graphicPages.push(page);
    return page;
  }

  private _bindArrowInteractions(canvas: HTMLDivElement, vc: ViewportController): void {
    // Double-click on an arrow element body → open label editor
    const onDblClick = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      // Ignore clicks on endpoint handles
      if (tgt.closest('[data-arrow-endpoint]')) return;

      const selection = this.selectionManager?.getSelection() ?? [];
      if (selection.length === 1 && selection[0].type === 'element') {
        const el = this.ctx.page.elements.find(el => el.id === selection[0].id);
        if (el?.type === 'arrow') {
          this.arrowLabelEditor.open(el.id);
        }
      }
    };

    canvas.addEventListener('dblclick', onDblClick);
    this.eventDisposers.push(() => canvas.removeEventListener('dblclick', onDblClick));

    // viewport:change → reposition the toolbar
    this.eventDisposers.push(
      this.ctx.eventBus.on('viewport:change', () => {
        if (!this.flyoutArrowToolbar) return;
        const selection = this.selectionManager?.getSelection() ?? [];
        if (selection.length === 1 && selection[0].type === 'element') {
          const el = this.ctx.page.elements.find(e => e.id === selection[0].id);
          if (el?.type === 'arrow') {
            this._repositionArrowToolbar(el as unknown as import('@core/model/interfaces').GraphicElement<ArrowData>, canvas, vc);
          }
        }
      }),
    );

    // graphic:open-arrow-defaults → show toolbar in defaults mode (no element selected)
    this.eventDisposers.push(
      this.ctx.eventBus.on('graphic:open-arrow-defaults', () => {
        const prefs = getGraphicPreferences(this.ctx.document);
        const savedDefaults = (prefs['arrow'] ?? {}) as Partial<ArrowData>;
        const values: ArrowToolbarValues = { ...ARROW_DEFAULTS, ...savedDefaults };

        // Position above the bottom toolbar's arrow button
        const arrowBtn = this.querySelector<HTMLElement>('[data-tool="arrow"]');
        const hostRect = this.getBoundingClientRect();
        const btnRect = arrowBtn?.getBoundingClientRect();
        const x = btnRect ? btnRect.left - hostRect.left + btnRect.width / 2 : hostRect.width / 2;
        const y = btnRect ? btnRect.top - hostRect.top - 8 : hostRect.height - 64;

        if (this.flyoutArrowToolbar) {
          this.flyoutArrowToolbar.setValues(values);
          this.flyoutArrowToolbar.setPosition({ x, y });
          return;
        }

        this.flyoutArrowToolbar = new FlyoutArrowToolbar(this, {
          i18n: this.ctx.i18n,
          initialValues: values,
          onChange: (next) => {
            for (const [field, value] of Object.entries(next)) {
              this.ctx.styleMemory?.recordUpdate('arrow', `data.${field}`, value);
            }
            this.ctx.eventBus.emit('doc:change');
          },
        });
        this.flyoutArrowToolbar.setPosition({ x, y: y - 48 });
      }),
    );
  }

  private _showArrowToolbar(el: import('@core/model/interfaces').GraphicElement<ArrowData>, _defaults: boolean): void {
    const data = el.data;
    const values: ArrowToolbarValues = {
      heading: data.heading,
      direction: data.direction,
      arrowType: data.arrowType,
      color: data.color,
      thickness: data.thickness,
    };

    const canvas = this.querySelector<HTMLElement>('.idea-graphic-canvas');
    if (!canvas) return;

    if (this.flyoutArrowToolbar) {
      this.flyoutArrowToolbar.setValues(values);
      this._repositionArrowToolbar(el, canvas, this.ctx.viewportController);
      return;
    }

    this.flyoutArrowToolbar = new FlyoutArrowToolbar(this, {
      i18n: this.ctx.i18n,
      initialValues: values,
      onChange: (next) => {
        const updates = Object.entries(next) as [string, unknown][];
        for (const [field, value] of updates) {
          const cmd = new UpdateElementCommand({
            doc: this.ctx.document,
            pageId: this.ctx.page.id,
            elementId: el.id,
            path: `data.${field}`,
            value,
          });
          this.ctx.undoRedoManager.push(cmd);
          this.ctx.styleMemory?.recordUpdate('arrow', `data.${field}`, value);
        }
        this.ctx.eventBus.emit('element:update');
        this.ctx.eventBus.emit('doc:change');
      },
    });

    this._repositionArrowToolbar(el, canvas, this.ctx.viewportController);
  }

  private _repositionArrowToolbar(
    el: import('@core/model/interfaces').GraphicElement<ArrowData>,
    canvas: HTMLElement,
    vc: ViewportController,
  ): void {
    if (!this.flyoutArrowToolbar) return;

    const data = el.data;
    const mid = arrowMidpoint(data.from, data.to, data.arrowType);
    const screenPt = vc.worldToClient(mid.x, mid.y, canvas);
    const hostRect = this.getBoundingClientRect();

    this.flyoutArrowToolbar.setPosition({
      x: screenPt.x - hostRect.left - 100, // approx half toolbar width
      y: screenPt.y - hostRect.top - 48,    // toolbar height + 8px above
    });
  }

  private _destroyArrowToolbar(): void {
    this.flyoutArrowToolbar?.destroy();
    this.flyoutArrowToolbar = null;
  }

  private _openPropertiesWindow(el: import('@core/model/interfaces').GraphicElement): void {
    if (!this.floatingPropertiesWindow) {
      this.floatingPropertiesWindow = new FloatingPropertiesWindow(this, {
        i18n: this.ctx.i18n,
        ctx: this.ctx,
        hostSelector: '.idea-graphic-editor',
        onClose: () => {
          this.selectionManager?.clear();
        },
        onFocusedTargetChange: (targetId) => {
          this.selectionManager?.setFocusedHighlight(targetId);
        },
      });
    }

    if (this.floatingPropertiesWindow['currentNodeId'] === el.id) {
      this.floatingPropertiesWindow.setNode(el);
    } else {
      this.floatingPropertiesWindow.open(el);
    }
  }

  private _closePropertiesWindow(): void {
    this.floatingPropertiesWindow?.close();
  }

  private bindPointerEvents(canvas: HTMLDivElement, vc: ViewportController): void {
    let isPanning = false;
    let isSpaceDown = false;
    let panStartX = 0;
    let panStartY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.pow(1.1, -e.deltaY * 0.01);
      vc.zoomAt({ x: e.clientX, y: e.clientY }, factor, canvas);
    };

    const onMouseDown = (e: MouseEvent) => {
      const isMiddle = e.button === 1;
      const isLeftWithSpace = e.button === 0 && isSpaceDown;
      const isHandLeft = e.button === 0 && this.toolState.getTool() === 'hand';
      if (!isMiddle && !isLeftWithSpace && !isHandLeft) return;
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      if (isHandLeft) {
        canvas.classList.add('idea-graphic-canvas--hand-active');
      } else {
        canvas.classList.add('idea-graphic-canvas--panning-active');
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      vc.panBy(e.clientX - panStartX, e.clientY - panStartY);
      panStartX = e.clientX;
      panStartY = e.clientY;
    };

    const onMouseUp = () => {
      if (!isPanning) return;
      isPanning = false;
      canvas.classList.remove('idea-graphic-canvas--panning-active');
      canvas.classList.remove('idea-graphic-canvas--hand-active');
      if (isSpaceDown) {
        canvas.classList.add('idea-graphic-canvas--panning');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown) {
        isSpaceDown = true;
        canvas.classList.add('idea-graphic-canvas--panning');
      }

      // Delete / Backspace — remove selected elements
      if ((e.code === 'Delete' || e.code === 'Backspace') && !isSpaceDown) {
        // Do not intercept when typing inside an input or contenteditable
        const target = e.target as HTMLElement | null;
        if (target?.closest('[contenteditable], input, textarea')) return;

        const selection = this.selectionManager?.getSelection() ?? [];
        if (selection.length === 0) return;

        e.preventDefault();

        const cmd = new RemoveSelectionCommand({
          doc: this.ctx.document,
          pageId: this.ctx.page.id,
          entries: selection,
          eventBus: this.ctx.eventBus,
        });
        this.ctx.undoRedoManager.push(cmd);
        this.ctx.eventBus.emit('doc:change');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        canvas.classList.remove('idea-graphic-canvas--panning');
      }
    };

    // Pointer-based selection: hit-test then delegate to SelectionManager
    const onPointerDown = (e: PointerEvent) => {
      // Middle-button / space+left-button handled by panning logic above
      if (e.button !== 0) return;
      if (isSpaceDown) return;

      // Hand tool: panning is handled entirely in onMouseDown; absorb the pointer event
      if (this.toolState.getTool() === 'hand') return;

      // Ignore clicks originating from handle / grip / arrow elements
      // (those have pointer-events:auto and get their own handlers)
      const tgt = e.target as HTMLElement;

      // Arrow endpoint handles: delegate to ArrowController for drag
      const endpointHandle = tgt.closest<HTMLElement>('[data-arrow-endpoint]');
      if (endpointHandle) {
        const which = endpointHandle.getAttribute('data-arrow-endpoint') as 'from' | 'to';
        const selection = this.selectionManager.getSelection();
        if (selection.length === 1 && selection[0].type === 'element') {
          this.arrowController.handleEndpointPointerDown(e, selection[0].id, which);
        }
        return;
      }

      if (tgt.closest('.idea-graphic-selection__handle, .idea-graphic-selection__grip, .idea-graphic-selection__arrow')) {
        return;
      }

      // Frame tool intercepts pointer events before the selection system.
      if (this.toolState.getTool() === 'frame') {
        this.frameController.handlePointerDown(e);
        return;
      }

      // Pen tool intercepts pointer events to begin freehand drawing.
      if (this.toolState.getTool() === 'pen') {
        this.penController.handlePointerDown(e);
        return;
      }

      // Arrow tool intercepts pointer events to begin drawing a connector.
      if (this.toolState.getTool() === 'arrow') {
        this.arrowController.handlePointerDown(e);
        return;
      }

      const worldPos = vc.clientToWorld(e.clientX, e.clientY, canvas);
      const target = hitTest(
        this.ctx.page,
        this.ctx.registry,
        worldPos,
        this.selectionManager.getSelection(),
        this.ctx.page.viewport.zoom,
      );

      this.selectionManager.handlePointerDown(e, target);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);

    this.eventDisposers.push(
      this.ctx.eventBus.on<ToolStateSnapshot>('tool:change', (snap) => {
        canvas.classList.toggle('idea-graphic-canvas--hand', snap.tool === 'hand');
        if (snap.tool !== 'hand') {
          canvas.classList.remove('idea-graphic-canvas--hand-active');
        }
      }),
    );

    this.eventDisposers.push(() => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
    });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}
