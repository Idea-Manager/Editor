import { readFileSync } from 'fs';
import { join } from 'path';

describe('GraphicEditor default style bundles', () => {
  it('includes shared accordion styles used by the left panel', () => {
    const source = readFileSync(join(__dirname, '../graphic-editor.ts'), 'utf8');
    expect(source).toMatch(/accordion\.scss\?inline/);
    expect(source).toMatch(/accordionStyles/);
  });

  it('includes shared component styles used by property windows', () => {
    const source = readFileSync(join(__dirname, '../graphic-editor.ts'), 'utf8');
    expect(source).toMatch(/floating-window\.scss\?inline/);
    expect(source).toMatch(/color-picker\.scss\?inline/);
    expect(source).toMatch(/dropdown-combobox\.scss\?inline/);
    expect(source).toMatch(/toast\.scss\?inline/);
  });
});
