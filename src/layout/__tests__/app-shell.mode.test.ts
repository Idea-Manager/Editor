import { createDocument } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { ShortcutManager } from '@core/shortcuts/shortcut-manager';
import { setActiveMode } from '../../util/active-mode';

// ── Minimal custom element mocks ──────────────────────────────────────────────
// We register lightweight stubs so AppShell can call `new TextEditor()` /
// `new GraphicEditor()` and their init / replaceDocument methods without
// pulling in the full editor implementation trees.

class MockTextEditor extends HTMLElement {
  init = jest.fn();
  replaceDocument = jest.fn();
  onHostResize = jest.fn();
}

class MockGraphicEditor extends HTMLElement {
  init = jest.fn();
  replaceDocument = jest.fn();
  onHostResize = jest.fn();
}

if (!customElements.get('idea-text-editor')) {
  customElements.define('idea-text-editor', MockTextEditor);
}
if (!customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', MockGraphicEditor);
}

// Mock the package imports so AppShell receives our stub classes.
jest.mock('@text-editor/index', () => ({ TextEditor: MockTextEditor }));
jest.mock('@graphic-editor/index', () => ({ GraphicEditor: MockGraphicEditor }));

// Import AppShell AFTER mocks are registered.
import { AppShell } from '../app-shell';

function makeEnv(initialMode?: 'text' | 'graphic') {
  const doc = createDocument();
  if (initialMode) setActiveMode(doc, initialMode);

  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const i18n = new I18nService('en');
  const shortcuts = new ShortcutManager();
  jest.spyOn(shortcuts, 'setScope');

  const shell = new AppShell({
    doc,
    eventBus,
    undoRedoManager,
    i18n,
    shortcuts,
    shellMode: 'both',
  });
  document.body.appendChild(shell.element);
  // mount() must be called after appendChild so connectedCallback fires for editors
  // before init() runs, and so topBar / graphicEditor / textEditor are available.
  shell.mount();

  return { shell, doc, eventBus, shortcuts };
}

