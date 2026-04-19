import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import './status-bar.scss';

export class StatusBar {
  readonly element: HTMLElement;
  private wordCountEl!: HTMLSpanElement;
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
    this.wordCountEl = document.createElement('span');
    this.blockCountEl = document.createElement('span');
    this.element.appendChild(this.wordCountEl);
    this.element.appendChild(this.blockCountEl);
  }

  private listen(): void {
    const onUpdate = () => this.update();
    this.disposers.push(this.eventBus.on('doc:change', onUpdate));
    this.disposers.push(this.eventBus.on('history:undo', onUpdate));
    this.disposers.push(this.eventBus.on('history:redo', onUpdate));
  }

  private update(): void {
    let totalWords = 0;
    for (const block of this.doc.children) {
      for (const run of block.children ?? []) {
        const text = run.data?.text ?? '';
        const words = text.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;
      }
    }

    const wordKey = totalWords !== 1 ? 'status.wordPlural' : 'status.wordSingular';
    this.wordCountEl.textContent = this.i18n.t(wordKey, { count: totalWords });

    const blockCount = this.doc.children.length;
    const blockKey = blockCount !== 1 ? 'status.blockPlural' : 'status.blockSingular';
    this.blockCountEl.textContent = this.i18n.t(blockKey, { count: blockCount });
  }
}
