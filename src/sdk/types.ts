import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { Locale, TranslationDictionary } from '@core/i18n/types';
import type { ShortcutEntry } from '@core/shortcuts/shortcut-manager';
import type { TextEditorOptions } from '@text-editor/engine/text-editor';
import type { GraphicEditorOptions } from '@graphic-editor/engine/graphic-editor';
import type { ActiveMode } from '../util/active-mode';

export type IdeaEditorMode = 'text' | 'graphic' | 'both' | 'read-only';

export type IdeaEditorView = 'inline' | 'full';

export interface IdeaEditorChromeConfig {
  showTopBar?: boolean;
  showStatusBar?: boolean;
  showModeSwitcher?: boolean;
  showImportExport?: boolean;
  showUndoRedo?: boolean;
}

export interface IdeaEditorConfig {
  document?: DocumentNode;
  locale?: Locale;
  i18nOverrides?: Partial<TranslationDictionary>;
  text?: TextEditorOptions;
  graphic?: GraphicEditorOptions;
  chrome?: IdeaEditorChromeConfig;
  /** Inline view only today; future: plugin constructor array */
  statusBar?: boolean;
  shortcuts?: {
    enabled?: boolean;
    entries?: ShortcutEntry[];
  };
  onReady?: (instance: IdeaEditorInstance) => void;
  onChange?: (doc: DocumentNode) => void;
  onModeChange?: (mode: ActiveMode) => void;
  extensions?: Record<string, unknown>;
}

export interface IdeaEditorCreateOptions {
  mode: IdeaEditorMode;
  container: string | HTMLElement;
  view?: IdeaEditorView;
  config?: IdeaEditorConfig;
}

export interface IdeaEditorInstance {
  destroy(): void;
  getDocument(): DocumentNode;
  setDocument(doc: DocumentNode): void;
  getMode(): ActiveMode;
  setMode(mode: ActiveMode): void;
  getEventBus(): EventBus;
  exportJSON(): void;
  importJSON(): void;
  getElement(): HTMLElement;
}
