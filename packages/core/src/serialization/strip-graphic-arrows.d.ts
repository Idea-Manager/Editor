import type { DocumentNode } from '../model/interfaces';
/**
 * Returns a deep clone of the document with arrow-related data removed.
 * Used on export so saved JSON no longer contains legacy connector elements.
 */
export declare function stripGraphicArrows(doc: DocumentNode): DocumentNode;
//# sourceMappingURL=strip-graphic-arrows.d.ts.map