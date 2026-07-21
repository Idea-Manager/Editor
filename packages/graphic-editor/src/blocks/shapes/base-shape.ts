import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockProperty } from '../properties';
import { UpdateElementCommand } from '../../engine/commands/update-element-command';
import {
  GRAPHIC_PROPS_TEXT_PLACEHOLDER,
  GRAPHIC_PROPS_BORDER,
  GRAPHIC_PROPS_BACKGROUND,
  GRAPHIC_PROPS_TEXT_COLOR,
  GRAPHIC_PROPS_FONT_SIZE,
} from '../../i18n/keys';

/** Default side length for newly placed square shape bounds. */
export const SHAPE_DEFAULT_SIZE = 120;

export interface ShapeData {
  x: number;
  y: number;
  width: number;
  height: number;
  border: { thickness: number; color: string };
  background: string;
  text: string;
  textColor: string;
  fontSize: number;
  /** When true, corner resize may change width and height independently. Defaults to false. */
  freeResize?: boolean;
}

export const SHAPE_DEFAULTS: ShapeData = {
  x: 0,
  y: 0,
  width: SHAPE_DEFAULT_SIZE,
  height: SHAPE_DEFAULT_SIZE,
  border: { thickness: 1, color: '#000000' },
  background: '#ffffff',
  text: '',
  textColor: '#111111',
  fontSize: 14,
};

export function readShapeBounds(
  node: GraphicElement<ShapeData>,
): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height } = node.data;
  return { x, y, width, height };
}

export function readFreeResize(data: Record<string, unknown>): boolean {
  return data.freeResize === true;
}

/**
 * Builds a contenteditable div in the overlay layer, positioned at world-space
 * bounds. Text grows in width up to bounds width, then wraps; height overflow
 * is visible so content can spill below the shape.
 */
export function appendShapeText(
  overlayHost: HTMLElement,
  node: GraphicElement<ShapeData>,
  ctx: GraphicRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
  extraClass?: string,
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'idea-graphic-shape__text' + (extraClass ? ` ${extraClass}` : '');
  div.contentEditable = 'true';
  div.setAttribute('data-element-id', node.id);
  div.setAttribute('spellcheck', 'false');

  div.style.position = 'absolute';
  div.style.left = `${bounds.x}px`;
  div.style.top = `${bounds.y}px`;
  div.style.width = `${bounds.width}px`;
  div.style.height = `${bounds.height}px`;
  div.style.fontSize = `${node.data.fontSize}pt`;
  div.style.color = node.data.textColor;

  if (node.data.text) {
    div.textContent = node.data.text;
  }

  let pendingCmd: UpdateElementCommand | null = null;

  const pushUpdate = (value: string, merge: boolean) => {
    const cmd = new UpdateElementCommand({
      doc: ctx.document,
      pageId: ctx.page.id,
      elementId: node.id,
      path: 'data.text',
      value,
      mergeWindowMs: merge ? 600 : 0,
    });
    ctx.undoRedoManager.push(cmd);
    ctx.eventBus.emit('element:update');
    if (merge) {
      pendingCmd = cmd;
    } else {
      pendingCmd = null;
    }
  };

  div.addEventListener('input', () => {
    pushUpdate(div.textContent ?? '', true);
  });

  div.addEventListener('blur', () => {
    if (pendingCmd !== null) {
      pushUpdate(div.textContent ?? '', false);
    }
  });

  overlayHost.appendChild(div);
  return div;
}

export function getShapeProperties(
  _node: GraphicElement<ShapeData>,
  _ctx: GraphicRenderContext,
): GraphicBlockProperty[] {
  return [
    { kind: 'border', thicknessPath: 'data.border.thickness', colorPath: 'data.border.color' },
    { kind: 'background', colorPath: 'data.background' },
    { kind: 'textColor', colorPath: 'data.textColor' },
    { kind: 'fontSize', path: 'data.fontSize', min: 5, max: 80, unit: 'pt' },
    { kind: 'text', path: 'data.text', placeholderKey: GRAPHIC_PROPS_TEXT_PLACEHOLDER },
  ];
}

// Re-export key constants used by property descriptors so importers don't
// need to import keys.ts separately.
export { GRAPHIC_PROPS_BORDER, GRAPHIC_PROPS_BACKGROUND, GRAPHIC_PROPS_TEXT_COLOR, GRAPHIC_PROPS_FONT_SIZE };
