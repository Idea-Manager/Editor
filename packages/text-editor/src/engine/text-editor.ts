import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { Locale } from '@core/i18n/types';
import { I18nService } from '@core/i18n/i18n';
import type { EditorContext } from './editor-context';

export interface TextEditorOptions {
  locale?: Locale;
}
import { SelectionManager } from './selection-manager';
import { SelectionSync } from './selection-sync';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { HeadingBlock } from '../blocks/heading-block';
import { ListItemBlock } from '../blocks/list-item-block';
import { TableBlock } from '../blocks/table-block';
import { EmbedBlock } from '../blocks/embed-block';
import { BlockRenderer } from '../renderer/block-renderer';
import { InputInterceptor } from './input-interceptor';
import { SlashPalette } from '../toolbar/slash-palette';
import { ClipboardHandler } from './clipboard-handler';
import { FloatingToolbar } from '../toolbar/floating-toolbar';
import { LinkHoverPopover } from '../toolbar/link-hover-popover';
import { TableContextMenu } from '../toolbar/table-context-menu';
import { BlockGutter } from '../toolbar/block-gutter';
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

const STYLE_ID = 'idea-editor-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
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
  ].join('\n');
  document.head.appendChild(style);
}

export class TextEditor extends HTMLElement {
  private container!: HTMLDivElement;
  private ctx!: EditorContext;
  private blockRenderer!: BlockRenderer;
  private selectionSync!: SelectionSync;
  private inputInterceptor!: InputInterceptor;
  private slashPalette!: SlashPalette;
  private clipboardHandler!: ClipboardHandler;
  private floatingToolbar!: FloatingToolbar;
  private linkHoverPopover!: LinkHoverPopover;
  private tableContextMenu!: TableContextMenu;
  private blockGutter!: BlockGutter;
  private readonly eventDisposers: (() => void)[] = [];

  connectedCallback(): void {
    injectStyles();

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
    const selectionManager = new SelectionManager(eventBus);
    const blockRegistry = new BlockRegistry();
    const i18n = new I18nService(options?.locale ?? 'en');

    blockRegistry.register(new ParagraphBlock());
    blockRegistry.register(new HeadingBlock());
    blockRegistry.register(new ListItemBlock());
    blockRegistry.register(new TableBlock());
    blockRegistry.register(new EmbedBlock());

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

    this.slashPalette = new SlashPalette(this.ctx, this);
    this.inputInterceptor.setSlashPalette(this.slashPalette);

    this.clipboardHandler = new ClipboardHandler(this.ctx, this.blockRenderer, this.selectionSync);
    this.floatingToolbar = new FloatingToolbar(this.ctx, this, this.selectionSync);
    this.linkHoverPopover = new LinkHoverPopover(this.ctx);
    this.tableContextMenu = new TableContextMenu(this.ctx, this);
    this.blockGutter = new BlockGutter(this.ctx, this);
    this.blockGutter.setSlashPalette(this.slashPalette);

    this.render();

    this.eventDisposers.push(
      eventBus.on('doc:change', () => this.render()),
      eventBus.on('history:undo', () => this.render()),
      eventBus.on('history:redo', () => this.render()),
      eventBus.on('selection:change', () => this.updateActiveBlock()),
    );
  }

  disconnectedCallback(): void {
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
