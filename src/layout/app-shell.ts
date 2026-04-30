import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { ShortcutManager } from '@core/shortcuts/shortcut-manager';
import { TextEditor } from '@text-editor/index';
import { GraphicEditor } from '@graphic-editor/index';
import { TopBar } from './top-bar';
import { StatusBar } from './status-bar';
import { getActiveMode, setActiveMode } from '../util/active-mode';
import type { ActiveMode } from '../util/active-mode';
import './app-shell.scss';

export interface AppShellConfig {
  doc: DocumentNode;
  eventBus: EventBus;
  undoRedoManager: UndoRedoManager;
  i18n: I18nService;
  shortcuts: ShortcutManager;
}

export class AppShell {
  readonly element: HTMLElement;
  private topBar!: TopBar;
  private statusBar!: StatusBar;
  private textEditor!: TextEditor;
  private graphicEditor!: GraphicEditor;
  private currentMode: ActiveMode;
  private config: AppShellConfig;
  private documentReplaceHook: ((doc: DocumentNode) => void) | null = null;

  constructor(config: AppShellConfig) {
    this.config = config;
    this.currentMode = getActiveMode(config.doc);
    this.element = document.createElement('div');
    this.element.classList.add('app-shell');
  }

  mount(): void {
    this.build();
  }

  setMode(mode: ActiveMode): void {
    this.currentMode = mode;
    this.element.classList.toggle('app-shell--graphic-mode', mode === 'graphic');
    this.config.shortcuts.setScope(mode);
    setActiveMode(this.config.doc, mode);
    this.config.eventBus.emit('mode:change', { mode });
    this.topBar.setMode(mode);
    // Let the newly-visible editor recover layout after the CSS class has applied and
    // getBoundingClientRect() returns real pixel values (not 0×0 from display:none).
    requestAnimationFrame(() => {
      if (mode === 'graphic') this.graphicEditor.onHostResize();
      else this.textEditor.onHostResize();
    });
  }

  getCurrentMode(): ActiveMode {
    return this.currentMode;
  }

  getDocument(): DocumentNode {
    return this.config.doc;
  }

  setDocumentReplaceHook(hook: (doc: DocumentNode) => void): void {
    this.documentReplaceHook = hook;
  }

  replaceDocument(doc: DocumentNode): void {
    this.config = { ...this.config, doc };
    this.statusBar.setDocument(doc);
    this.topBar.setDocument(doc);
    this.textEditor.replaceDocument(doc);
    this.graphicEditor.replaceDocument(doc);
    const mode = getActiveMode(doc);
    this.setMode(mode);
    this.documentReplaceHook?.(doc);
  }

  destroy(): void {
    this.topBar.destroy();
    this.statusBar.destroy();
  }

  private build(): void {
    const { doc, eventBus, undoRedoManager, i18n } = this.config;

    this.topBar = new TopBar({
      doc,
      eventBus,
      undoRedoManager,
      i18n,
      onDocReplace: (newDoc) => this.replaceDocument(newDoc),
      onModeChange: (mode) => this.setMode(mode),
      initialMode: this.currentMode,
    });
    this.element.appendChild(this.topBar.element);

    const editorArea = document.createElement('div');
    editorArea.classList.add('app-shell__editor-area');
    this.element.appendChild(editorArea);

    // Text editor — editorArea must already be live so connectedCallback fires before init
    this.textEditor = new TextEditor();
    this.textEditor.classList.add('app-shell__editor', 'app-shell__editor--text');
    editorArea.appendChild(this.textEditor);
    this.textEditor.init(doc, eventBus, undoRedoManager, { locale: i18n.locale });

    // Graphic editor — same requirement
    this.graphicEditor = new GraphicEditor();
    this.graphicEditor.classList.add('app-shell__editor', 'app-shell__editor--graphic');
    editorArea.appendChild(this.graphicEditor);
    this.graphicEditor.init(doc, eventBus, undoRedoManager, { locale: i18n.locale });

    this.statusBar = new StatusBar(doc, eventBus, i18n);
    this.element.appendChild(this.statusBar.element);

    // Apply initial visibility
    this.element.classList.toggle('app-shell--graphic-mode', this.currentMode === 'graphic');
  }
}
