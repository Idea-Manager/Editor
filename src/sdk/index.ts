export { createIdeaEditor } from './create-idea-editor';
export type {
  IdeaEditorMode,
  IdeaEditorView,
  IdeaEditorChromeConfig,
  IdeaEditorConfig,
  IdeaEditorCreateOptions,
  IdeaEditorInstance,
} from './types';

export type { DocumentNode } from '@core/model/interfaces';
export type { Locale, TranslationDictionary } from '@core/i18n/types';
export type { ShortcutEntry } from '@core/shortcuts/shortcut-manager';
export type { TextEditorOptions } from '@text-editor/engine/text-editor';
export type { GraphicEditorOptions } from '@graphic-editor/engine/graphic-editor';
export type { ActiveMode } from '../util/active-mode';
export type { EventBus } from '@core/events/event-bus';

import { createIdeaEditor } from './create-idea-editor';

export const IdeaEditor = { create: createIdeaEditor };

export default IdeaEditor;
