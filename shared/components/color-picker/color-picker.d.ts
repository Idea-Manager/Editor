export interface ColorPickerShowOptions {
    anchorX: number;
    anchorY: number;
    /** Any valid CSS color string, or undefined to use defaults below. */
    initialColor?: string;
    /**
     * Which CSS property to use when parsing `initialColor`.
     * @default 'background'
     */
    initialColorParseAs?: 'color' | 'background';
    /** Labels for footer buttons. */
    labels: {
        select: string;
        cancel: string;
    };
    onSelect: (color: string) => void;
    onCancel?: () => void;
    /**
     * When true, prefer placing the panel above `anchorY` (use the trigger’s top edge as `anchorY`).
     * If it does not fit, place below `fallbackAnchorY` (e.g. trigger bottom + gap).
     */
    preferOpenAbove?: boolean;
    fallbackAnchorY?: number;
}
export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}
export declare function rgbToHsv(r: number, g: number, b: number): {
    h: number;
    s: number;
    v: number;
};
export declare function hsvToRgb(h: number, s: number, v: number): {
    r: number;
    g: number;
    b: number;
};
/** Parse via browser (supports hex, rgb, hsl, named colors). */
export declare function parseCssColorToRgba(css: string, parseAs?: 'color' | 'background'): Rgba | null;
export declare function rgbaToCssString({ r, g, b, a }: Rgba): string;
export interface ComputePickerPositionOptions {
    preferOpenAbove?: boolean;
    fallbackAnchorY?: number;
}
export declare function computePickerPosition(width: number, height: number, anchorX: number, anchorY: number, placement?: ComputePickerPositionOptions): {
    left: number;
    top: number;
};
/**
 * Floating HSV + alpha color picker (fixed to viewport).
 */
export declare class ColorPicker {
    private root;
    private readonly disposers;
    get element(): HTMLDivElement | null;
    show(options: ColorPickerShowOptions): void;
    hide(): void;
    isVisible(): boolean;
}
//# sourceMappingURL=color-picker.d.ts.map