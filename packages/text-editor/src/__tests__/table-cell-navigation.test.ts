import {
  isCollapsedRangeAtCellContentEnd,
  isCollapsedRangeAtCellContentStart,
  navigateTableCellDOM,
} from '../blocks/table-cell-navigation';

describe('table-cell-navigation boundaries', () => {
  function cellInnerWithHeading(text: string): HTMLElement {
    const inner = document.createElement('div');
    inner.className = 'idea-table-cell__inner';
    const block = document.createElement('div');
    block.setAttribute('data-block-id', 'blk-h');
    const span = document.createElement('span');
    span.setAttribute('data-run-id', 'r1');
    span.appendChild(document.createTextNode(text));
    block.appendChild(span);
    inner.appendChild(block);
    return inner;
  }

  it('treats caret after last child of block as end (heading-style DOM)', () => {
    const inner = cellInnerWithHeading('Hi');
    const block = inner.querySelector('[data-block-id]') as HTMLElement;
    const r = document.createRange();
    r.setStart(block, block.childNodes.length);
    r.collapse(true);
    expect(isCollapsedRangeAtCellContentEnd(inner, r)).toBe(true);
  });

  it('treats caret at end of last text node as end', () => {
    const inner = cellInnerWithHeading('Hi');
    const text = inner.querySelector('span')!.firstChild as Text;
    const r = document.createRange();
    r.setStart(text, text.length);
    r.collapse(true);
    expect(isCollapsedRangeAtCellContentEnd(inner, r)).toBe(true);
  });

  it('does not treat mid-text as end', () => {
    const inner = cellInnerWithHeading('Hi');
    const text = inner.querySelector('span')!.firstChild as Text;
    const r = document.createRange();
    r.setStart(text, 1);
    r.collapse(true);
    expect(isCollapsedRangeAtCellContentEnd(inner, r)).toBe(false);
  });

  it('treats caret at start of first text as cell start', () => {
    const inner = cellInnerWithHeading('Hi');
    const text = inner.querySelector('span')!.firstChild as Text;
    const r = document.createRange();
    r.setStart(text, 0);
    r.collapse(true);
    expect(isCollapsedRangeAtCellContentStart(inner, r)).toBe(true);
  });
});

describe('navigateTableCellDOM', () => {
  function twoCellTable(): { wrapper: HTMLElement; cellLeftId: string; cellRightId: string } {
    const wrapper = document.createElement('div');
    wrapper.className = 'idea-block idea-block--table';

    const cellLeft = document.createElement('div');
    cellLeft.setAttribute('data-cell-id', 'cell-left');
    const innerL = document.createElement('div');
    innerL.className = 'idea-table-cell__inner';
    const blockL = document.createElement('div');
    blockL.setAttribute('data-block-id', 'blk-l');
    const spanL = document.createElement('span');
    spanL.appendChild(document.createTextNode('Hello'));
    blockL.appendChild(spanL);
    innerL.appendChild(blockL);
    cellLeft.appendChild(innerL);

    const cellRight = document.createElement('div');
    cellRight.setAttribute('data-cell-id', 'cell-right');
    const innerR = document.createElement('div');
    innerR.className = 'idea-table-cell__inner';
    const blockR = document.createElement('div');
    blockR.setAttribute('data-block-id', 'blk-r');
    innerR.appendChild(blockR);
    cellRight.appendChild(innerR);

    wrapper.appendChild(cellLeft);
    wrapper.appendChild(cellRight);
    document.body.appendChild(wrapper);

    return { wrapper, cellLeftId: 'cell-left', cellRightId: 'cell-right' };
  }

  it('moves prev into last block at end of text', () => {
    const { wrapper, cellLeftId, cellRightId } = twoCellTable();
    navigateTableCellDOM(wrapper, cellRightId, 'prev');

    const sel = window.getSelection()!;
    expect(sel.rangeCount).toBe(1);
    const text = wrapper.querySelector('[data-cell-id="cell-left"] span')!.firstChild as Text;
    expect(sel.anchorNode).toBe(text);
    expect(sel.anchorOffset).toBe(5); // 'Hello'.length
  });
});
