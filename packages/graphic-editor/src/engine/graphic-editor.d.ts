import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import type { GraphicContext } from './graphic-context';
import { type Viewport } from './viewport-controller';
import type { GraphicBlockDefinition } from '../blocks/block-definition';
import type { LeftPanelOptions } from '../layout/left-panel';
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
    /** When true, canvas is view-only: pan/zoom allowed, editing tools disabled. */
    readOnly?: boolean;
}
export declare class GraphicEditor extends HTMLElement {
    private ctx;
    private canvasRenderer;
    private canvasEl;
    private zoomPanel;
    private instanceId;
    private resizeObserver;
    private readonly eventDisposers;
    private toolState;
    private selectionManager;
    private dragController?;
    private resizeController?;
    private lassoController?;
    private placementController?;
    private frameController?;
    private penController?;
    private floatingPropertiesWindow;
    private groupController;
    private bottomToolbar?;
    private leftPanel?;
    private shortcutManager?;
    private activePage;
    connectedCallback(): void;
    /**
     * Called by the host after this element transitions from display:none to visible.
     * Re-applies the viewport transform and re-renders so absolutely-positioned
     * overlays (zoom panel, bottom toolbar, selection layer) land in the right place.
     *
     * Idempotent and safe to call any time after init(). No-op before init().
     * Does NOT push an undoable command.
     */
    onHostResize(): void;
    init(doc: DocumentNode, eventBus: EventBus, undoRedoManager: UndoRedoManager, options?: GraphicEditorOptions): void;
    disconnectedCallback(): void;
    getContext(): GraphicContext;
    getViewport(): Viewport;
    /** Replace document root (e.g. after JSON import). Rebinds without leaks. */
    replaceDocument(doc: DocumentNode): void;
    /** Switch to a different graphic page by id. */
    setPage(pageId: string): void;
    private _makeSelectionRenderer;
    private _registerShortcuts;
    private resolvePage;
    private _openPropertiesWindow;
    private _closePropertiesWindow;
    private bindPointerEvents;
}
//# sourceMappingURL=graphic-editor.d.ts.map