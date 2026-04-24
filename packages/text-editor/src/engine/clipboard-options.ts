import type { BlockNode } from '@core/model/interfaces';
import type { EditorContext } from './editor-context';

/** Logical paste sources, in user-configurable order. Maps to clipboard MIME reads in {@link ClipboardHandler}. */
export type PasteDataSource = 'idea-editor' | 'text/html' | 'text/plain';

/** Default order: internal JSON, then HTML, then plain (matches pre–Phase D behavior). */
export const DEFAULT_PASTE_DATA_SOURCES: readonly PasteDataSource[] = [
  'idea-editor',
  'text/html',
  'text/plain',
];

/**
 * Optional clipboard policies for advanced integrators. APIs may change; use for trusted environments only.
 * @experimental
 */
export interface TextEditorClipboardOptions {
  /**
   * Return a non-empty array to replace default parsing for this paste. Return `null` or `[]` to use the built-in pipeline (`pasteDataSources` + core HTML/plain handling).
   * @experimental
   */
  transformPaste?: (ctx: EditorContext, e: ClipboardEvent) => BlockNode[] | null;

  /**
   * Order in which clipboard sources are tried until one yields blocks. Omit to use {@link DEFAULT_PASTE_DATA_SOURCES}. Use e.g. `['text/plain']` to ignore rich HTML and internal payloads.
   * @experimental
   */
  pasteDataSources?: readonly PasteDataSource[];
}
