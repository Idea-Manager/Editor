import type { I18nService } from '@core/i18n/i18n';
import { type TableSizePickerResult } from '../blocks/table-data-factory';
export type { BorderPreset, TableSizePickerResult } from '../blocks/table-data-factory';
export declare class TableSizePicker {
    private readonly host;
    private readonly i18n;
    private readonly modal;
    private hoverRow;
    private hoverCol;
    private locked;
    private lockedRow;
    private lockedCol;
    private borderPreset;
    private borderWidth;
    private sizeLabel;
    private gridContainer;
    private thicknessPreviewLine;
    private commitThicknessFromCombobox;
    constructor(host: HTMLElement, i18n: I18nService);
    isVisible(): boolean;
    show(onConfirm: (result: TableSizePickerResult) => void, onCancel: () => void): void;
    hide(): void;
    private updateThicknessPreview;
    private effectiveRow;
    private effectiveCol;
    private updateGridLockedClass;
    private buildGrid;
    private updateGridHighlight;
    private updateSizeLabel;
}
//# sourceMappingURL=table-size-picker.d.ts.map