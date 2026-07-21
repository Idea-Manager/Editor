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
export function computeLockState(entries: SelectionEntry[], page: GraphicPageNode): TriState {
  const elements = entries
    .filter(e => e.type === 'element')
    .map(e => page.elements.find(el => el.id === e.id))
    .filter(Boolean);

  if (elements.length === 0) return 'none';

  const lockedCount = elements.filter(el => el!.meta?.locked === true).length;
  if (lockedCount === 0) return 'none';
  if (lockedCount === elements.length) return 'all';
  return 'mixed';
}

/**
 * Computes the group state across the given selection entries.
 * Returns:
 *   'all'  — all selected elements share the same non-empty groupId
 *   'none' — no selected element has a groupId
 *   'mixed' — some have a groupId or they belong to different groups
 */
export function computeGroupState(entries: SelectionEntry[], page: GraphicPageNode): TriState {
  const elements = entries
    .filter(e => e.type === 'element')
    .map(e => page.elements.find(el => el.id === e.id))
    .filter(Boolean);

  if (elements.length === 0) return 'none';

  const groupIds = elements.map(el => el!.meta?.groupId ?? null);
  const nonNullIds = groupIds.filter(id => id !== null);

  if (nonNullIds.length === 0) return 'none';

  const firstId = nonNullIds[0];
  const allSame = groupIds.every(id => id === firstId);

  if (allSame && nonNullIds.length === elements.length) return 'all';
  return 'mixed';
}

/**
 * Returns the shared groupId for a set of entries if they all belong to the
 * same group, or null otherwise.
 */
export function getSharedGroupId(entries: SelectionEntry[], page: GraphicPageNode): string | null {
  const elements = entries
    .filter(e => e.type === 'element')
    .map(e => page.elements.find(el => el.id === e.id))
    .filter(Boolean);

  if (elements.length === 0) return null;

  const firstId = elements[0]!.meta?.groupId ?? null;
  if (!firstId) return null;

  const allSame = elements.every(el => el!.meta?.groupId === firstId);
  return allSame ? firstId : null;
}
