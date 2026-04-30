import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import { hotkeyLabel } from '@core/platform/hotkey';
import { exportJSON, importJSON, showJSONPreview, copyJSON } from './import-export';
import { createIcon } from '../util/icon';
import type { ActiveMode } from '../util/active-mode';
import './top-bar.scss';

export interface TopBarConfig {
  doc: DocumentNode;
  eventBus: EventBus;
  undoRedoManager: UndoRedoManager;
  i18n: I18nService;
  onDocReplace: (doc: DocumentNode) => void;
  onModeChange: (mode: ActiveMode) => void;
  initialMode: ActiveMode;
}

export class TopBar {
  readonly element: HTMLElement;
  private undoBtn!: HTMLButtonElement;
  private redoBtn!: HTMLButtonElement;
  private saveDot!: HTMLElement;
  private modeButtons: HTMLButtonElement[] = [];
  private unsaved = false;
  private readonly disposers: (() => void)[] = [];

  constructor(private config: TopBarConfig) {
    this.element = document.createElement('div');
    this.element.classList.add('top-bar');
    this.build();
    this.listen();
  }

  destroy(): void {
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  setDocument(doc: DocumentNode): void {
    this.config.doc = doc;
  }

  setMode(mode: ActiveMode): void {
    for (const btn of this.modeButtons) {
      const isActive = btn.dataset['mode'] === mode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    }
  }

  private build(): void {
    const { doc, undoRedoManager, i18n } = this.config;
    const t = i18n.t.bind(i18n);

    const titleInput = document.createElement('input');
    titleInput.classList.add('top-bar__title');
    titleInput.value = t('topbar.untitled');
    titleInput.spellcheck = false;
    this.element.appendChild(titleInput);

    this.saveDot = document.createElement('span');
    this.saveDot.classList.add('top-bar__save-dot');
    this.element.appendChild(this.saveDot);

    const spacer = document.createElement('div');
    spacer.classList.add('top-bar__spacer');
    this.element.appendChild(spacer);

    // Mode segmented control — LEFT of history group
    const modeGroup = this.buildModeControl(t);
    this.element.appendChild(modeGroup);

    this.element.appendChild(this.createSeparator());

    const historyGroup = document.createElement('div');
    historyGroup.classList.add('top-bar__group');

    this.undoBtn = this.createButton('undo', hotkeyLabel(t('topbar.undo'), 'mod+z'), () => undoRedoManager.undo(), true);
    this.redoBtn = this.createButton('redo', hotkeyLabel(t('topbar.redo'), 'mod+shift+z'), () => undoRedoManager.redo(), true);
    this.undoBtn.disabled = !undoRedoManager.canUndo;
    this.redoBtn.disabled = !undoRedoManager.canRedo;

    historyGroup.appendChild(this.undoBtn);
    historyGroup.appendChild(this.redoBtn);
    this.element.appendChild(historyGroup);

    this.element.appendChild(this.createSeparator());

    const ioGroup = document.createElement('div');
    ioGroup.classList.add('top-bar__group');

    ioGroup.appendChild(this.createButton(t('topbar.import'), t('topbar.importJson'), () => {
      importJSON(this.config.doc, this.config.eventBus, this.config.onDocReplace, i18n);
    }));
    ioGroup.appendChild(this.createButton(t('topbar.export'), t('topbar.exportJson'), () => exportJSON(this.config.doc, i18n)));
    ioGroup.appendChild(this.createButton(t('topbar.copy'), t('topbar.copyJson'), () => copyJSON(this.config.doc, i18n)));
    ioGroup.appendChild(this.createButton(t('topbar.preview'), t('topbar.previewJson'), () => showJSONPreview(this.config.doc, i18n)));

    this.element.appendChild(ioGroup);
  }

  private buildModeControl(t: (key: string) => string): HTMLElement {
    const { initialMode, onModeChange } = this.config;
    const modes: ActiveMode[] = ['text', 'graphic'];

    const group = document.createElement('div');
    group.classList.add('top-bar__group', 'top-bar__mode');
    group.setAttribute('role', 'tablist');
    group.setAttribute('aria-label', t('mode.toggle.aria'));

    for (const mode of modes) {
      const btn = document.createElement('button');
      btn.dataset['mode'] = mode;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(mode === initialMode));
      btn.textContent = t(`mode.${mode}`);
      if (mode === initialMode) btn.classList.add('is-active');

      btn.addEventListener('click', () => {
        this.setMode(mode);
        onModeChange(mode);
      });

      this.modeButtons.push(btn);
      group.appendChild(btn);
    }

    group.addEventListener('keydown', (e: KeyboardEvent) => {
      const idx = this.modeButtons.findIndex(b => b === document.activeElement);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (idx + 1) % modes.length;
        this.modeButtons[next].focus();
        this.setMode(modes[next]);
        onModeChange(modes[next]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = (idx - 1 + modes.length) % modes.length;
        this.modeButtons[prev].focus();
        this.setMode(modes[prev]);
        onModeChange(modes[prev]);
      }
    });

    return group;
  }

  private createButton(text: string, title: string, onClick: () => void, isIcon = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.classList.add('top-bar__btn');
    if (isIcon) {
      btn.classList.add('top-bar__btn--icon');
      btn.appendChild(createIcon(text));
    } else {
      btn.textContent = text;
    }
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return btn;
  }

  private createSeparator(): HTMLElement {
    const sep = document.createElement('div');
    sep.classList.add('top-bar__separator');
    return sep;
  }

  private listen(): void {
    const { eventBus, undoRedoManager } = this.config;

    const updateButtons = () => {
      this.undoBtn.disabled = !undoRedoManager.canUndo;
      this.redoBtn.disabled = !undoRedoManager.canRedo;
    };

    const markUnsaved = () => {
      this.unsaved = true;
      this.saveDot.classList.add('top-bar__save-dot--unsaved');
      updateButtons();
    };

    this.disposers.push(eventBus.on('doc:change', markUnsaved));
    this.disposers.push(eventBus.on('history:push', updateButtons));
    this.disposers.push(eventBus.on('history:undo', () => { markUnsaved(); updateButtons(); }));
    this.disposers.push(eventBus.on('history:redo', () => { markUnsaved(); updateButtons(); }));
  }
}
