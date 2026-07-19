import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type StrokeColorProp = Extract<GraphicBlockProperty, {
    kind: 'strokeColor';
}>;
export declare function createStrokeColorRenderer(property: StrokeColorProp, rendCtx: RendererContext): RendererResult;
export {};
//# sourceMappingURL=stroke-color-property.d.ts.map