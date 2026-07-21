import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { ShortcutManager } from '@core/shortcuts/shortcut-manager';
import type { TextEditorOptions } from '@text-editor/engine/text-editor';
import type { GraphicEditorOptions } from '@graphic-editor/engine/graphic-editor';
import { TextEditor } from '@text-editor/index';
import { GraphicEditor } from '@graphic-editor/index';
import { TopBar } from './top-bar';
import { StatusBar } from './status-bar';
import { getActiveMode, setActiveMode } from '../util/active-mode';
import type { ActiveMode } from '../util/active-mode';
import type { IdeaEditorChromeConfig, IdeaEditorMode, IdeaEditorView } from '../sdk/types';
import './app-shell.scss';

export interface AppShellConfig {
  doc: DocumentNode;
  eventBus: EventBus;
  undoRedoManager: UndoRedoManager;
  i18n: I18nService;
  shortcuts: ShortcutManager;
  shellMode: IdeaEditorMode;
  readOnly?: boolean;
  view?: IdeaEditorView;
  chrome?: Required<IdeaEditorChromeConfig>;
  textOptions?: TextEditorOptions;
  graphicOptions?: GraphicEditorOptions;
  onModeChange?: (mode: ActiveMode) => void;
}

export class AppShell {
  readonly element: HTMLElement;
  private topBar: TopBar | null = null;
  private statusBar: StatusBar | null = null;
  private textEditor: TextEditor | null = null;
  private graphicEditor: GraphicEditor | null = null;
  private currentMode: ActiveMode;
  private config: AppShellConfig;
  private documentReplaceHook: ((doc: DocumentNode) => void) | null = null;
  private readonly mountText: boolean;
  private readonly mountGraphic: boolean;

  constructor(config: AppShellConfig) {
    this.config = config;
    this.currentMode = getActiveMode(config.doc);
    this.mountText = config.shellMode === 'text' || config.shellMode === 'both' || config.shellMode === 'read-only';
    this.mountGraphic = config.shellMode === 'graphic' || config.shellMode === 'both' || config.shellMode === 'read-only';

    this.element = document.createElement('div');
    this.element.classList.add('app-shell');

    const view = config.view ?? 'full';
    this.element.classList.add(view === 'inline' ? 'app-shell--inline' : 'app-shell--full');

    if (config.shellMode === 'text') {
      this.element.classList.add('app-shell--text-only');
    } else if (config.shellMode === 'graphic') {
      this.element.classList.add('app-shell--graphic-only', 'app-shell--graphic-mode');
    } else if (config.shellMode === 'read-only') {
      this.element.classList.add('app-shell--read-only');
    }
  }

  mount(): void {
    this.build();
  }

  setMode(mode: ActiveMode): void {
    if (!this.mountText || !this.mountGraphic) {
      return;
    }

    this.currentMode = mode;
    this.element.classList.toggle('app-shell--graphic-mode', mode === 'graphic');
    this.config.shortcuts.setScope(mode);
    setActiveMode(this.config.doc, mode);
    this.config.eventBus.emit('mode:change', { mode });
    this.topBar?.setMode(mode);
    this.config.onModeChange?.(mode);

    requestAnimationFrame(() => {
      if (mode === 'graphic') this.graphicEditor?.onHostResize();
      else this.textEditor?.onHostResize();
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
    this.statusBar?.setDocument(doc);
    this.topBar?.setDocument(doc);
    this.textEditor?.replaceDocument(doc);
    this.graphicEditor?.replaceDocument(doc);

    if (this.mountText && this.mountGraphic) {
      const mode = getActiveMode(doc);
      this.setMode(mode);
    }

    this.documentReplaceHook?.(doc);
  }

  destroy(): void {
    this.topBar?.destroy();
    this.statusBar?.destroy();
    this.textEditor?.remove();
    this.graphicEditor?.remove();
  }

  private build(): void {
    const { doc, eventBus, undoRedoManager, i18n, chrome } = this.config;
    const resolvedChrome = chrome ?? {
      showTopBar: true,
      showStatusBar: true,
      showModeSwitcher: this.config.shellMode === 'both',
      showImportExport: !this.config.readOnly,
      showUndoRedo: !this.config.readOnly,
    };

    if (resolvedChrome.showTopBar) {
      this.topBar = new TopBar({
        doc,
        eventBus,
        undoRedoManager,
        i18n,
        onDocReplace: (newDoc) => this.replaceDocument(newDoc),
        onModeChange: (mode) => this.setMode(mode),
        initialMode: this.currentMode,
        visibleModes: this.mountText && this.mountGraphic ? ['text', 'graphic'] : undefined,
        showModeSwitcher: resolvedChrome.showModeSwitcher,
        showImportExport: resolvedChrome.showImportExport,
        showUndoRedo: resolvedChrome.showUndoRedo,
        readOnly: this.config.readOnly,
      });
      this.element.appendChild(this.topBar.element);
    }

    const editorArea = document.createElement('div');
    editorArea.classList.add('app-shell__editor-area');
    this.element.appendChild(editorArea);

    if (this.mountText) {
      this.textEditor = new TextEditor();
      this.textEditor.classList.add('app-shell__editor', 'app-shell__editor--text');
      editorArea.appendChild(this.textEditor);
      this.textEditor.init(doc, eventBus, undoRedoManager, {
        locale: i18n.locale,
        ...this.config.textOptions,
      });
    }

    if (this.mountGraphic) {
      this.graphicEditor = new GraphicEditor();
      this.graphicEditor.classList.add('app-shell__editor', 'app-shell__editor--graphic');
      editorArea.appendChild(this.graphicEditor);
      this.graphicEditor.init(doc, eventBus, undoRedoManager, {
        locale: i18n.locale,
        ...this.config.graphicOptions,
      });
    }

    if (resolvedChrome.showStatusBar) {
      this.statusBar = new StatusBar(doc, eventBus, i18n);
      this.element.appendChild(this.statusBar.element);
    }

    if (this.mountText && this.mountGraphic) {
      this.element.classList.toggle('app-shell--graphic-mode', this.currentMode === 'graphic');
    }
  }
}
