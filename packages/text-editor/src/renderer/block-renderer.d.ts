import type { DocumentNode, BlockNode } from '@core/model/interfaces';
import type { RenderContext } from '../engine/render-context';
import type { BlockRegistry } from '../blocks/block-registry';
/**
 * Produces top-level `HTMLElement` nodes for `blocks`, grouping consecutive `list_item` blocks
 * into a single `ul`/`ol` root per group (same structure as the main document).
 */
export declare function collectRenderedBlockListElements(registry: BlockRegistry, blocks: ReadonlyArray<BlockNode>, ctx: RenderContext, versionMap?: Map<string, number>): HTMLElement[];
/**
 * Renders a flat block array into `parent`, grouping consecutive `list_item` blocks
 * into ul/ol like the main document (required for correct list styling and structure).
 */
export declare function appendRenderedBlockList(registry: BlockRegistry, blocks: ReadonlyArray<BlockNode>, parent: HTMLElement, ctx: RenderContext, versionMap?: Map<string, number>): void;
export declare class BlockRenderer {
    private readonly registry;
    private renderedVersions;
    constructor(registry: BlockRegistry);
    reconcile(doc: DocumentNode, rootEl: HTMLElement, ctx: RenderContext): void;
    renderBlock(block: BlockNode, ctx: RenderContext): HTMLElement;
}
//# sourceMappingURL=block-renderer.d.ts.map