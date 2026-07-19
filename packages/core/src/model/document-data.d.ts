import type { DocumentNode } from './interfaces';
import type { GraphicPreferences, CustomBlockDefinition } from './graphic-preferences';
export declare function getGraphicPreferences(doc: DocumentNode): GraphicPreferences;
export declare function getCustomBlocks(doc: DocumentNode): CustomBlockDefinition[];
export declare const DOCUMENT_DATA_KEYS: {
    readonly graphicPreferences: "graphicPreferences";
    readonly customBlocks: "customBlocks";
};
//# sourceMappingURL=document-data.d.ts.map