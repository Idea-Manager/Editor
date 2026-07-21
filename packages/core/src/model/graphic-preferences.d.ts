/**
 * Per-block-type "last-used style" memory.
 *
 * Keyed by the `GraphicElement.type` string (e.g. `"rectangle"`, `"triangle"`,
 * `"sticker"`). Values are partial element data so each block kind can store
 * only the fields it cares about (border, fill, fontSize, etc.). Stored under
 * `DocumentNode.data.graphicPreferences`.
 *
 * The graphic editor merges these on top of `defaultData()` when creating a
 * new element, so a user-customised rectangle "teaches" the next triangle the
 * same border, background and text color.
 */
export type GraphicPreferences = Record<string, Partial<Record<string, unknown>>>;
/** A single element snapshot inside a `CustomBlockDefinition`. */
export interface CustomBlockElement {
    type: string;
    /** Zero-anchored data blob (x/y translated so the AABB origin is 0,0). */
    data: Record<string, unknown>;
    meta?: {
        groupId?: string;
        locked?: boolean;
    };
    /** Stable placeholder token used to wire members among snapshot elements. */
    placeholderId: string;
}
/**
 * A user-created custom block, stored at the document level so it round-trips
 * through import / export. Created from a multi-element selection via
 * "Create new block" in the group floating window.
 *
 * Coordinates inside `elements` are zero-anchored against the AABB of the
 * original selection; `source` records only the resulting width/height.
 *
 * Nested custom blocks are NOT supported — when the selection contains a
 * `custom:*` element its constituent members are expanded inline.
 */
export interface CustomBlockDefinition {
    /** Stable ID. Generate with `generateId('blk')`. */
    id: string;
    /** User-provided display name (1–40 chars). */
    name: string;
    /** ISO timestamp set at creation time. */
    createdAt: string;
    /** Dimensions of the bounding box at capture time. Used to centre the placement ghost. */
    source: {
        width: number;
        height: number;
    };
    /** Deep-cloned element snapshots, zero-anchored to the AABB origin. */
    elements: CustomBlockElement[];
}
//# sourceMappingURL=graphic-preferences.d.ts.map