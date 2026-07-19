import type { GraphicBlockDefinition } from '../block-definition';
export interface PathData {
    /** World-space points along the stroke; already smoothed. */
    points: Array<{
        x: number;
        y: number;
    }>;
    /** Stroke colour. Hex literal is allowed for data defaults (see project convention). */
    stroke: string;
    /** Stroke thickness in px (constant; no pressure curves). */
    strokeWidth: number;
    /** Line cap style. Default 'round'. */
    lineCap?: 'butt' | 'round' | 'square';
    /** Line join style. Default 'round'. */
    lineJoin?: 'miter' | 'round' | 'bevel';
    /** AABB cached for hit-testing; recomputed by PenController when the stroke is committed. */
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export declare const PATH_DEFAULTS: {
    stroke: string;
    strokeWidth: number;
    lineCap: "round";
    lineJoin: "round";
};
export declare const PathBlock: GraphicBlockDefinition<PathData>;
//# sourceMappingURL=path-block.d.ts.map