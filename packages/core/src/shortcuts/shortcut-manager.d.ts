export type ShortcutScope = 'global' | 'text' | 'graphic';
export interface ShortcutEntry {
    keys: string;
    scope: ShortcutScope;
    label: string;
    command: () => void;
    /**
     * If provided, the shortcut runs (and may call preventDefault) only when this returns true.
     * Use to skip single-key tools while typing in inputs / contenteditable.
     */
    when?: (e: KeyboardEvent) => boolean;
}
/** True when the key event should be treated as typing (do not steal single-key shortcuts). */
export declare function isKeyboardEventFromEditableTarget(e: KeyboardEvent): boolean;
export declare class ShortcutManager {
    private shortcuts;
    private activeScope;
    private handler;
    register(entry: ShortcutEntry): void;
    registerAll(entries: ShortcutEntry[]): void;
    setScope(scope: ShortcutScope): void;
    getAll(): ShortcutEntry[];
    search(query: string): ShortcutEntry[];
    attach(root?: HTMLElement | Document): () => void;
    destroy(): void;
}
//# sourceMappingURL=shortcut-manager.d.ts.map