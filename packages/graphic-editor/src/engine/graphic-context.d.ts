import type { DocumentNode, GraphicPageNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { ViewportController } from './viewport-controller';
import type { GraphicBlockRegistry } from '../blocks/block-registry';
import type { ToolState } from './tool-state';
import type { StyleMemoryService } from '../preferences/style-memory-service';
import type { GraphicFocusManager } from './graphic-focus-manager';
export interface GraphicContext {
    document: DocumentNode;
    page: GraphicPageNode;
    undoRedoManager: UndoRedoManager;
    eventBus: EventBus;
    rootElement: HTMLElement;
    i18n: I18nService;
    viewportController: ViewportController;
    registry: GraphicBlockRegistry;
    toolState?: ToolState;
    styleMemory?: StyleMemoryService;
    focusManager?: GraphicFocusManager;
}
//# sourceMappingURL=graphic-context.d.ts.map