import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import type { EditorContext } from './editor-context';
import { SelectionSync } from './selection-sync';
import type { AnyBlockDefinition } from '../blocks/block-registry';
import { BlockRenderer } from '../renderer/block-renderer';
import { type TextEditorToolbarsOptions } from '../toolbar/toolbar-options';
import type { TextEditorClipboardOptions } from './clipboard-options';
export interface TextEditorOptions {
    locale?: Locale;
    /**
     * Merged into the active locale’s dictionary (after the base file for that locale). Use namespaced keys, e.g. `pluginName.feature.label`, for custom blocks and toolbars. See the website docs for built-in keys and the global default-styles caveat when multiple editors differ.
     */
    i18nOverrides?: Partial<TranslationDictionary>;
    /** Extra block definitions registered after built-ins (unless {@link includeDefaultBlocks} is false). Last registration wins if `type` collides. */
    blocks?: AnyBlockDefinition[];
    /** When `false`, only {@link blocks} are registered (defaults-first ordering does not apply). Default `true`. */
    includeDefaultBlocks?: boolean;
    /** When `false`, skip the bundled editor CSS; host supplies all styling. Default `true`. The global `#idea-editor-styles` node is only created on first `init` on the page (see theming docs). */
    includeDefaultStyles?: boolean;
    /** Appended to this element as a `<style class="idea-editor-extra-style">` on each `init` (per-instance; does not add to the global bundle). */
    extraStyleText?: string;
    /** Toolbar / palette customization and optional factories. */
    toolbars?: TextEditorToolbarsOptions;
    /**
     * Experimental clipboard hooks (paste transform, MIME order). See website docs.
     * @experimental
     */
    clipboard?: TextEditorClipboardOptions;
    /** When true, document is view-only: no editing, toolbars, or clipboard handling. */
    readOnly?: boolean;
}
export declare class TextEditor extends HTMLElement {
    private container;
    private ctx;
    private blockRenderer;
    private selectionSync;
    private inputInterceptor?;
    private slashPalette;
    private clipboardHandler;
    private floatingToolbar;
    private linkHoverPopover;
    private tableContextMenu;
    private blockGutter;
    private readonly eventDisposers;
    connectedCallback(): void;
    /**
     * Called by the host after this element transitions from display:none to visible.
     * No-op for TextEditor — layout is handled by the browser without re-measuring.
     * Exists for API symmetry with GraphicEditor so AppShell can call it uniformly.
     */
    onHostResize(): void;
    init(doc: DocumentNode, eventBus: EventBus, undoRedoManager: UndoRedoManager, options?: TextEditorOptions): void;
    disconnectedCallback(): void;
    getContext(): EditorContext;
    getBlockRenderer(): BlockRenderer;
    getSelectionSync(): SelectionSync;
    /** Swap the document root (e.g. after JSON import). Clears undo/redo and resets selection. */
    replaceDocument(doc: DocumentNode): void;
    private render;
    private updateActiveBlock;
}
//# sourceMappingURL=text-editor.d.ts.map