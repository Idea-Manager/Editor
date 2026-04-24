import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import { I18nService } from '@core/i18n/i18n';
import type { EditorContext } from './editor-context';
import { SelectionManager } from './selection-manager';
import { SelectionSync } from './selection-sync';
import { BlockRegistry } from '../blocks/block-registry';
import type { AnyBlockDefinition } from '../blocks/block-registry';
import { registerDefaultBlocks } from '../blocks/register-default-blocks';
import { BlockRenderer } from '../renderer/block-renderer';
import { InputInterceptor } from './input-interceptor';
import { SlashPalette } from '../toolbar/slash-palette';
import { ClipboardHandler } from './clipboard-handler';
import { FloatingToolbar } from '../toolbar/floating-toolbar';
import { LinkHoverPopover } from '../toolbar/link-hover-popover';
import { TableContextMenu } from '../toolbar/table-context-menu';
import { BlockGutter } from '../toolbar/block-gutter';
import {
  mergeFloatingToolbarConfig,
  resolveBlockGutterConfig,
  resolveTableContextMenuConfig,
  type FloatingToolbarLike,
  type SlashPaletteLike,
  type TextEditorToolbarsOptions,
} from '../toolbar/toolbar-options';
import type { TextEditorClipboardOptions } from './clipboard-options';
import textEditorStyles from './text-editor.scss?inline';
import slashPaletteStyles from '../toolbar/slash-palette.scss?inline';
import floatingToolbarStyles from '../toolbar/floating-toolbar.scss?inline';
import linkHoverPopoverStyles from '../toolbar/link-hover-popover.scss?inline';
import tableContextMenuStyles from '../toolbar/table-context-menu.scss?inline';
import blockGutterStyles from '../toolbar/block-gutter.scss?inline';
import blockTypeMenuStyles from '../toolbar/block-type-menu.scss?inline';
import tableSizePickerStyles from '../toolbar/table-size-picker.scss?inline';
import modalStyles from '@shared/components/modal/modal.scss?inline';
import colorPickerStyles from '@shared/components/color-picker/color-picker.scss?inline';
import dropdownComboboxStyles from '@shared/components/dropdown-combobox/dropdown-combobox.scss?inline';

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
}

const STYLE_ID = 'idea-editor-styles';
const EXTRA_STYLE_CLASS = 'idea-editor-extra-style';

const DEFAULT_STYLE_BUNDLES: string[] = [
  textEditorStyles,
  slashPaletteStyles,
  floatingToolbarStyles,
  linkHoverPopoverStyles,
  tableContextMenuStyles,
  blockGutterStyles,
  blockTypeMenuStyles,
  tableSizePickerStyles,
  modalStyles,
  colorPickerStyles,
  dropdownComboboxStyles,
];

/**
 * Injects the shared bundle into `document.head` once. The first `init()` that runs while `#idea-editor-styles` is missing decides whether defaults are included; later calls do not replace it.
 */
function ensureGlobalEditorStyles(options: TextEditorOptions | undefined): void {
  if (document.getElementById(STYLE_ID)) return;
  if (options?.includeDefaultStyles === false) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DEFAULT_STYLE_BUNDLES.join('\n');
  document.head.appendChild(style);
}

