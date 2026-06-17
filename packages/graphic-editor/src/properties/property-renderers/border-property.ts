import { ColorPicker } from '@shared/components/color-picker';
import { createDropdownCombobox } from '@shared/components/dropdown-combobox';
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicBlockProperty } from '../../blocks/properties';
import { pushUpdate, readValue, makePanel, isFocusWithinHost } from './renderer-utils';
import type { RendererContext, RendererResult } from './types';

const colorPickerInstance = new ColorPicker();

type BorderProp = Extract<GraphicBlockProperty, { kind: 'border' }>;

const THICKNESS_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function buildCombobox(
  property: BorderProp,
  rendCtx: RendererContext,
  comboWrapper: HTMLElement,
): void {
  comboWrapper.innerHTML = '';
  const currentThickness = (readValue(rendCtx.node, property.thicknessPath) as number | undefined) ?? 1;
  const { root } = createDropdownCombobox({
    options: THICKNESS_OPTIONS,
    value: String(currentThickness),
    allowCustomInput: true,
    inputMode: 'number',
    unit: 'px',
    numericMin: 1,
    numericMax: 8,
    onChange: (val) => {
      const n = Math.max(1, Math.min(8, parseInt(val, 10)));
      if (Number.isFinite(n)) {
        pushUpdate(property.thicknessPath, n, rendCtx);
      }
    },
  });
  comboWrapper.appendChild(root);
}

export function createBorderRenderer(
  property: BorderProp,
  rendCtx: RendererContext,
  thicknessLabel: string,
  colorLabel: string,
): RendererResult {
  const panel = makePanel();

  // ── Thickness row ──────────────────────────────────────────────────────────
  const thicknessRow = document.createElement('div');
  thicknessRow.className = 'idea-prop-panel__row';

  const thicknessLbl = document.createElement('span');
  thicknessLbl.className = 'idea-prop-panel__label';
  thicknessLbl.textContent = thicknessLabel;

  const comboWrapper = document.createElement('div');
  comboWrapper.className = 'idea-prop-panel__control idea-prop-panel__control--push-right';
  buildCombobox(property, rendCtx, comboWrapper);

  thicknessRow.appendChild(thicknessLbl);
  thicknessRow.appendChild(comboWrapper);
  panel.appendChild(thicknessRow);

  // ── Color row ──────────────────────────────────────────────────────────────
  const colorRow = document.createElement('div');
  colorRow.className = 'idea-prop-panel__row';

  const colorLbl = document.createElement('span');
  colorLbl.className = 'idea-prop-panel__label';
  colorLbl.textContent = colorLabel;

  const colorSwatch = document.createElement('button');
  colorSwatch.type = 'button';
  colorSwatch.className = 'idea-prop-panel__color-swatch';
  colorSwatch.style.backgroundColor = (readValue(rendCtx.node, property.colorPath) as string | undefined) ?? '#000000';

  colorSwatch.addEventListener('click', () => {
    const rect = colorSwatch.getBoundingClientRect();
    colorPickerInstance.show({
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.bottom + 4,
      initialColor: (readValue(rendCtx.node, property.colorPath) as string) ?? '#000000',
      labels: {
        select: rendCtx.ctx.i18n.t('colorPicker.select'),
        cancel: rendCtx.ctx.i18n.t('colorPicker.cancel'),
      },
      onSelect: (color) => {
        colorSwatch.style.backgroundColor = color;
        pushUpdate(property.colorPath, color, rendCtx);
      },
    });
  });

  colorRow.appendChild(colorLbl);
  colorRow.appendChild(colorSwatch);
  panel.appendChild(colorRow);

  return {
    element: panel,
    isActive() {
      return isFocusWithinHost(comboWrapper);
    },
    setValue(updatedNode: GraphicElement) {
      rendCtx = { ...rendCtx, node: updatedNode };
      if (!isFocusWithinHost(comboWrapper)) {
        const next = (readValue(updatedNode, property.thicknessPath) as number | undefined) ?? 1;
        const input = comboWrapper.querySelector<HTMLInputElement>('.idea-dropdown-combobox__input');
        if (input === null || !Number.isFinite(parseInt(input.value.trim(), 10)) || parseInt(input.value.trim(), 10) !== next) {
          buildCombobox(property, rendCtx, comboWrapper);
        }
      }
      const newColor = (readValue(updatedNode, property.colorPath) as string | undefined) ?? '#000000';
      colorSwatch.style.backgroundColor = newColor;
    },
  };
}
