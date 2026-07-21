import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../engine/render-context';
import type { GraphicBlockProperty } from './properties';
/** Inline SVG for the left-panel tile — markup string or a live SVG node. */
export type GraphicBlockIcon = string | SVGElement;
/**
 * Plugin describing a kind of `GraphicElement` that the user can place from
 * the left panel. Built-in kinds live in this package; future user-supplied
 * blocks register through `GraphicEditorOptions.blocks` (added in a later
 * prompt).
 */
export interface GraphicBlockDefinition<TData = Record<string, unknown>> {
    /** Stable string used as `GraphicElement.type`. e.g. "rectangle". */
    readonly type: string;
    /** i18n key for the display label, e.g. "graphic.block.rectangle". Omit for custom blocks that provide `staticLabel`. */
    readonly labelKey?: string;
    /** Verbatim display label used when `labelKey` is absent (e.g. user-named custom blocks). */
    readonly staticLabel?: string;
    /**
     * Icon rendered in the left-panel tile.
     * Strings may be a full `<svg>…</svg>` or inner markup (`<rect/>`, `<path/>`, etc.).
     * `SVGElement` may be the root `<svg>` or an inner SVG node (wrapped automatically).
     */
    readonly icon: GraphicBlockIcon;
    /** Optional group key used to assemble left-panel accordions. */
    readonly groupKey?: string;
    /** Optional pivot points (relative to the element's local 0..1 box). */
    readonly pivots?: ReadonlyArray<{
        x: number;
        y: number;
        id: string;
    }>;
    /** Returns a freshly-defaulted data blob (called when the block is placed). */
    defaultData(): TData;
    /** Renders the SVG body. The renderer attaches data-element-id automatically. */
    renderSvg(node: GraphicElement<TData>, ctx: GraphicRenderContext): SVGElement;
    /**
     * OPTIONAL: renders an HTML overlay (foreignObject content or absolute DOM in
     * the overlay layer). Used for blocks with HTML templates inside (e.g.
     * sticker text input, future SQL-table content). Default behaviour: a
     * single-line text input centred inside the element bounds (sticker style).
     *
     * Return `null` to opt out of any overlay (a "stand-alone" block).
     */
    renderOverlay?(node: GraphicElement<TData>, ctx: GraphicRenderContext): HTMLElement | null;
    /**
     * OPTIONAL: declares property panels shown in the floating window. The
     * graphic editor uses this to build edit controls automatically; built-in
     * blocks declare border / background / text-color / font-size here.
     */
    properties?(node: GraphicElement<TData>, ctx: GraphicRenderContext): GraphicBlockProperty[];
    /**
     * When `false`, the block opts out of the default text overlay and the
     * `text` property panel is omitted. Defaults to `true`.
     */
    supportsDefaultText?: boolean;
    /**
     * Returns the AABB of the element in world coords for hit-testing,
     * intersection logic with frames, and bounding-box rendering.
     */
    getBounds(node: GraphicElement<TData>): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
//# sourceMappingURL=block-definition.d.ts.map