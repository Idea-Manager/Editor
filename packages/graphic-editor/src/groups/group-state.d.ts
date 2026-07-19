import type { GraphicPageNode } from '@core/model/interfaces';
import type { SelectionEntry } from '../engine/selection-manager';
export type TriState = 'all' | 'none' | 'mixed';
/**
 * Computes the lock state across the given selection entries.
 * Returns:
 *   'all'  — every selected element has meta.locked === true
 *   'none' — no selected element is locked
 *   'mixed' — some but not all are locked
 */
export declare function computeLockState(entries: SelectionEntry[], page: GraphicPageNode): TriState;
/**
 * Computes the group state across the given selection entries.
 * Returns:
 *   'all'  — all selected elements share the same non-empty groupId
 *   'none' — no selected element has a groupId
 *   'mixed' — some have a groupId or they belong to different groups
 */
export declare function computeGroupState(entries: SelectionEntry[], page: GraphicPageNode): TriState;
/**
 * Returns the shared groupId for a set of entries if they all belong to the
 * same group, or null otherwise.
 */
export declare function getSharedGroupId(entries: SelectionEntry[], page: GraphicPageNode): string | null;
//# sourceMappingURL=group-state.d.ts.map