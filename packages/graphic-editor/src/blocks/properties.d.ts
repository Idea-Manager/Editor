export type GraphicBlockProperty = {
    kind: 'border';
    thicknessPath: string;
    colorPath: string;
} | {
    kind: 'background';
    colorPath: string;
} | {
    kind: 'strokeColor';
    colorPath: string;
} | {
    kind: 'textColor';
    colorPath: string;
} | {
    kind: 'fontSize';
    path: string;
    min?: number;
    max?: number;
    unit?: 'px' | 'pt';
} | {
    kind: 'text';
    path: string;
    placeholderKey?: string;
} | {
    kind: 'pivots';
    readonly?: boolean;
} | {
    kind: 'htmlTemplate';
    element: HTMLElement;
    titleKey: string;
} | {
    kind: 'custom';
    titleKey: string;
    element: HTMLElement;
};
//# sourceMappingURL=properties.d.ts.map