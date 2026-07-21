import type { BlockNode, HeadingData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
export declare class HeadingBlock implements BlockDefinition<HeadingData> {
    readonly type = "heading";
    readonly labelKey = "block.heading";
    readonly icon = "title";
    defaultData(): HeadingData;
    render(node: BlockNode<HeadingData>, ctx: RenderContext): HTMLElement;
    serialize(node: BlockNode<HeadingData>): BlockNode<HeadingData>;
    deserialize(raw: unknown): BlockNode<HeadingData>;
    onEnter(_node: BlockNode<HeadingData>, _ctx: EditorContext): Command | null;
    onDelete(_node: BlockNode<HeadingData>, _ctx: EditorContext): Command | null;
}
//# sourceMappingURL=heading-block.d.ts.map