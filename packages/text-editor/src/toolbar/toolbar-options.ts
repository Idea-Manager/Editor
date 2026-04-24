import type { BlockType } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import type { PaletteItem } from '../blocks/block-registry';
import type { SelectionSync } from '../engine/selection-sync';
import type { SlashPaletteMode } from './slash-palette';

/** Slash palette: default excludes, optional post-filter, max list height. */
export interface SlashPaletteOptions {
  excludeTypes?: BlockType[];
  filterItems?(items: PaletteItem[]): PaletteItem[];
  maxHeightPx?: number;
}

/** Minimal surface required by {@link ../engine/input-interceptor.InputInterceptor} and gutter. */
export interface SlashPaletteLike {
  show(
    blockId: string,
    mode?: SlashPaletteMode,
    anchorRect?: DOMRect,
    excludeTypes?: BlockType[],
  ): void;
  hide(): void;
  updateFilter(char: string): void;
  destroy(): void;
  isVisible(): boolean;
}

export type SlashPaletteFactory = (
  ctx: EditorContext,
  host: HTMLElement,
  options?: SlashPaletteOptions,
) => SlashPaletteLike;

export interface FloatingToolbarSections {
  marks: boolean;
  color: boolean;
  link: boolean;
  align: boolean;
  blockConvert: boolean;
}

export interface FloatingToolbarExtraButton {
  id: string;
  icon: string;
  titleKey: string;
  isActive?(ctx: EditorContext): boolean;
  onClick(ctx: EditorContext): void;
}

export interface FloatingToolbarConfig {
  sections: FloatingToolbarSections;
  convertibleBlockTypes: BlockType[];
  extraButtons: FloatingToolbarExtraButton[];
}

export const DEFAULT_FLOATING_TOOLBAR_SECTIONS: FloatingToolbarSections = {
  marks: true,
  color: true,
  link: true,
  align: true,
  blockConvert: true,
};

export const DEFAULT_CONVERTIBLE_BLOCK_TYPES: BlockType[] = ['paragraph', 'heading', 'list_item'];

export function defaultFloatingToolbarConfig(): FloatingToolbarConfig {
  return {
    sections: { ...DEFAULT_FLOATING_TOOLBAR_SECTIONS },
    convertibleBlockTypes: [...DEFAULT_CONVERTIBLE_BLOCK_TYPES],
    extraButtons: [],
  };
}

export function mergeFloatingToolbarConfig(partial?: Partial<FloatingToolbarConfig>): FloatingToolbarConfig {
  const d = defaultFloatingToolbarConfig();
  if (!partial) return d;
  return {
    sections: { ...d.sections, ...partial.sections },
    convertibleBlockTypes: partial.convertibleBlockTypes ?? d.convertibleBlockTypes,
    extraButtons: partial.extraButtons ?? d.extraButtons,
  };
}

export interface FloatingToolbarDeps {
  ctx: EditorContext;
  host: HTMLElement;
  selectionSync?: SelectionSync;
}

export interface FloatingToolbarLike {
  destroy(): void;
  isVisible?(): boolean;
}

export type FloatingToolbarFactory = (
  deps: FloatingToolbarDeps,
  config: FloatingToolbarConfig,
) => FloatingToolbarLike;

export interface BlockGutterConfig {
  showAddButton?: boolean;
  showDragHandle?: boolean;
  showDeleteButton?: boolean;
  /** i18n key for modal body; defaults to `gutter.confirmRemoveMessage`. */
  confirmRemoveMessageKey?: string;
}

export interface ResolvedBlockGutterConfig {
  showAddButton: boolean;
  showDragHandle: boolean;
  showDeleteButton: boolean;
  confirmRemoveMessageKey?: string;
}

export function resolveBlockGutterConfig(c?: BlockGutterConfig): ResolvedBlockGutterConfig {
  return {
    showAddButton: c?.showAddButton !== false,
    showDragHandle: c?.showDragHandle !== false,
    showDeleteButton: c?.showDeleteButton !== false,
    confirmRemoveMessageKey: c?.confirmRemoveMessageKey,
  };
}

export type BlockGutterFactory = (
  ctx: EditorContext,
  host: HTMLElement,
  config: ResolvedBlockGutterConfig,
) => { destroy(): void };

export interface TableContextMenuConfig {
  showRowOperations?: boolean;
  showColumnOperations?: boolean;
  showMergeCells?: boolean;
  showCellBorders?: boolean;
  showCellBackground?: boolean;
}

export interface ResolvedTableContextMenuConfig {
  showRowOperations: boolean;
  showColumnOperations: boolean;
  showMergeCells: boolean;
  showCellBorders: boolean;
  showCellBackground: boolean;
}

export function resolveTableContextMenuConfig(c?: TableContextMenuConfig): ResolvedTableContextMenuConfig {
  return {
    showRowOperations: c?.showRowOperations !== false,
    showColumnOperations: c?.showColumnOperations !== false,
    showMergeCells: c?.showMergeCells !== false,
    showCellBorders: c?.showCellBorders !== false,
    showCellBackground: c?.showCellBackground !== false,
  };
}

export type TableContextMenuFactory = (
  ctx: EditorContext,
  host: HTMLElement,
  config: ResolvedTableContextMenuConfig,
) => { destroy(): void };

export interface LinkHoverOptions {
  /** When true, no link hover UI is created. */
  disabled?: boolean;
  factory?: (ctx: EditorContext) => { destroy(): void };
}

export interface TextEditorToolbarsOptions {
  slashPalette?: SlashPaletteOptions;
  slashPaletteFactory?: SlashPaletteFactory;
  floatingToolbar?: Partial<FloatingToolbarConfig>;
  floatingToolbarFactory?: FloatingToolbarFactory;
  blockGutter?: BlockGutterConfig;
  blockGutterFactory?: BlockGutterFactory;
  tableContextMenu?: TableContextMenuConfig;
  tableContextMenuFactory?: TableContextMenuFactory;
  linkHover?: LinkHoverOptions;
}
