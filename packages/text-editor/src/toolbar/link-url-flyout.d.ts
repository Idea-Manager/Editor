import type { BlockNode } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import { InlineMarkManager } from '../inline/inline-mark-manager';
export type LinkUrlFlyoutTarget = {
    block: BlockNode;
    start: number;
    end: number;
};
export type OpenLinkUrlFlyoutOptions = {
    ctx: EditorContext;
    markManager: InlineMarkManager;
    /** Used for positioning; called on each resize/scroll tick. */
    getAnchorRect: () => DOMRect | null;
    initialHref?: string;
    targets: LinkUrlFlyoutTarget[];
    onAfterCommit?: () => void;
    /** Called whenever the panel is torn down (commit, cancel, or Escape). */
    onClosed?: () => void;
};
/**
 * URL input panel (check / cancel). Caller owns lifecycle via returned `close`.
 */
export declare function openLinkUrlFlyout(opts: OpenLinkUrlFlyoutOptions & {
    preferBelow?: boolean;
}): {
    element: HTMLDivElement;
    close: () => void;
};
//# sourceMappingURL=link-url-flyout.d.ts.map