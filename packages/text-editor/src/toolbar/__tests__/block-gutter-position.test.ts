import {
  blockGutterContentPosition,
  contentOffsetWithinScrollHost,
  overlayContentPositionNearRect,
  overlayViewportPositionNearRect,
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

describe('overlayContentPositionNearRect', () => {
  const scrollHostRect = { top: 100, bottom: 300, left: 20, width: 400 };
  const overlaySize = { width: 200, height: 120 };

  it('places overlay below anchor at scrollTop 0', () => {
    const anchorRect = { top: 140, bottom: 164, left: 80, width: 300 };
    const result = overlayContentPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
      0,
      0,
    );
    expect(result.top).toBe(164 - 100 + 4);
    expect(result.left).toBe(80 - 20);
  });

  it('includes scrollTop in content-relative below placement', () => {
    const anchorRect = { top: 140, bottom: 164, left: 80, width: 300 };
    const result = overlayContentPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
      150,
      0,
    );
    expect(result.top).toBe(164 - 100 + 150 + 4);
  });

  it('flips above anchor when overlay would extend past scrollport bottom', () => {
    const anchorRect = { top: 240, bottom: 264, left: 80, width: 300 };
    const result = overlayContentPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
      0,
      0,
    );
    expect(result.top).toBe(240 - 100 - 120 - 4);
  });

  it('clamps left within scrollport horizontal padding', () => {
    const anchorRect = { top: 140, bottom: 164, left: 10, width: 300 };
    const result = overlayContentPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
      0,
      0,
      4,
      8,
    );
    expect(result.left).toBe(8);
  });
});

describe('overlayViewportPositionNearRect', () => {
  const scrollHostRect = { top: 100, bottom: 300, left: 20, width: 400 };
  const overlaySize = { width: 200, height: 120 };

  it('places overlay below anchor when space is available', () => {
    const anchorRect = { top: 140, bottom: 164, left: 80, width: 300 };
    const result = overlayViewportPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
    );
    expect(result.top).toBe(164 + 4);
    expect(result.left).toBe(80);
  });

  it('flips above anchor when overlay would extend past scrollport bottom', () => {
    const anchorRect = { top: 240, bottom: 264, left: 80, width: 300 };
    const result = overlayViewportPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
    );
    expect(result.top).toBe(240 - 120 - 4);
    expect(result.left).toBe(80);
  });

  it('clamps near top when above placement would overflow scrollport', () => {
    const shortHost = { top: 100, bottom: 200, left: 20, width: 400 };
    const anchorRect = { top: 108, bottom: 132, left: 80, width: 300 };
    const result = overlayViewportPositionNearRect(
      anchorRect,
      overlaySize,
      shortHost,
    );
    expect(result.top).toBe(108);
  });

  it('pins to top padding when overlay is taller than visible scrollport', () => {
    const shortHost = { top: 100, bottom: 160, left: 20, width: 400 };
    const tallOverlay = { width: 200, height: 100 };
    const anchorRect = { top: 110, bottom: 134, left: 80, width: 300 };
    const result = overlayViewportPositionNearRect(
      anchorRect,
      tallOverlay,
      shortHost,
    );
    expect(result.top).toBe(108);
  });

  it('clamps left within scrollport horizontal padding', () => {
    const anchorRect = { top: 140, bottom: 164, left: 10, width: 300 };
    const result = overlayViewportPositionNearRect(
      anchorRect,
      overlaySize,
      scrollHostRect,
      4,
      8,
    );
    expect(result.left).toBe(28);
  });
});
