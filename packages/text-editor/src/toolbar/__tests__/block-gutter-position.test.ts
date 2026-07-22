import {
  blockGutterContentPosition,
  contentOffsetWithinScrollHost,
} from '../block-gutter-position';

describe('contentOffsetWithinScrollHost', () => {
  it('returns viewport delta when scroll offsets are zero', () => {
    const result = contentOffsetWithinScrollHost(
      { top: 120, left: 80 },
      { top: 100, left: 50 },
      0,
      0,
    );
    expect(result).toEqual({ top: 20, left: 30 });
  });

  it('adds scrollTop and scrollLeft for content-relative positioning', () => {
    const result = contentOffsetWithinScrollHost(
      { top: 120, left: 80 },
      { top: 100, left: 50 },
      150,
      10,
    );
    expect(result).toEqual({ top: 170, left: 40 });
  });

  it('differs from viewport-only top by exactly scrollTop', () => {
    const blockRect = { top: 180, left: 64 };
    const hostRect = { top: 100, left: 20 };
    const scrollTop = 200;

    const viewportTop = blockRect.top - hostRect.top;
    const contentTop = contentOffsetWithinScrollHost(
      blockRect,
      hostRect,
      scrollTop,
      0,
    ).top;

    expect(contentTop - viewportTop).toBe(scrollTop);
  });
});

describe('blockGutterContentPosition', () => {
  it('places gutter left of the block with configured width and gap', () => {
    const result = blockGutterContentPosition(
      { top: 120, left: 100 },
      100,
      { top: 100, left: 20 },
      0,
      0,
    );
    expect(result.top).toBe(20);
    expect(result.left).toBe(100 - 20 - 49 - 4);
  });

  it('uses list leftRef when provided separately from block rect', () => {
    const result = blockGutterContentPosition(
      { top: 120, left: 120 },
      80,
      { top: 100, left: 20 },
      50,
      0,
    );
    expect(result.top).toBe(70);
    expect(result.left).toBe(80 - 20 - 49 - 4);
  });
});
