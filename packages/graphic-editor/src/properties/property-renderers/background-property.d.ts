import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type BackgroundProp = Extract<GraphicBlockProperty, {
    kind: 'background';
}>;
export declare function createBackgroundRenderer(property: BackgroundProp, rendCtx: RendererContext): RendererResult;
export {};
//# sourceMappingURL=background-property.d.ts.map