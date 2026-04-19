import type { TextRun, InlineMark } from '@core/model/interfaces';

const MARK_ORDER: InlineMark[] = ['bold', 'italic', 'underline', 'code'];

const MARK_TAGS: Record<InlineMark, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  code: 'code',
};

export function renderInline(runs: TextRun[]): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const run of runs) {
    const span = document.createElement('span');
    span.setAttribute('data-run-id', run.id);

    if (run.data.text === '') {
      span.appendChild(document.createTextNode('\u200B'));
      fragment.appendChild(span);
      continue;
    }

    const sortedMarks = [...run.data.marks].sort(
      (a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b),
    );

    let innermost: Node = document.createTextNode(run.data.text);

    // Wrap inside-out: last mark wraps closest to text
    for (let i = sortedMarks.length - 1; i >= 0; i--) {
      const tag = MARK_TAGS[sortedMarks[i]];
      const wrapper = document.createElement(tag);
      wrapper.appendChild(innermost);
      innermost = wrapper;
    }

    span.appendChild(innermost);
    fragment.appendChild(span);
  }

  return fragment;
}