/** Per-host extra CSS, updated on every `init`. */
function setExtraStyleOnHost(host: HTMLElement, extra: string | undefined): void {
  const existing = host.getElementsByClassName(EXTRA_STYLE_CLASS)[0] as HTMLStyleElement | undefined;
  if (extra == null || extra === '') {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('style');
  el.classList.add(EXTRA_STYLE_CLASS);
  el.textContent = extra;
  if (!existing) {
    host.appendChild(el);
  }
}

export class TextEditor extends HTMLElement {
  private container!: HTMLDivElement;
  private ctx!: EditorContext;
  private blockRenderer!: BlockRenderer;
  private selectionSync!: SelectionSync;
  private inputInterceptor!: InputInterceptor;
  private slashPalette!: SlashPaletteLike;
  private clipboardHandler!: ClipboardHandler;
  private floatingToolbar!: FloatingToolbarLike;
  private linkHoverPopover: LinkHoverPopover | { destroy(): void } | null = null;
  private tableContextMenu!: TableContextMenu | { destroy(): void };
  private blockGutter!: BlockGutter | { destroy(): void };
  private readonly eventDisposers: (() => void)[] = [];

  connectedCallback(): void {
    this.classList.add('idea-editor');

    this.container = document.createElement('div');
    this.container.classList.add('idea-text-editor');
    this.container.setAttribute('contenteditable', 'true');
    this.container.setAttribute('spellcheck', 'false');
    this.container.setAttribute('role', 'textbox');
    this.container.setAttribute('aria-multiline', 'true');
    this.appendChild(this.container);
  }

  init(doc: DocumentNode, eventBus: EventBus, undoRedoManager: UndoRedoManager, options?: TextEditorOptions): void {
    ensureGlobalEditorStyles(options);
    setExtraStyleOnHost(this, options?.extraStyleText);

    const selectionManager = new SelectionManager(eventBus);
    const blockRegistry = new BlockRegistry();
    const i18n = new I18nService(options?.locale ?? 'en', options?.i18nOverrides);

    if (options?.includeDefaultBlocks !== false) {
      registerDefaultBlocks(blockRegistry);
    }
    for (const def of options?.blocks ?? []) {
      blockRegistry.register(def);
    }

    this.ctx = {
      document: doc,
      selectionManager,
      undoRedoManager,
      eventBus,
      blockRegistry,
      rootElement: this.container,
      i18n,
    };

    this.blockRenderer = new BlockRenderer(blockRegistry);
    this.selectionSync = new SelectionSync();
    this.inputInterceptor = new InputInterceptor(this.ctx, this.blockRenderer, this.selectionSync);

    const tb = options?.toolbars;
    const slashOpts = tb?.slashPalette;
    this.slashPalette =
      tb?.slashPaletteFactory?.(this.ctx, this, slashOpts) ?? new SlashPalette(this.ctx, this, slashOpts);
    this.inputInterceptor.setSlashPalette(this.slashPalette);

    this.clipboardHandler = new ClipboardHandler(
      this.ctx,
      this.blockRenderer,
      this.selectionSync,
      options?.clipboard,
    );
    const ftConfig = mergeFloatingToolbarConfig(tb?.floatingToolbar);
    this.floatingToolbar =
      tb?.floatingToolbarFactory?.(
        { ctx: this.ctx, host: this, selectionSync: this.selectionSync },
        ftConfig,
      ) ?? new FloatingToolbar(this.ctx, this, this.selectionSync, ftConfig);

    if (tb?.linkHover?.disabled) {
      this.linkHoverPopover = null;
    } else {
      this.linkHoverPopover = tb?.linkHover?.factory?.(this.ctx) ?? new LinkHoverPopover(this.ctx);
    }

    const tableCfg = tb?.tableContextMenu;
    const tableResolved = resolveTableContextMenuConfig(tableCfg);
    this.tableContextMenu =
      tb?.tableContextMenuFactory?.(this.ctx, this, tableResolved) ??
      new TableContextMenu(this.ctx, this, tableCfg);

    const gutterResolved = resolveBlockGutterConfig(tb?.blockGutter);
    this.blockGutter =
      tb?.blockGutterFactory?.(this.ctx, this, gutterResolved) ??
      new BlockGutter(this.ctx, this, tb?.blockGutter);
    if (this.blockGutter instanceof BlockGutter) {
      this.blockGutter.setSlashPalette(this.slashPalette);
    }

    this.render();

    this.eventDisposers.push(
      eventBus.on('doc:change', () => this.render()),
      eventBus.on('history:undo', () => this.render()),
      eventBus.on('history:redo', () => this.render()),
      eventBus.on('selection:change', () => this.updateActiveBlock()),
    );
  }

  disconnectedCallback(): void {
    this.querySelector(`.${EXTRA_STYLE_CLASS}`)?.remove();
    this.inputInterceptor?.destroy();
    this.slashPalette?.destroy();
    this.clipboardHandler?.destroy();
    this.floatingToolbar?.destroy();
    this.linkHoverPopover?.destroy();
    this.tableContextMenu?.destroy();
    this.blockGutter?.destroy();
    this.eventDisposers.forEach(fn => fn());
    this.eventDisposers.length = 0;
  }

  getContext(): EditorContext {
    return this.ctx;
  }

  getBlockRenderer(): BlockRenderer {
    return this.blockRenderer;
  }

  getSelectionSync(): SelectionSync {
    return this.selectionSync;
  }

  /** Swap the document root (e.g. after JSON import). Clears undo/redo and resets selection. */
  replaceDocument(doc: DocumentNode): void {
    if (!this.ctx) return;
    this.ctx.document = doc;
    this.ctx.undoRedoManager.clear();
    const first = doc.children[0];
    if (first) {
      this.ctx.selectionManager.setCollapsed(first.id, 0);
    } else {
      this.ctx.selectionManager.clear();
    }
    this.render();
  }

  private render(): void {
    const renderCtx = {
      document: this.ctx.document,
      eventBus: this.ctx.eventBus,
      selection: this.ctx.selectionManager.get(),
      undoRedoManager: this.ctx.undoRedoManager,
      i18n: this.ctx.i18n,
      rootElement: this,
      selectionManager: this.ctx.selectionManager,
      blockRegistry: this.ctx.blockRegistry,
    };
    this.blockRenderer.reconcile(this.ctx.document, this.container, renderCtx);

    const sel = this.ctx.selectionManager.get();
    if (sel) {
      this.selectionSync.syncToDOM(sel, this.container);
    }
    this.updateActiveBlock();
  }

  private updateActiveBlock(): void {
    const prev = this.container.querySelector('.idea-block--active');
    const sel = this.ctx.selectionManager.get();

    const targetId = sel?.anchorBlockId ?? null;
    const prevId = prev?.getAttribute('data-block-id') ?? null;
    if (targetId === prevId) return;

    prev?.classList.remove('idea-block--active');

    if (!targetId) return;
    const blockEl = this.container.querySelector(`[data-block-id="${targetId}"]`);
    blockEl?.classList.add('idea-block--active');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('idea-text-editor')) {
  customElements.define('idea-text-editor', TextEditor);
}