function makeInlineEnv(statusBar = false) {
  const doc = createDocument();
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const i18n = new I18nService('en');
  const shortcuts = new ShortcutManager();

  const shell = new AppShell({
    doc,
    eventBus,
    undoRedoManager,
    i18n,
    shortcuts,
    shellMode: 'text',
    view: 'inline',
    chrome: {
      showTopBar: false,
      showStatusBar: statusBar,
      showModeSwitcher: false,
      showImportExport: false,
      showUndoRedo: false,
    },
  });
  document.body.appendChild(shell.element);
  shell.mount();

  return { shell, doc, eventBus, shortcuts };
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('AppShell.setMode', () => {
  it('defaults to text mode', () => {
    const { shell } = makeEnv();
    expect(shell.getCurrentMode()).toBe('text');
  });

  it('returns graphic when doc.meta.activeMode is "graphic"', () => {
    const { shell } = makeEnv('graphic');
    expect(shell.getCurrentMode()).toBe('graphic');
  });

  it('setMode("graphic") switches currentMode', () => {
    const { shell } = makeEnv();
    shell.setMode('graphic');
    expect(shell.getCurrentMode()).toBe('graphic');
  });

  it('setMode("graphic") adds app-shell--graphic-mode class', () => {
    const { shell } = makeEnv();
    shell.setMode('graphic');
    expect(shell.element.classList.contains('app-shell--graphic-mode')).toBe(true);
  });

  it('setMode("text") removes app-shell--graphic-mode class', () => {
    const { shell } = makeEnv('graphic');
    shell.setMode('text');
    expect(shell.element.classList.contains('app-shell--graphic-mode')).toBe(false);
  });

  it('setMode calls shortcuts.setScope with the new mode', () => {
    const { shell, shortcuts } = makeEnv();
    shell.setMode('graphic');
    expect(shortcuts.setScope).toHaveBeenCalledWith('graphic');
  });

  it('setMode writes mode to doc.meta.activeMode', () => {
    const { shell, doc } = makeEnv();
    shell.setMode('graphic');
    expect((doc.meta as Record<string, unknown>).activeMode).toBe('graphic');
  });

  it('setMode emits mode:change on eventBus', () => {
    const { shell, eventBus } = makeEnv();
    const listener = jest.fn();
    eventBus.on('mode:change', listener);
    shell.setMode('graphic');
    expect(listener).toHaveBeenCalledWith({ mode: 'graphic' });
  });

  it('editors are not destroyed on toggle — same instances survive two toggles', () => {
    const { shell } = makeEnv();
    const textEl = shell.element.querySelector('idea-text-editor');
    const graphicEl = shell.element.querySelector('idea-graphic-editor');
    shell.setMode('graphic');
    shell.setMode('text');
    expect(shell.element.querySelector('idea-text-editor')).toBe(textEl);
    expect(shell.element.querySelector('idea-graphic-editor')).toBe(graphicEl);
  });

  it('setMode("graphic") calls graphicEditor.onHostResize() after a requestAnimationFrame', () => {
    jest.useFakeTimers();
    const { shell } = makeEnv();
    const graphicEl = shell.element.querySelector('idea-graphic-editor') as MockGraphicEditor;

    shell.setMode('graphic');
    expect(graphicEl.onHostResize).not.toHaveBeenCalled(); // not yet — rAF pending

    jest.runAllTimers();
    expect(graphicEl.onHostResize).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('setMode("text") calls textEditor.onHostResize() after a requestAnimationFrame', () => {
    jest.useFakeTimers();
    const { shell } = makeEnv('graphic');
    const textEl = shell.element.querySelector('idea-text-editor') as MockTextEditor;

    shell.setMode('text');
    jest.runAllTimers();
    expect(textEl.onHostResize).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('does not log an input-interceptor error on mount (console.error spy)', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    makeEnv();
    // No synchronous console.error should be produced during construction and mount
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('AppShell.replaceDocument', () => {
  it('switches mode to "graphic" when imported doc has activeMode="graphic"', () => {
    const { shell } = makeEnv();
    const newDoc = createDocument();
    setActiveMode(newDoc, 'graphic');
    shell.replaceDocument(newDoc);
    expect(shell.getCurrentMode()).toBe('graphic');
    expect(shell.element.classList.contains('app-shell--graphic-mode')).toBe(true);
  });

  it('switches mode to "text" when imported doc has no activeMode', () => {
    const { shell } = makeEnv('graphic');
    const newDoc = createDocument();
    shell.replaceDocument(newDoc);
    expect(shell.getCurrentMode()).toBe('text');
  });

  it('returns the new document from getDocument()', () => {
    const { shell } = makeEnv();
    const newDoc = createDocument();
    shell.replaceDocument(newDoc);
    expect(shell.getDocument()).toBe(newDoc);
  });
});

describe('AppShell view modes', () => {
  it('defaults to full view modifier class', () => {
    const { shell } = makeEnv();
    expect(shell.element.classList.contains('app-shell--full')).toBe(true);
    expect(shell.element.classList.contains('app-shell--inline')).toBe(false);
  });

  it('mounts top bar and status bar by default in full view', () => {
    const { shell } = makeEnv();
    expect(shell.element.querySelector('.top-bar')).not.toBeNull();
    expect(shell.element.querySelector('.status-bar')).not.toBeNull();
  });

  it('adds inline view modifier class', () => {
    const { shell } = makeInlineEnv();
    expect(shell.element.classList.contains('app-shell--inline')).toBe(true);
    expect(shell.element.classList.contains('app-shell--full')).toBe(false);
  });

  it('inline view hides top bar and status bar by default', () => {
    const { shell } = makeInlineEnv(false);
    expect(shell.element.querySelector('.top-bar')).toBeNull();
    expect(shell.element.querySelector('.status-bar')).toBeNull();
  });

  it('inline view shows status bar when enabled', () => {
    const { shell } = makeInlineEnv(true);
    expect(shell.element.querySelector('.top-bar')).toBeNull();
    expect(shell.element.querySelector('.status-bar')).not.toBeNull();
  });

  it('editor area scss clips overflow so the text editor host scrolls', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const scss = fs.readFileSync(path.join(__dirname, '../app-shell.scss'), 'utf8');
    expect(scss).toMatch(/&__editor-area[\s\S]*min-height:\s*0/);
    expect(scss).toMatch(/&__editor-area[\s\S]*overflow:\s*hidden/);
  });

  it('hides graphic editor in text mode with specificity over bundled graphic styles', () => {
    const style = document.createElement('style');
    style.textContent = `
      .idea-graphic-editor { display: grid; }
      .app-shell:not(.app-shell--graphic-mode):not(.app-shell--graphic-only) .app-shell__editor--graphic { display: none; }
      .app-shell--graphic-mode .app-shell__editor--graphic { display: grid; }
    `;
    document.head.appendChild(style);

    const shell = document.createElement('div');
    shell.className = 'app-shell app-shell--full';
    const area = document.createElement('div');
    area.className = 'app-shell__editor-area';
    const graphic = document.createElement('idea-graphic-editor');
    graphic.className = 'app-shell__editor app-shell__editor--graphic idea-graphic-editor';
    area.appendChild(graphic);
    shell.appendChild(area);
    document.body.appendChild(shell);

    expect(getComputedStyle(graphic).display).toBe('none');

    shell.classList.add('app-shell--graphic-mode');
    expect(getComputedStyle(graphic).display).toBe('grid');
  });
});
