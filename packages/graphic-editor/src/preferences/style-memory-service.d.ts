import type { DocumentNode } from '@core/model/interfaces';
import type { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { GraphicBlockRegistry } from '../blocks/block-registry';
/**
 * Top-level keys (relative to the block's data) that are never persisted into
 * graphicPreferences. Position and geometry fields are intentionally excluded
 * so that newly placed elements always use the definition's default size/position.
 */
export declare const NON_PERSISTABLE_PATHS: Set<string>;
export declare class StyleMemoryService {
    private readonly doc;
    private readonly undoRedoManager;
    /**
     * Pending coalesced updates keyed by `blockType:storePath`.
     * Each flush pushes a single `UpdatePreferencesCommand`.
     */
    private readonly pending;
    constructor(doc: DocumentNode, undoRedoManager: UndoRedoManager);
    /**
     * Returns the effective defaults for a block type by deep-merging saved
     * preferences over the definition's `defaultData()`. Position and
     * non-persistable paths are excluded from the prefs side.
     */
    getEffectiveDefaults(blockType: string, registry: GraphicBlockRegistry): Record<string, unknown>;
    /**
     * Records a property update for a given block type. The `path` argument is
     * the full element-level path (e.g. `"data.border.thickness"`). Internally
     * the `data.` prefix is stripped before storage.
     *
     * Skips NON_PERSISTABLE_PATHS, `data.text`, and `data.template.*`.
     * Coalesces consecutive updates for the same blockType+path within 1 s into
     * a single `UpdatePreferencesCommand`.
     */
    recordUpdate(blockType: string, path: string, value: unknown): void;
    /**
     * Flushes all pending coalesced updates immediately (useful for testing).
     */
    flushPending(): void;
}
//# sourceMappingURL=style-memory-service.d.ts.map