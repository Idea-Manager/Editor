import type { GraphicSelectionManager } from './selection-manager';
import type { ToolId, ToolState } from './tool-state';

/**
 * Coordinates canvas selection and tool state when the user interacts with
 * chrome (left panel, bottom toolbar, keyboard shortcuts).
 */
export class GraphicFocusManager {
  constructor(
    private readonly selectionManager: GraphicSelectionManager,
    private readonly toolState: ToolState,
  ) {}

  clearCanvasFocus(): void {
    this.selectionManager.clear();
  }

  /** User picked a block from the library — exit edit/focus on canvas selection. */
  armPlacement(blockType: string): void {
    this.clearCanvasFocus();
    this.toolState.beginPlacement(blockType);
  }

  /** User picked a canvas tool from bottom toolbar or keyboard. */
  activateTool(tool: ToolId): void {
    if (this.toolState.getTool() === 'placement') {
      this.toolState.cancelPlacement();
    }
    if (tool !== 'selection') {
      this.clearCanvasFocus();
    }
    this.toolState.setTool(tool);
  }
}
