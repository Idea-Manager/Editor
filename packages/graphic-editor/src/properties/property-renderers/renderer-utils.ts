import type { GraphicElement } from '@core/model/interfaces';
import { UpdateElementCommand } from '../../engine/commands/update-element-command';
import { getAtPath } from '../../util/object-path';
import type { RendererContext } from './types';

export { getAtPath };

/**
 * Pushes an `UpdateElementCommand` for the current node's element data path,
 * emits `element:update` + `doc:change`, and calls `styleMemory.recordUpdate`.
 */
export function pushUpdate(
  path: string,
  value: unknown,
  rendCtx: RendererContext,
  mergeWindowMs = 400,
): void {
  const { node, ctx, styleMemory } = rendCtx;
  const cmd = new UpdateElementCommand({
    doc: ctx.document,
    pageId: ctx.page.id,
    elementId: node.id,
    path,
    value,
    mergeWindowMs,
  });
  ctx.undoRedoManager.push(cmd);
  ctx.eventBus.emit('element:update');
  ctx.eventBus.emit('doc:change');
  styleMemory?.recordUpdate(node.type, path, value);
}

/** Reads the current value of `path` from `node`. */
export function readValue(node: GraphicElement, path: string): unknown {
  return getAtPath(node as unknown as Record<string, unknown>, path);
}

/** Creates a label + content panel container. */
export function makePanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'idea-prop-panel';
  return panel;
}
