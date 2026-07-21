import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererResult } from './types';
type CustomProp = Extract<GraphicBlockProperty, {
    kind: 'custom';
}>;
export declare function createCustomRenderer(property: CustomProp): RendererResult;
export {};
//# sourceMappingURL=custom-property.d.ts.map