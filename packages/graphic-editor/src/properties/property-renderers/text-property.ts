import type { GraphicElement } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import type { GraphicBlockProperty } from '../../blocks/properties';
import { pushUpdate, readValue, makePanel } from './renderer-utils';
import type { RendererContext, RendererResult } from './types';

type TextProp = Extract<GraphicBlockProperty, { kind: 'text' }>;

export function createTextRenderer(
  property: TextProp,
  rendCtx: RendererContext,
  i18n: I18nService,
): RendererResult {
  const panel = makePanel();
  const row = document.createElement('div');
  row.className = 'idea-prop-panel__row idea-prop-panel__row--full';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'idea-prop-panel__text-input';
  input.value = (readValue(rendCtx.node, property.path) as string | undefined) ?? '';

  if (property.placeholderKey) {
    input.placeholder = i18n.t(property.placeholderKey);
  }

  let active = false;

  input.addEventListener('focus', () => { active = true; });
  input.addEventListener('blur', () => { active = false; });

  input.addEventListener('input', () => {
    pushUpdate(property.path, input.value, rendCtx, 400);
  });

  row.appendChild(input);
  panel.appendChild(row);

  return {
    element: panel,
    isActive() { return active; },
    setValue(updatedNode: GraphicElement) {
      rendCtx = { ...rendCtx, node: updatedNode };
      if (!active) {
        const newText = (readValue(updatedNode, property.path) as string | undefined) ?? '';
        if (input.value !== newText) {
          input.value = newText;
        }
      }
    },
  };
}
