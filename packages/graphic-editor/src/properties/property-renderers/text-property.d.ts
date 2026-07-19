import type { I18nService } from '@core/i18n/i18n';
import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererContext, RendererResult } from './types';
type TextProp = Extract<GraphicBlockProperty, {
    kind: 'text';
}>;
export declare function createTextRenderer(property: TextProp, rendCtx: RendererContext, i18n: I18nService): RendererResult;
export {};
//# sourceMappingURL=text-property.d.ts.map