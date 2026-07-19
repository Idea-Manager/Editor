import type { EditorContext } from '../engine/editor-context';
import { type CellRange } from '../engine/commands/merge-cells-command';
import type { TableContextMenuConfig } from './toolbar-options';
export interface TableRangeSelectEndPayload {
    clientX: number;
    clientY: number;
    blockId: string;
    /** Cell where the range gesture started (structure ops use this, not range min/max). */
    anchorCellId: string;
    range: CellRange;
    tableWrapper: HTMLElement;
}
export declare class TableContextMenu {
    private readonly ctx;
    private readonly host;
    private overlay;
    private colorPicker;
    /** Table wrapper whose cell highlights / range-select class we clear when the menu closes. */
    private menuTableWrapper;
    private readonly disposers;
    private readonly menuConfig;
    constructor(ctx: EditorContext, host: HTMLElement, menuConfig?: TableContextMenuConfig);
    destroy(): void;
    private attach;
    private resolveCellPosition;
    private showForRange;
    private cleanupTableRangeVisuals;
    private show;
    private renderMenu;
    private appendSeparator;
    private appendBorderToggles;
    private appendBackgroundPicker;
    private hide;
    private clearColorPicker;
    private exec;
    private execDeleteTableBlock;
    private focusAfterTableRemoved;
    private focusAfterDeleteInTableCell;
}
//# sourceMappingURL=table-context-menu.d.ts.map