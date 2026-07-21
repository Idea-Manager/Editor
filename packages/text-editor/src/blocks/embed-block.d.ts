import type { BlockNode, EmbedData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
export declare function pruneEmbedStableRoots(presentBlockIds: Set<string>): void;
export declare class EmbedBlock implements BlockDefinition<EmbedData> {
    readonly type = "embed";
    readonly labelKey = "block.embed";
    readonly icon = "code";
    defaultData(): EmbedData;
    render(node: BlockNode<EmbedData>, ctx: RenderContext): HTMLElement;
    private renderInputState;
    private createRemoveButton;
    private removeBlock;
    private focusAfterDeleteInTableCell;
    private focusAfterDelete;
    private applyEmbedUrl;
    private renderPreviewState;
    private renderFallbackCard;
    serialize(node: BlockNode<EmbedData>): BlockNode<EmbedData>;
    deserialize(raw: unknown): BlockNode<EmbedData>;
    onEnter(_node: BlockNode<EmbedData>, _ctx: EditorContext): Command | null;
    onDelete(_node: BlockNode<EmbedData>, _ctx: EditorContext): Command | null;
}
//# sourceMappingURL=embed-block.d.ts.map