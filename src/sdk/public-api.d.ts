/**
 * Public TypeScript declarations for the bundled IdeaEditor SDK.
 * Kept as a single file so npm consumers do not depend on monorepo path aliases.
 */
export type IdeaEditorMode = 'text' | 'graphic' | 'both' | 'read-only';

export type IdeaEditorView = 'inline' | 'full';

export type ActiveMode = 'text' | 'graphic';

export type Locale = 'en' | 'uk';

export type TranslationDictionary = Record<string, string>;

export interface ShortcutEntry {
  keys: string;
  scope: 'global' | 'text' | 'graphic';
  label: string;
  command: () => void;
  when?: (event: KeyboardEvent) => boolean;
}

export interface DocumentNode {
  id: string;
  type: 'document';
  children: unknown[];
  graphicPages: unknown[];
  meta?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TextEditorOptions {
  locale?: Locale;
  i18nOverrides?: Partial<TranslationDictionary>;
  blocks?: unknown[];
  includeDefaultBlocks?: boolean;
  includeDefaultStyles?: boolean;
  extraStyleText?: string;
  toolbars?: Record<string, unknown>;
  clipboard?: Record<string, unknown>;
  readOnly?: boolean;
}

export interface GraphicEditorOptions {
  locale?: Locale;
  pageId?: string;
  includeDefaultStyles?: boolean;
  extraStyleText?: string;
  i18nOverrides?: Partial<TranslationDictionary>;
  skipDefaultBlocks?: boolean;
  blocks?: unknown[];
  leftPanel?: Record<string, unknown>;
  readOnly?: boolean;
}

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

export interface EventBus {
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void;
  emit<T = unknown>(event: string, payload?: T): void;
  off(event: string, handler: (payload: unknown) => void): void;
  removeAllListeners(event?: string): void;
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

export declare function createIdeaEditor(options: IdeaEditorCreateOptions): IdeaEditorInstance;

export declare const IdeaEditor: {
  create: typeof createIdeaEditor;
};

declare const _default: typeof IdeaEditor;
export default _default;
