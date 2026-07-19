import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type TextColorProp = Extract<GraphicBlockProperty, {
    kind: 'textColor';
}>;
export declare function createTextColorRenderer(property: TextColorProp, rendCtx: RendererContext): RendererResult;
export {};
//# sourceMappingURL=text-color-property.d.ts.map