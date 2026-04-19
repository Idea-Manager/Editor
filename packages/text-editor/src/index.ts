export { TextEditor } from './engine/text-editor';
export type { TextEditorOptions } from './engine/text-editor';
export type { EditorContext } from './engine/editor-context';
export type { RenderContext } from './engine/render-context';

export { SelectionManager } from './engine/selection-manager';
export { SelectionSync } from './engine/selection-sync';

export type { BlockDefinition } from './blocks/block-definition';
export { BlockRegistry } from './blocks/block-registry';
export { ParagraphBlock } from './blocks/paragraph-block';
export { HeadingBlock } from './blocks/heading-block';
export { ListItemBlock } from './blocks/list-item-block';
export { TableBlock } from './blocks/table-block';
export { EmbedBlock } from './blocks/embed-block';

export { BlockRenderer } from './renderer/block-renderer';

export { renderInline } from './inline/inline-renderer';
export { InlineMarkManager } from './inline/inline-mark-manager';
export { ToggleMarkCommand } from './inline/toggle-mark-command';

export { IntentClassifier } from './engine/intent-classifier';
export type { EditIntent } from './engine/intent-classifier';
export { InputInterceptor } from './engine/input-interceptor';

export { InsertTextCommand } from './engine/commands/insert-text-command';
export { DeleteCharCommand } from './engine/commands/delete-char-command';
export { SplitBlockCommand } from './engine/commands/split-block-command';
export { MergeBlocksCommand } from './engine/commands/merge-blocks-command';
export { DeleteSelectionCommand } from './engine/commands/delete-selection-command';
export { PasteCommand } from './engine/commands/paste-command';
export { ChangeBlockTypeCommand } from './engine/commands/change-block-type-command';
export { IndentListCommand } from './engine/commands/indent-list-command';
export { OutdentListCommand } from './engine/commands/outdent-list-command';
export { SetAlignCommand } from './engine/commands/set-align-command';
export { InsertRowCommand } from './engine/commands/insert-row-command';
export { DeleteRowCommand } from './engine/commands/delete-row-command';
export { InsertColumnCommand } from './engine/commands/insert-column-command';
export { DeleteColumnCommand } from './engine/commands/delete-column-command';
export { MergeCellsCommand } from './engine/commands/merge-cells-command';
export { SplitCellCommand } from './engine/commands/split-cell-command';
export { ToggleCellBorderCommand } from './engine/commands/toggle-cell-border-command';
export { SetEmbedUrlCommand } from './engine/commands/set-embed-url-command';
export { InsertBlockCommand } from './engine/commands/insert-block-command';
export { MoveBlockCommand } from './engine/commands/move-block-command';
export { SetCellBackgroundCommand } from './engine/commands/set-cell-background-command';

export { ClipboardHandler } from './engine/clipboard-handler';

export { SlashPalette } from './toolbar/slash-palette';
export { FloatingToolbar } from './toolbar/floating-toolbar';
export { TableContextMenu } from './toolbar/table-context-menu';
export { BlockGutter } from './toolbar/block-gutter';
export { BlockTypeMenu } from './toolbar/block-type-menu';
export { TableSizePicker } from './toolbar/table-size-picker';
