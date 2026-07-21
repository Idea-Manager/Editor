import type { EventBus } from '@core/events/event-bus';
export type ToolId = 'selection' | 'frame' | 'pen' | 'sticker' | 'placement' | 'hand';
export interface ToolStateSnapshot {
    tool: ToolId;
    pendingBlockType?: string;
    previousTool?: ToolId;
}
type ChangeListener = (snap: ToolStateSnapshot) => void;
export declare class ToolState {
    private tool;
    private pendingBlockType;
    private previousTool;
    private readonly listeners;
    private readonly eventBus;
    constructor(eventBus: EventBus);
    getTool(): ToolId;
    getSnapshot(): ToolStateSnapshot;
    setTool(tool: ToolId, opts?: {
        silent?: boolean;
    }): void;
    beginPlacement(blockType: string): void;
    cancelPlacement(): void;
    consumePlacement(): string | null;
    onChange(listener: ChangeListener): () => void;
    private _emit;
}
export {};
//# sourceMappingURL=tool-state.d.ts.map