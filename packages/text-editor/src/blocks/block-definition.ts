import type { BlockNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';

export interface PaletteEntry {
  id: string;
  labelKey: string;
  icon: string;
  dataFactory(): Record<string, unknown>;
  matchData?: Record<string, unknown>;
}

export interface BlockDefinition<TData = Record<string, unknown>> {
  type: string;
  labelKey: string;
  icon: string;
  defaultData(): TData;
  render(node: BlockNode<TData>, ctx: RenderContext): HTMLElement;
  serialize(node: BlockNode<TData>): BlockNode<TData>;
  deserialize(raw: unknown): BlockNode<TData>;
  onEnter?(node: BlockNode<TData>, ctx: EditorContext): Command | null;
  onDelete?(node: BlockNode<TData>, ctx: EditorContext): Command | null;
  paletteEntries?(): PaletteEntry[];
}
