import type { GraphicBlockProperty } from '../../blocks/properties';
import type { RendererResult } from './types';
type HtmlTemplateProp = Extract<GraphicBlockProperty, {
    kind: 'htmlTemplate';
}>;
export declare function createHtmlTemplateRenderer(property: HtmlTemplateProp): RendererResult;
export {};
//# sourceMappingURL=html-template-property.d.ts.map