import type { DocumentNode, GraphicPageNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import { I18nService } from '@core/i18n/i18n';
import { createGraphicPage } from '@core/model/factory';
import { ShortcutManager, isKeyboardEventFromEditableTarget } from '@core/shortcuts/shortcut-manager';
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
import { ToolState } from './tool-state';
import type { ToolStateSnapshot } from './tool-state';
import { hitTest } from './hit-tester';
import { RemoveSelectionCommand } from './commands/remove-selection-command';
import { StyleMemoryService } from '../preferences/style-memory-service';
import { FloatingPropertiesWindow } from '../properties/floating-properties-window';
import { GroupPropertiesWindow } from '../properties/group-properties-window';
import { GroupController } from '../groups/group-controller';
import { GraphicFocusManager } from './graphic-focus-manager';
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
  /** When true, the four built-in blocks (rectangle, triangle, circle, sticker) are NOT registered. */
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
    this.ctx.focusManager = new GraphicFocusManager(this.selectionManager, this.toolState);
    this.dragController = new DragController(this.ctx, this.selectionManager);
    this.resizeController = new ResizeController(this.ctx, this.selectionManager);
    this.lassoController = new LassoController(this.ctx, this.selectionManager, selectionLayer);

    // Placement controller (ghost + sticker single-click)
    this.placementController = new PlacementController(this.ctx, this.selectionManager, canvas);

    // Frame controller (drag-to-create frames)
    this.frameController = new FrameController(this.ctx, canvas, this.canvasRenderer);

    // Pen controller (freehand path drawing)
    this.penController = new PenController(this.ctx, canvas, this.canvasRenderer);

    // Apply initial viewport and render initial page state
    this.canvasRenderer.applyViewport(viewportController);
    this.canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer());

    // Zoom panel — mounted inside canvas so it stays in the canvas grid column
    this.zoomPanel = new ZoomPanel(viewportController, canvas, eventBus, i18n);
    this.zoomPanel.mount(canvas);

    // Bottom toolbar — mounted inside canvas so it stays in the canvas grid column
    this.bottomToolbar = new BottomToolbar(eventBus, i18n, {
      onToolSelect: (tool) => this.ctx.focusManager!.activateTool(tool),
    });
    this.bottomToolbar.mount(canvas);

    // Left panel block library — inserted before canvas (first child) → grid column 1
    this.leftPanel = new LeftPanel(this, this.ctx, options?.leftPanel);
    this.leftPanel.mount();

    // Keyboard shortcuts (graphic scope) — attach to host so they work when focus
    // is outside the canvas (e.g. left panel) and for contenteditable shape text.
    this.shortcutManager = new ShortcutManager();
    this.shortcutManager.setScope('graphic');
    this._registerShortcuts();
    this.eventDisposers.push(this.shortcutManager.attach(this));

    const onShapeTextFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const host = t.closest('.idea-graphic-shape__text');
      if (!(host instanceof HTMLElement)) return;
      const id = host.getAttribute('data-element-id');
      if (!id || !this.selectionManager) return;
      if (!this.selectionManager.has(id)) {
        this.selectionManager.setSelection([{ type: 'element', id }]);
      }
      this.selectionManager.setFocusedHighlight(id);
    };
    this.addEventListener('focusin', onShapeTextFocusIn);
    this.eventDisposers.push(() => this.removeEventListener('focusin', onShapeTextFocusIn));

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

  private _registerShortcuts(): void {
    const { i18n, undoRedoManager } = this.ctx;
    const notFromEditableField = (e: KeyboardEvent) => !isKeyboardEventFromEditableTarget(e);

    this.shortcutManager.registerAll([
      {
        keys: 'mod+z',
        scope: 'graphic',
        label: i18n.t('topbar.undo'),
        command: () => { undoRedoManager.undo(); },
      },
      {
        keys: 'mod+shift+z',
        scope: 'graphic',
        label: i18n.t('topbar.redo'),
        command: () => { undoRedoManager.redo(); },
      },
      {
        keys: 'mod+y',
        scope: 'graphic',
        label: i18n.t('topbar.redo'),
        command: () => { undoRedoManager.redo(); },
      },
      {
        keys: 'v',
        scope: 'graphic',
        label: 'Selection tool',
        when: notFromEditableField,
        command: () => { this.ctx.focusManager!.activateTool('selection'); },
      },
      {
        keys: 'f',
        scope: 'graphic',
        label: 'Frame tool',
        when: notFromEditableField,
        command: () => { this.ctx.focusManager!.activateTool('frame'); },
      },
      {
        keys: 'p',
        scope: 'graphic',
        label: 'Pen tool',
        when: notFromEditableField,
        command: () => { this.ctx.focusManager!.activateTool('pen'); },
      },
      {
        keys: 's',
        scope: 'graphic',
        label: 'Sticker tool',
        when: notFromEditableField,
        command: () => { this.ctx.focusManager!.activateTool('sticker'); },
      },
      {
        keys: 'h',
        scope: 'graphic',
        label: 'Hand tool',
        when: notFromEditableField,
        command: () => { this.ctx.focusManager!.activateTool('hand'); },
      },
      {
        keys: 'escape',
        scope: 'graphic',
        label: 'Cancel placement or clear selection',
        when: notFromEditableField,
        command: () => {
          if (this.toolState.getTool() === 'placement') {
            this.toolState.cancelPlacement();
          } else if (this.toolState.getTool() === 'sticker') {
            this.ctx.focusManager!.activateTool('selection');
          } else if (this.toolState.getTool() === 'frame') {
            if (this.frameController.isDrawing()) {
              this.frameController.cancelDraw();
            } else {
              this.ctx.focusManager!.activateTool('selection');
            }
          } else if (this.toolState.getTool() === 'pen') {
            if (this.penController.isDrawing()) {
              this.penController.cancelDraw();
            } else {
              this.ctx.focusManager!.activateTool('selection');
            }
          } else if (this.toolState.getTool() === 'hand') {
            this.ctx.focusManager!.activateTool('selection');
          } else {
            this.ctx.focusManager!.clearCanvasFocus();
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

    if (this.floatingPropertiesWindow?.getCurrentNodeId() === el.id) {
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

    // Pointer-based tool routing: placement/sticker → frame → pen → selection
    const onPointerDown = (e: PointerEvent) => {
      // Middle-button / space+left-button handled by panning logic above
      if (e.button !== 0) return;
      if (isSpaceDown) return;

      // Hand tool: panning is handled entirely in onMouseDown; absorb the pointer event
      if (this.toolState.getTool() === 'hand') return;

      const tool = this.toolState.getTool();

      if (tool === 'placement' || tool === 'sticker') {
        this.placementController.handlePointerDown(e);
        return;
      }

      if (tool === 'frame') {
        this.frameController.handlePointerDown(e);
        return;
      }

      if (tool === 'pen') {
        this.penController.handlePointerDown(e);
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
