import type { DocumentNode, BlockSelection } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';

export interface RenderContext {
  document: DocumentNode;
  eventBus: EventBus;
  selection: BlockSelection | null;
  undoRedoManager?: UndoRedoManager;
  i18n: I18nService;
}
