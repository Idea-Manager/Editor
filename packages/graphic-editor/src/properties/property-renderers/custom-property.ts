import type { GraphicBlockProperty } from '../../blocks/properties';
import { makePanel } from './renderer-utils';
import type { RendererResult } from './types';

type CustomProp = Extract<GraphicBlockProperty, { kind: 'custom' }>;

export function createCustomRenderer(property: CustomProp): RendererResult {
  const panel = makePanel();
  const wrapper = document.createElement('div');
  wrapper.className = 'idea-prop-panel__custom-host';
  wrapper.appendChild(property.element);
  panel.appendChild(wrapper);
  return { element: panel };
}
