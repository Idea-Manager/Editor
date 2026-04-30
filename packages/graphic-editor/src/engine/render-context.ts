import type { DocumentNode, GraphicPageNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';

export interface GraphicRenderContext {
  document: DocumentNode;
  page: GraphicPageNode;
  eventBus: EventBus;
  i18n: I18nService;
  rootElement?: HTMLElement;
  /** The DOM overlay layer that shape text divs are appended to. */
  overlayHost: HTMLElement;
  /** Used by interactive block content (e.g. text input) to push undo commands. */
  undoRedoManager: UndoRedoManager;
}
