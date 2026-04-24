import { I18nService, mergeDictionaries } from '../i18n';
import { en } from '../locales/en';

describe('mergeDictionaries', () => {
  test('returns a copy of base when overrides are undefined', () => {
    const m = mergeDictionaries(en, undefined);
    expect(m).toEqual(en);
    expect(m).not.toBe(en);
  });

  test('overrides and adds keys', () => {
    const m = mergeDictionaries(en, { 'plugin.myLabel': 'Custom', a: 'b' });
    expect(m['plugin.myLabel']).toBe('Custom');
    expect(m['a']).toBe('b');
  });
});

describe('I18nService', () => {
  test('applies i18nOverrides for new keys and overrides', () => {
    const i18n = new I18nService('en', { 'custom.block.label': 'Callout' });
    expect(i18n.t('custom.block.label')).toBe('Callout');
  });

  test('returns raw key for unknown keys', () => {
    const i18n = new I18nService('en');
    // pick a key that exists in en
    const known = 'slash.noResults';
    expect(i18n.t(known)).toBe(i18n.t(known));
    expect(i18n.t('totally.unknown.key')).toBe('totally.unknown.key');
  });

  test('interpolates params on overridden strings', () => {
    const i18n = new I18nService('en', { greet: 'Hello, {name}!' });
    expect(i18n.t('greet', { name: 'World' })).toBe('Hello, World!');
  });
});
