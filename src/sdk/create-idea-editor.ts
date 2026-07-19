import baseStyles from '../styles/_base.scss?inline';
import importExportStyles from '../layout/import-export.scss?inline';
import appShellStyles from '../layout/app-shell.scss?inline';
import topBarStyles from '../layout/top-bar.scss?inline';
import statusBarStyles from '../layout/status-bar.scss?inline';
import commandPaletteStyles from '../layout/command-palette.scss?inline';
import {
  createDocument,
  EventBus,
  UndoRedoManager,
  ShortcutManager,
  I18nService,
} from '@core/index';
import { AppShell } from '../layout/app-shell';
import { CommandPalette } from '../layout/command-palette';
import { exportJSON, importJSON } from '../layout/import-export';
import { getActiveMode } from '../util/active-mode';
import type { ActiveMode } from '../util/active-mode';
import { resolveContainer } from './resolve-container';
import type {
  IdeaEditorChromeConfig,
  IdeaEditorCreateOptions,
  IdeaEditorInstance,
  IdeaEditorMode,
  IdeaEditorView,
} from './types';

const SHELL_STYLE_ID = 'idea-editor-shell-styles';

const SHELL_STYLE_BUNDLES = [
  baseStyles,
  importExportStyles,
  appShellStyles,
  topBarStyles,
  statusBarStyles,
  commandPaletteStyles,
];

function ensureShellStyles(): void {
  if (document.getElementById(SHELL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHELL_STYLE_ID;
  style.textContent = SHELL_STYLE_BUNDLES.join('\n');
  document.head.appendChild(style);
}

function resolveInitialActiveMode(mode: IdeaEditorMode, doc: ReturnType<typeof createDocument>): ActiveMode {
  if (mode === 'text') return 'text';
  if (mode === 'graphic') return 'graphic';
  return getActiveMode(doc);
}

function resolveChrome(
  view: IdeaEditorView,
  mode: IdeaEditorMode,
  chrome: IdeaEditorChromeConfig | undefined,
  statusBar: boolean | undefined,
  readOnly: boolean,
): Required<IdeaEditorChromeConfig> {
  if (view === 'inline') {
    return {
      showTopBar: chrome?.showTopBar ?? false,
      showStatusBar: chrome?.showStatusBar ?? statusBar ?? false,
      showModeSwitcher: chrome?.showModeSwitcher ?? false,
      showImportExport: chrome?.showImportExport ?? false,
      showUndoRedo: chrome?.showUndoRedo ?? false,
    };
  }

  const showModeSwitcher = chrome?.showModeSwitcher ?? mode === 'both';
  return {
    showTopBar: chrome?.showTopBar ?? true,
    showStatusBar: chrome?.showStatusBar ?? true,
    showModeSwitcher,
    showImportExport: chrome?.showImportExport ?? !readOnly,
    showUndoRedo: chrome?.showUndoRedo ?? !readOnly,
  };
}

export function createIdeaEditor(options: IdeaEditorCreateOptions): IdeaEditorInstance {
  ensureShellStyles();

  const config = options.config ?? {};
  const view = options.view ?? 'full';
  const readOnly = options.mode === 'read-only';
  const chrome = resolveChrome(view, options.mode, config.chrome, config.statusBar, readOnly);

  const i18n = new I18nService(config.locale ?? 'en', config.i18nOverrides);
  const doc = config.document ?? createDocument();
  const bus = new EventBus();
  const history = new UndoRedoManager(bus);
  const shortcuts = new ShortcutManager();

  const container = resolveContainer(options.container);

  const textOptions = {
    ...config.text,
    locale: config.text?.locale ?? i18n.locale,
    i18nOverrides: config.text?.i18nOverrides ?? config.i18nOverrides,
    readOnly: readOnly || config.text?.readOnly,
  };

  const graphicOptions = {
    ...config.graphic,
    locale: config.graphic?.locale ?? i18n.locale,
    i18nOverrides: config.graphic?.i18nOverrides ?? config.i18nOverrides,
    readOnly: readOnly || config.graphic?.readOnly,
  };

  const shell = new AppShell({
    doc,
    eventBus: bus,
    undoRedoManager: history,
    i18n,
    shortcuts,
    shellMode: options.mode,
    readOnly,
    view,
    chrome,
    textOptions,
    graphicOptions,
    onModeChange: config.onModeChange,
  });

  container.appendChild(shell.element);
  shell.mount();

  const initialMode = resolveInitialActiveMode(options.mode, doc);
  shell.setMode(initialMode);
  shortcuts.setScope(shell.getCurrentMode());

  const disposers: (() => void)[] = [];
  let palette: CommandPalette | null = null;

  if (config.shortcuts?.enabled !== false) {
    palette = new CommandPalette(shortcuts, i18n);
    const entries = [
      {
        keys: 'mod+k',
        scope: 'global' as const,
        label: i18n.t('shortcut.commandPalette'),
        command: () => palette!.toggle(),
      },
    ];

    if (chrome.showImportExport) {
      entries.push({
        keys: 'mod+s',
        scope: 'global' as const,
        label: i18n.t('shortcut.exportJson'),
        command: () => exportJSON(shell.getDocument(), i18n),
      });
    }

    shortcuts.registerAll([...entries, ...(config.shortcuts?.entries ?? [])]);
    disposers.push(shortcuts.attach());
  }

  if (config.onChange) {
    disposers.push(bus.on('doc:change', () => config.onChange!(shell.getDocument())));
  }

  const instance: IdeaEditorInstance = {
    destroy() {
      disposers.forEach(fn => fn());
      shortcuts.destroy();
      shell.destroy();
      shell.element.remove();
    },
    getDocument: () => shell.getDocument(),
    setDocument: (nextDoc) => shell.replaceDocument(nextDoc),
    getMode: () => shell.getCurrentMode(),
    setMode: (mode) => shell.setMode(mode),
    getEventBus: () => bus,
    exportJSON: () => exportJSON(shell.getDocument(), i18n),
    importJSON: () => importJSON(shell.getDocument(), bus, (nextDoc) => shell.replaceDocument(nextDoc), i18n),
    getElement: () => shell.element,
  };

  config.onReady?.(instance);
  return instance;
}
