import type { Locale, TranslationDictionary } from './types';
import { en } from './locales/en';
import { uk } from './locales/uk';

const DICTIONARIES: Record<Locale, TranslationDictionary> = { en, uk };

/** Merges optional overrides on top of a base dictionary. Both must be flat string records. */
export function mergeDictionaries(
  base: TranslationDictionary,
  overrides: Partial<TranslationDictionary> | undefined,
): TranslationDictionary {
  if (!overrides) return { ...base };
  const out: TranslationDictionary = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export class I18nService {
  readonly locale: Locale;
  private readonly dict: TranslationDictionary;
  private readonly fallback: TranslationDictionary;

  constructor(locale: Locale = 'en', i18nOverrides?: Partial<TranslationDictionary>) {
    this.locale = locale;
    this.fallback = DICTIONARIES.en;
    this.dict = mergeDictionaries(DICTIONARIES[locale], i18nOverrides);
  }

  t(key: string, params?: Record<string, string | number>): string {
    let value = this.dict[key] ?? this.fallback[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.split(`{${k}}`).join(String(v));
      }
    }
    return value;
  }
}
