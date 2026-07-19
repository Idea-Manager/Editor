import type { I18nService } from '@core/i18n/i18n';
import type { GraphicContext } from '../engine/graphic-context';
import type { SelectionEntry } from '../engine/selection-manager';
export interface GroupPropertiesWindowConfig {
    i18n: I18nService;
    ctx: GraphicContext;
    hostSelector: string;
    selection: SelectionEntry[];
    onClose?: () => void;
}
export declare class GroupPropertiesWindow {
    private readonly host;
    private readonly config;
    private floatingWindow;
    private currentSelection;
    private lockCheckbox;
    private groupCheckbox;
    private nameInput;
    private createBtn;
    private accordion;
    constructor(host: HTMLElement, config: GroupPropertiesWindowConfig);
    setSelection(entries: SelectionEntry[]): void;
    destroy(): void;
    private _build;
    private _titleText;
    private _updateTitle;
    private _updateCheckboxes;
    private _applyTriState;
    private _buildBody;
    private _buildCreateBlockPanel;
    private _calcInitialPosition;
}
//# sourceMappingURL=group-properties-window.d.ts.map