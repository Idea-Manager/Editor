import { en } from '../locales/en';
import { uk } from '../locales/uk';

const graphicEnKeys = Object.keys(en).filter(k => k.startsWith('graphic.'));
const graphicUkKeys = Object.keys(uk).filter(k => k.startsWith('graphic.'));

describe('graphic.* locale parity', () => {
  it('en and uk have the same set of graphic.* keys', () => {
    expect(new Set(graphicEnKeys)).toEqual(new Set(graphicUkKeys));
  });

  it('en has no empty graphic.* translations', () => {
    for (const key of graphicEnKeys) {
      expect((en as Record<string, string>)[key]).toBeTruthy();
    }
  });

  it('uk has no empty graphic.* translations', () => {
    for (const key of graphicUkKeys) {
      expect((uk as Record<string, string>)[key]).toBeTruthy();
    }
  });

  const canonicalKeys = [
    'graphic.tool.selection',
    'graphic.block.rectangle',
    'graphic.props.border',
    'graphic.group.title',
    'graphic.zoom.label',
    'graphic.tool.pen',
    'graphic.frame.defaultName',
  ];

  it.each(canonicalKeys)('both locales contain canonical key "%s"', key => {
    expect(graphicEnKeys).toContain(key);
    expect(graphicUkKeys).toContain(key);
  });
});
