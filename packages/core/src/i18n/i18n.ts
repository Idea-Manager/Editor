import type { Locale, TranslationDictionary } from './types';
import { en } from './locales/en';
import { uk } from './locales/uk';

const DICTIONARIES: Record<Locale, TranslationDictionary> = { en, uk };

export class I18nService {
  readonly locale: Locale;
  private readonly dict: TranslationDictionary;
  private readonly fallback: TranslationDictionary;

  constructor(locale: Locale = 'en') {
    this.locale = locale;
    this.dict = DICTIONARIES[locale];
    this.fallback = DICTIONARIES.en;
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
