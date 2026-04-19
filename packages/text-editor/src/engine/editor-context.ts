import type { DocumentNode, BlockSelection } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { SelectionManager } from './selection-manager';
import type { BlockRegistry } from '../blocks/block-registry';

export interface EditorContext {
  document: DocumentNode;
  selectionManager: SelectionManager;
  undoRedoManager: UndoRedoManager;
  eventBus: EventBus;
  blockRegistry: BlockRegistry;
  rootElement: HTMLElement;
  i18n: I18nService;
}
