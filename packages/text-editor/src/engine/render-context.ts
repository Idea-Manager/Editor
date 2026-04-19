import type { DocumentNode, BlockSelection } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { SelectionManager } from './selection-manager';
import type { BlockRegistry } from '../blocks/block-registry';

export interface RenderContext {
  document: DocumentNode;
  eventBus: EventBus;
  selection: BlockSelection | null;
  undoRedoManager?: UndoRedoManager;
  i18n: I18nService;
  /** Host for overlays (e.g. embed URL modal); set by `TextEditor`. */
  rootElement?: HTMLElement;
  /** Set by `TextEditor` for block UI that updates selection (e.g. embed remove). */
  selectionManager?: SelectionManager;
  /** Required for blocks that render nested blocks (e.g. table cells). */
  blockRegistry?: BlockRegistry;
}
