import type { BlockNode, ListItemData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition, PaletteEntry } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
export declare const MAX_LIST_DEPTH = 4;
export declare class ListItemBlock implements BlockDefinition<ListItemData> {
    readonly type = "list_item";
    readonly labelKey = "block.listUnordered";
    readonly icon = "format_list_bulleted";
    defaultData(): ListItemData;
    paletteEntries(): PaletteEntry[];
    render(node: BlockNode<ListItemData>, ctx: RenderContext): HTMLElement;
    serialize(node: BlockNode<ListItemData>): BlockNode<ListItemData>;
    deserialize(raw: unknown): BlockNode<ListItemData>;
    onEnter(_node: BlockNode<ListItemData>, _ctx: EditorContext): Command | null;
    onDelete(_node: BlockNode<ListItemData>, _ctx: EditorContext): Command | null;
}
//# sourceMappingURL=list-item-block.d.ts.map