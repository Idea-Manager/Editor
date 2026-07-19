import type { GraphicElement } from '@core/model/interfaces';
import { getAtPath } from '../../util/object-path';
import type { RendererContext } from './types';
export { getAtPath };
/**
 * Pushes an `UpdateElementCommand` for the current node's element data path,
 * emits `element:update` + `doc:change`, and calls `styleMemory.recordUpdate`.
 */
export declare function pushUpdate(path: string, value: unknown, rendCtx: RendererContext, mergeWindowMs?: number): void;
/** Reads the current value of `path` from `node`. */
export declare function readValue(node: GraphicElement, path: string): unknown;
/** Creates a label + content panel container. */
export declare function makePanel(): HTMLElement;
/** True when the active element is this host or a descendant (e.g. combobox input). */
export declare function isFocusWithinHost(host: HTMLElement): boolean;
//# sourceMappingURL=renderer-utils.d.ts.map