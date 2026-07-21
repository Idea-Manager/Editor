import type { GraphicBlockProperty } from '../../blocks/properties';
import { makePanel } from './renderer-utils';
import type { RendererContext, RendererResult } from './types';

type PivotsProp = Extract<GraphicBlockProperty, { kind: 'pivots' }>;

const PIVOT_ICON_MAP: Record<string, string> = {
  top: 'keyboard_arrow_up',
  right: 'keyboard_arrow_right',
  bottom: 'keyboard_arrow_down',
  left: 'keyboard_arrow_left',
  center: 'center_focus_strong',
};

export function createPivotsRenderer(
  _property: PivotsProp,
  rendCtx: RendererContext,
): RendererResult {
  const panel = makePanel();
  const row = document.createElement('div');
  row.className = 'idea-prop-panel__row idea-prop-panel__row--full';

  const pivotList = document.createElement('div');
  pivotList.className = 'idea-prop-panel__pivot-list';

  const def = rendCtx.ctx.registry.has(rendCtx.node.type)
    ? rendCtx.ctx.registry.get(rendCtx.node.type)
    : null;

  const pivots = def?.pivots ?? [];

  for (const pivot of pivots) {
    const icon = document.createElement('span');
    icon.className = 'idea-prop-panel__pivot-icon material-symbols-outlined';
    icon.textContent = PIVOT_ICON_MAP[pivot.id] ?? 'radio_button_unchecked';
    icon.title = pivot.id;
    pivotList.appendChild(icon);
  }

  if (pivots.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'idea-prop-panel__empty';
    empty.textContent = '—';
    pivotList.appendChild(empty);
  }

  row.appendChild(pivotList);
  panel.appendChild(row);

  return { element: panel };
}
