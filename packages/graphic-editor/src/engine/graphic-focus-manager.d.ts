import type { GraphicSelectionManager } from './selection-manager';
import type { ToolId, ToolState } from './tool-state';
/**
 * Coordinates canvas selection and tool state when the user interacts with
 * chrome (left panel, bottom toolbar, keyboard shortcuts).
 */
export declare class GraphicFocusManager {
    private readonly selectionManager;
    private readonly toolState;
    constructor(selectionManager: GraphicSelectionManager, toolState: ToolState);
    clearCanvasFocus(): void;
    /** User picked a block from the library — exit edit/focus on canvas selection. */
    armPlacement(blockType: string): void;
    /** User picked a canvas tool from bottom toolbar or keyboard. */
    activateTool(tool: ToolId): void;
}
//# sourceMappingURL=graphic-focus-manager.d.ts.map