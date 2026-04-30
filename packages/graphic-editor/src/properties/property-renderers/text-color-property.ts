import { ColorPicker } from '@shared/components/color-picker';
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicBlockProperty } from '../../blocks/properties';
import { pushUpdate, readValue, makePanel } from './renderer-utils';
import type { RendererContext, RendererResult } from './types';

const colorPickerInstance = new ColorPicker();

type TextColorProp = Extract<GraphicBlockProperty, { kind: 'textColor' }>;

export function createTextColorRenderer(
  property: TextColorProp,
  rendCtx: RendererContext,
): RendererResult {
  const panel = makePanel();
  const row = document.createElement('div');
  row.className = 'idea-prop-panel__row idea-prop-panel__row--full';

  const currentColor = (readValue(rendCtx.node, property.colorPath) as string | undefined) ?? '#000000';

  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'idea-prop-panel__color-swatch idea-prop-panel__color-swatch--large';
  swatch.style.backgroundColor = currentColor;

  swatch.addEventListener('click', () => {
    const rect = swatch.getBoundingClientRect();
    colorPickerInstance.show({
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.bottom + 4,
      initialColor: (readValue(rendCtx.node, property.colorPath) as string) ?? '#000000',
      initialColorParseAs: 'color',
      labels: {
        select: rendCtx.ctx.i18n.t('colorPicker.select'),
        cancel: rendCtx.ctx.i18n.t('colorPicker.cancel'),
      },
      onSelect: (color) => {
        swatch.style.backgroundColor = color;
        pushUpdate(property.colorPath, color, rendCtx);
      },
    });
  });

  row.appendChild(swatch);
  panel.appendChild(row);

  return {
    element: panel,
    setValue(updatedNode: GraphicElement) {
      rendCtx = { ...rendCtx, node: updatedNode };
      const newColor = (readValue(updatedNode, property.colorPath) as string | undefined) ?? '#000000';
      swatch.style.backgroundColor = newColor;
    },
  };
}
