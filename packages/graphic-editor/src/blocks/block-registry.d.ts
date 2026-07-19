import type { DocumentNode } from '@core/model/interfaces';
import type { GraphicBlockDefinition } from './block-definition';
export type AnyGraphicBlockDefinition = GraphicBlockDefinition<any>;
/** Group key for runtime-registered custom blocks (user-created via "Create new block"). */
export declare const CUSTOM_BLOCK_GROUP_KEY = "__custom";
export declare class GraphicBlockRegistry {
    private readonly definitions;
    register(def: AnyGraphicBlockDefinition): void;
    get(type: string): AnyGraphicBlockDefinition;
    has(type: string): boolean;
    getAll(): AnyGraphicBlockDefinition[];
    /**
     * Rebuilds all `custom:*` block definitions from the document's
     * `data.customBlocks` array. Call on init and on every `doc:change` op
     * whose `path` starts with `'data.customBlocks'`.
     */
    syncCustomBlocks(doc: DocumentNode): void;
    /** Returns definitions grouped by `groupKey ?? '__ungrouped'`, preserving registration order. */
    getGroups(): Array<{
        groupKey: string;
        definitions: AnyGraphicBlockDefinition[];
    }>;
}
//# sourceMappingURL=block-registry.d.ts.map