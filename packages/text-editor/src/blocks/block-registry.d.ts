import type { BlockType } from '@core/model/interfaces';
import type { BlockDefinition } from './block-definition';
/** Block definition with any data payload (used for registries and editor options). */
export type AnyBlockDefinition = BlockDefinition<any>;
export interface PaletteItem {
    id: string;
    type: string;
    labelKey: string;
    icon: string;
    dataFactory(): Record<string, unknown>;
    matchData?: Record<string, unknown>;
}
export declare class BlockRegistry {
    private definitions;
    register(def: AnyBlockDefinition): void;
    get(type: string): AnyBlockDefinition;
    has(type: string): boolean;
    getAll(): AnyBlockDefinition[];
    getPaletteItems(excludeTypes?: BlockType[]): PaletteItem[];
}
//# sourceMappingURL=block-registry.d.ts.map