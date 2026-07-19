export interface ProviderInfo {
    name: string;
    embeddable: boolean;
    transformUrl?: (url: string) => string;
}
export declare function detectProvider(url: string): ProviderInfo | null;
export declare function isValidUrl(str: string): boolean;
export declare function getFaviconUrl(url: string): string;
/** Document `data` payload for an embed block after the user pastes a URL. */
export declare function embedDataFromUrl(url: string): Record<string, unknown>;
//# sourceMappingURL=embed-url.d.ts.map