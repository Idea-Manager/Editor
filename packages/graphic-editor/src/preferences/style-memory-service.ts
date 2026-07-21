import type { DocumentNode } from '@core/model/interfaces';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import { getGraphicPreferences } from '@core/model/document-data';
import type { GraphicBlockRegistry } from '../blocks/block-registry';
import { UpdatePreferencesCommand } from './update-preferences-command';

/**
 * Top-level keys (relative to the block's data) that are never persisted into
 * graphicPreferences. Position and geometry fields are intentionally excluded
 * so that newly placed elements always use the definition's default size/position.
 */
export const NON_PERSISTABLE_PATHS = new Set([
  'x', 'y', 'width', 'height', 'points', 'from', 'to', 'bounds',
]);

/** Coalescing window in ms for consecutive updates of the same blockType+path. */
const COALESCE_MS = 1000;

interface PendingUpdate {
  timer: ReturnType<typeof setTimeout>;
  path: string;
  value: unknown;
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isPersistable(storePath: string): boolean {
  const rootKey = storePath.split('.')[0];
  if (NON_PERSISTABLE_PATHS.has(rootKey)) return false;
  if (rootKey === 'text') return false;
  if (rootKey === 'template') return false;
  return true;
}

export class StyleMemoryService {
  private readonly doc: DocumentNode;
  private readonly undoRedoManager: UndoRedoManager;

  /**
   * Pending coalesced updates keyed by `blockType:storePath`.
   * Each flush pushes a single `UpdatePreferencesCommand`.
   */
  private readonly pending = new Map<string, PendingUpdate>();

  constructor(doc: DocumentNode, undoRedoManager: UndoRedoManager) {
    this.doc = doc;
    this.undoRedoManager = undoRedoManager;
  }

  /**
   * Returns the effective defaults for a block type by deep-merging saved
   * preferences over the definition's `defaultData()`. Position and
   * non-persistable paths are excluded from the prefs side.
   */
  getEffectiveDefaults(blockType: string, registry: GraphicBlockRegistry): Record<string, unknown> {
    const defaults = registry.get(blockType).defaultData() as Record<string, unknown>;
    const allPrefs = getGraphicPreferences(this.doc);
    const rawPrefs = (allPrefs[blockType] ?? {}) as Record<string, unknown>;

    const filteredPrefs = Object.fromEntries(
      Object.entries(rawPrefs).filter(([key]) => isPersistable(key)),
    );

    return deepMerge(defaults, filteredPrefs);
  }

  /**
   * Records a property update for a given block type. The `path` argument is
   * the full element-level path (e.g. `"data.border.thickness"`). Internally
   * the `data.` prefix is stripped before storage.
   *
   * Skips NON_PERSISTABLE_PATHS, `data.text`, and `data.template.*`.
   * Coalesces consecutive updates for the same blockType+path within 1 s into
   * a single `UpdatePreferencesCommand`.
   */
  recordUpdate(blockType: string, path: string, value: unknown): void {
    const storePath = path.startsWith('data.') ? path.slice(5) : path;

    if (!isPersistable(storePath)) return;

    const key = `${blockType}:${storePath}`;

    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      this.pending.delete(key);
      const cmd = new UpdatePreferencesCommand({
        doc: this.doc,
        blockType,
        path: storePath,
        value,
      });
      this.undoRedoManager.push(cmd);
    }, COALESCE_MS);

    this.pending.set(key, { timer, path: storePath, value });
  }

  /**
   * Flushes all pending coalesced updates immediately (useful for testing).
   */
  flushPending(): void {
    for (const [key, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      this.pending.delete(key);
      const [blockType, ...rest] = key.split(':');
      const cmd = new UpdatePreferencesCommand({
        doc: this.doc,
        blockType,
        path: rest.join(':'),
        value: pending.value,
      });
      this.undoRedoManager.push(cmd);
    }
  }
}
