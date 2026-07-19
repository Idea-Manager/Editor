export type ComboboxInputMode = 'text' | 'number' | {
    pattern: string | RegExp;
};
export interface DropdownComboboxConfig<T extends string> {
    options: readonly {
        value: T;
        label: string;
    }[];
    value: T;
    onChange: (value: T) => void;
    /**
     * Fires on every `input` event with the trimmed value (e.g. live preview while typing).
     * Does not replace `onChange` (still fired on list pick / committed blur/Enter).
     */
    onInput?: (trimmed: string) => void;
    /** When true, the field accepts typed text (subject to `inputMode`). */
    allowCustomInput?: boolean;
    /** How typed input is validated; default is free text. */
    inputMode?: ComboboxInputMode;
    /**
     * Suffix shown to the right of the editable value (e.g. "px"), styled muted and not editable.
     * Omitted = no unit column.
     */
    unit?: string;
    /**
     * When both are set, non-empty `allowCustomInput` values that are integer digit strings
     * are clamped to [numericMin, numericMax] (commit, live `onInput`, and display on commit).
     * Ignored if either is undefined.
     */
    numericMin?: number;
    numericMax?: number;
    /**
     * Where to open the list relative to the field (`fixed` to viewport).
     * @default 'auto' — opens upward when little space below the field.
     */
    listPlacement?: 'auto' | 'above' | 'below';
}
/**
 * List + optional editable input; validates typed value against `inputMode` and snaps to last good on failure.
 * When the list is open, it is attached to `document.body` with `position: fixed` so it is not clipped by
 * scrollable parents (e.g. modal bodies).
 */
export type DropdownComboboxResult<T extends string> = {
    root: HTMLDivElement;
    /** Apply the current input (call before actions that need the latest typed value, e.g. when parent uses mousedown on a button). */
    commit: () => void;
};
export declare function createDropdownCombobox<T extends string>(config: DropdownComboboxConfig<T>): DropdownComboboxResult<T>;
//# sourceMappingURL=dropdown-combobox.d.ts.map