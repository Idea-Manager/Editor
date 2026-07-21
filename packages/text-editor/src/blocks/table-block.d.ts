import type { BlockNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
export declare function pruneTableStableRoots(presentBlockIds: Set<string>): void;
/** Clears table cell range-selection UI classes (long-press / context menu). */
export declare function clearTableCellRangeDomClasses(el: Element): void;
export declare class TableBlock implements BlockDefinition<TableData> {
    readonly type = "table";
    readonly labelKey = "block.table";
    readonly icon = "table_chart";
    defaultData(): TableData;
    render(node: BlockNode<TableData>, ctx: RenderContext): HTMLElement;
    /**
     * Updates grid/cell chrome and reconciles cell inners in place. Returns false if DOM is missing
     * expected cells (caller should rebuild).
     */
    private syncTableDom;
    private buildFreshTableDom;
    private attachColumnResize;
    private attachCellSelection;
    serialize(node: BlockNode<TableData>): BlockNode<TableData>;
    deserialize(raw: unknown): BlockNode<TableData>;
    onEnter(_node: BlockNode<TableData>, _ctx: EditorContext): Command | null;
    onDelete(_node: BlockNode<TableData>, _ctx: EditorContext): Command | null;
}
//# sourceMappingURL=table-block.d.ts.map