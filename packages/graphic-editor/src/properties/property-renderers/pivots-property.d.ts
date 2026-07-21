import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type PivotsProp = Extract<GraphicBlockProperty, {
    kind: 'pivots';
}>;
export declare function createPivotsRenderer(_property: PivotsProp, rendCtx: RendererContext): RendererResult;
export {};
//# sourceMappingURL=pivots-property.d.ts.map