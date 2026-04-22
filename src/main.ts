import './styles/_base.scss';
import './layout/import-export.scss';
import { createDocument, EventBus, UndoRedoManager, ShortcutManager, I18nService } from '@core/index';
import { TextEditor } from '@text-editor/index';
import { AppShell } from './layout/app-shell';
import { CommandPalette } from './layout/command-palette';
import { exportJSON } from './layout/import-export';

const i18n = new I18nService('en');

const doc = createDocument();
const bus = new EventBus();
const history = new UndoRedoManager(bus);

const app = document.getElementById('app')!;

const shell = new AppShell({ doc, eventBus: bus, undoRedoManager: history, i18n });
app.appendChild(shell.element);

const editor = new TextEditor();
shell.getEditorContainer().appendChild(editor);
editor.init(doc, bus, history, { locale: i18n.locale });
shell.setDocumentReplaceHook((newDoc) => editor.replaceDocument(newDoc));

const shortcuts = new ShortcutManager();
shortcuts.setScope('text');

const palette = new CommandPalette(shortcuts, i18n);

shortcuts.registerAll([
  { keys: 'mod+k', scope: 'global', label: i18n.t('shortcut.commandPalette'), command: () => palette.toggle() },
  {
    keys: 'mod+s', scope: 'global', label: i18n.t('shortcut.exportJson'),
    command: () => { exportJSON(shell.getDocument(), i18n); },
  },
]);

shortcuts.attach();

console.log('[IdeaEditor] v0.0.1 — editor mounted');
