import type { BlockNode, ParagraphData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
export declare class ParagraphBlock implements BlockDefinition<ParagraphData> {
    readonly type = "paragraph";
    readonly labelKey = "block.paragraph";
    readonly icon = "notes";
    defaultData(): ParagraphData;
    render(node: BlockNode<ParagraphData>, ctx: RenderContext): HTMLElement;
    serialize(node: BlockNode<ParagraphData>): BlockNode<ParagraphData>;
    deserialize(raw: unknown): BlockNode<ParagraphData>;
    onEnter(_node: BlockNode<ParagraphData>, _ctx: EditorContext): Command | null;
    onDelete(_node: BlockNode<ParagraphData>, _ctx: EditorContext): Command | null;
}
//# sourceMappingURL=paragraph-block.d.ts.map