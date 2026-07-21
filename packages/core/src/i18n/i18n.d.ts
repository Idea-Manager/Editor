import type { Locale, TranslationDictionary } from './types';
/** Merges optional overrides on top of a base dictionary. Both must be flat string records. */
export declare function mergeDictionaries(base: TranslationDictionary, overrides: Partial<TranslationDictionary> | undefined): TranslationDictionary;
export declare class I18nService {
    readonly locale: Locale;
    private readonly dict;
    private readonly fallback;
    constructor(locale?: Locale, i18nOverrides?: Partial<TranslationDictionary>);
    t(key: string, params?: Record<string, string | number>): string;
}
//# sourceMappingURL=i18n.d.ts.map