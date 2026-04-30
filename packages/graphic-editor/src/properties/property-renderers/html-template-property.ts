import type { GraphicBlockProperty } from '../../blocks/properties';
import { makePanel } from './renderer-utils';
import type { RendererResult } from './types';

type HtmlTemplateProp = Extract<GraphicBlockProperty, { kind: 'htmlTemplate' }>;

export function createHtmlTemplateRenderer(property: HtmlTemplateProp): RendererResult {
  const panel = makePanel();
  const wrapper = document.createElement('div');
  wrapper.className = 'idea-prop-panel__template-host';
  wrapper.appendChild(property.element);
  panel.appendChild(wrapper);
  return { element: panel };
}
