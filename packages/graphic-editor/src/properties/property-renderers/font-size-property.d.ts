import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type FontSizeProp = Extract<GraphicBlockProperty, {
    kind: 'fontSize';
}>;
export declare function createFontSizeRenderer(property: FontSizeProp, rendCtx: RendererContext): RendererResult;
export {};
//# sourceMappingURL=font-size-property.d.ts.map