import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type BorderProp = Extract<GraphicBlockProperty, {
    kind: 'border';
}>;
export declare function createBorderRenderer(property: BorderProp, rendCtx: RendererContext, thicknessLabel: string, colorLabel: string): RendererResult;
export {};
//# sourceMappingURL=border-property.d.ts.map