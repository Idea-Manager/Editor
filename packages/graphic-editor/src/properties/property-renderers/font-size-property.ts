import { createDropdownCombobox } from '@shared/components/dropdown-combobox';
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicBlockProperty } from '../../blocks/properties';
import { pushUpdate, readValue, makePanel, isFocusWithinHost } from './renderer-utils';
import type { RendererContext, RendererResult } from './types';

type FontSizeProp = Extract<GraphicBlockProperty, { kind: 'fontSize' }>;

const DEFAULT_PT_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const DEFAULT_PX_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

function buildOptions(property: FontSizeProp): { value: string; label: string }[] {
  const base = property.unit === 'pt' ? DEFAULT_PT_OPTIONS : DEFAULT_PX_OPTIONS;
  const min = property.min ?? 1;
  const max = property.max ?? 200;
  const filtered = base.filter(v => v >= min && v <= max);
  if (filtered.length === 0) {
    return [{ value: String(min), label: String(min) }];
  }
  return filtered.map(v => ({ value: String(v), label: String(v) }));
}

function buildCombobox(
  property: FontSizeProp,
  rendCtx: RendererContext,
  wrapper: HTMLElement,
): void {
  wrapper.innerHTML = '';
  const currentSize = (readValue(rendCtx.node, property.path) as number | undefined) ?? 14;
  const options = buildOptions(property);
  const min = property.min ?? 1;
  const max = property.max ?? 200;

  const { root } = createDropdownCombobox({
    options,
    value: String(currentSize),
    allowCustomInput: true,
    inputMode: 'number',
    unit: property.unit ?? 'pt',
    numericMin: min,
    numericMax: max,
    onChange: (val) => {
      const n = Math.max(min, Math.min(max, parseInt(val, 10)));
      if (Number.isFinite(n)) {
        pushUpdate(property.path, n, rendCtx);
      }
    },
  });
  wrapper.appendChild(root);
}

export function createFontSizeRenderer(
  property: FontSizeProp,
  rendCtx: RendererContext,
): RendererResult {
  const panel = makePanel();
  const row = document.createElement('div');
  row.className = 'idea-prop-panel__row idea-prop-panel__row--full';

  const wrapper = document.createElement('div');
  wrapper.className = 'idea-prop-panel__control';
  buildCombobox(property, rendCtx, wrapper);

  row.appendChild(wrapper);
  panel.appendChild(row);

  return {
    element: panel,
    isActive() {
      return isFocusWithinHost(wrapper);
    },
    setValue(updatedNode: GraphicElement) {
      rendCtx = { ...rendCtx, node: updatedNode };
      if (isFocusWithinHost(wrapper)) return;
      const next = (readValue(updatedNode, property.path) as number | undefined) ?? 14;
      const input = wrapper.querySelector<HTMLInputElement>('.idea-dropdown-combobox__input');
      if (input !== null) {
        const cur = parseInt(input.value.trim(), 10);
        if (Number.isFinite(cur) && cur === next) return;
      }
      buildCombobox(property, rendCtx, wrapper);
    },
  };
}
