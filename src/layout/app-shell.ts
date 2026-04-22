import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import { TopBar } from './top-bar';
import { StatusBar } from './status-bar';
import './app-shell.scss';

export interface AppShellConfig {
  doc: DocumentNode;
  eventBus: EventBus;
  undoRedoManager: UndoRedoManager;
  i18n: I18nService;
}

export class AppShell {
  readonly element: HTMLElement;
  private editorContainer!: HTMLDivElement;
  private topBar!: TopBar;
  private statusBar!: StatusBar;
  private config: AppShellConfig;
  private documentReplaceHook: ((doc: DocumentNode) => void) | null = null;

  constructor(config: AppShellConfig) {
    this.config = config;
    this.element = document.createElement('div');
    this.element.classList.add('app-shell');
    this.build();
  }

  getEditorContainer(): HTMLDivElement {
    return this.editorContainer;
  }

  getTopBar(): TopBar {
    return this.topBar;
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
    this.documentReplaceHook?.(doc);
  }

  private build(): void {
    this.topBar = new TopBar({
      doc: this.config.doc,
      eventBus: this.config.eventBus,
      undoRedoManager: this.config.undoRedoManager,
      i18n: this.config.i18n,
      onDocReplace: (doc) => this.replaceDocument(doc),
    });
    this.element.appendChild(this.topBar.element);

    this.editorContainer = document.createElement('div');
    this.editorContainer.classList.add('app-shell__editor');
    this.element.appendChild(this.editorContainer);

    this.statusBar = new StatusBar(this.config.doc, this.config.eventBus, this.config.i18n);
    this.element.appendChild(this.statusBar.element);
  }

  destroy(): void {
    this.topBar.destroy();
    this.statusBar.destroy();
  }
}
