import type { BlockNode, DocumentNode, TableData } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import './status-bar.scss';

export class StatusBar {
  readonly element: HTMLElement;
  private charCountEl!: HTMLSpanElement;
  private blockCountEl!: HTMLSpanElement;
  private readonly disposers: (() => void)[] = [];

  constructor(
    private doc: DocumentNode,
    private eventBus: EventBus,
    private readonly i18n: I18nService,
  ) {
    this.element = document.createElement('div');
    this.element.classList.add('status-bar');
    this.build();
    this.listen();
    this.update();
  }

  destroy(): void {
    this.disposers.forEach(fn => fn());
    this.disposers.length = 0;
  }

  setDocument(doc: DocumentNode): void {
    this.doc = doc;
    this.update();
  }

  private build(): void {
    this.charCountEl = document.createElement('span');
    this.blockCountEl = document.createElement('span');
    this.element.appendChild(this.charCountEl);
    this.element.appendChild(this.blockCountEl);
  }

  private listen(): void {
    const onUpdate = () => this.update();
    this.disposers.push(this.eventBus.on('doc:change', onUpdate));
    this.disposers.push(this.eventBus.on('history:undo', onUpdate));
    this.disposers.push(this.eventBus.on('history:redo', onUpdate));
  }

  private update(): void {
    let totalChars = 0;
    for (const block of this.doc.children) {
      totalChars += countCharactersInBlock(block);
    }

    const charKey = totalChars !== 1 ? 'status.characterPlural' : 'status.characterSingular';
    this.charCountEl.textContent = this.i18n.t(charKey, { count: totalChars });

    const blockCount = this.doc.children.length;
    const blockKey = blockCount !== 1 ? 'status.blockPlural' : 'status.blockSingular';
    this.blockCountEl.textContent = this.i18n.t(blockKey, { count: blockCount });
  }
}

function countCharactersInBlock(block: BlockNode): number {
  if (block.type === 'table') {
    const data = block.data as TableData;
    let n = 0;
    for (const row of data.rows) {
      for (const cell of row.cells) {
        if (cell.absorbed) continue;
        for (const b of cell.blocks) {
          n += countCharactersInBlock(b);
        }
      }
    }
    return n;
  }

  let n = 0;
  for (const run of block.children ?? []) {
    n += (run.data?.text ?? '').length;
  }
  return n;
}
