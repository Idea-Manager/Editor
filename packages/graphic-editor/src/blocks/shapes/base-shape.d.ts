import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockProperty } from '../properties';
import { GRAPHIC_PROPS_BORDER, GRAPHIC_PROPS_BACKGROUND, GRAPHIC_PROPS_TEXT_COLOR, GRAPHIC_PROPS_FONT_SIZE } from '../../i18n/keys';
/** Default side length for newly placed square shape bounds. */
export declare const SHAPE_DEFAULT_SIZE = 120;
export interface ShapeData {
    x: number;
    y: number;
    width: number;
    height: number;
    border: {
        thickness: number;
        color: string;
    };
    background: string;
    text: string;
    textColor: string;
    fontSize: number;
    /** When true, corner resize may change width and height independently. Defaults to false. */
    freeResize?: boolean;
}
export declare const SHAPE_DEFAULTS: ShapeData;
export declare function readShapeBounds(node: GraphicElement<ShapeData>): {
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare function readFreeResize(data: Record<string, unknown>): boolean;
/**
 * Builds a contenteditable div in the overlay layer, positioned at world-space
 * bounds. Text grows in width up to bounds width, then wraps; height overflow
 * is visible so content can spill below the shape.
 */
export declare function appendShapeText(overlayHost: HTMLElement, node: GraphicElement<ShapeData>, ctx: GraphicRenderContext, bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}, extraClass?: string): HTMLElement;
export declare function getShapeProperties(_node: GraphicElement<ShapeData>, _ctx: GraphicRenderContext): GraphicBlockProperty[];
export { GRAPHIC_PROPS_BORDER, GRAPHIC_PROPS_BACKGROUND, GRAPHIC_PROPS_TEXT_COLOR, GRAPHIC_PROPS_FONT_SIZE };
//# sourceMappingURL=base-shape.d.ts.map