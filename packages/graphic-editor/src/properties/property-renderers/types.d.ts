import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicContext } from '../../engine/graphic-context';
import type { StyleMemoryService } from '../../preferences/style-memory-service';
export interface RendererResult {
    element: HTMLElement;
    /** Returns true while the user is actively editing this control (e.g. typing). */
    isActive?(): boolean;
    /** Refreshes the displayed value from the updated node without re-creating DOM. */
    setValue?(node: GraphicElement): void;
}
export interface RendererContext {
    node: GraphicElement;
    ctx: GraphicContext;
    styleMemory?: StyleMemoryService;
}
//# sourceMappingURL=types.d.ts.map