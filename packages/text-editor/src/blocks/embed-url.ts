export interface ProviderInfo {
  name: string;
  embeddable: boolean;
  transformUrl?: (url: string) => string;
}

const PROVIDERS: { pattern: RegExp; info: ProviderInfo }[] = [
  {
    pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    info: {
      name: 'YouTube',
      embeddable: true,
      transformUrl: (url: string) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : url;
      },
    },
  },
  {
    pattern: /figma\.com\/(file|proto|design)\//,
    info: {
      name: 'Figma',
      embeddable: true,
      transformUrl: (url: string) => `https://www.figma.com/embed?embed_host=idea-editor&url=${encodeURIComponent(url)}`,
    },
  },
  {
    pattern: /miro\.com\/app\/board\//,
    info: {
      name: 'Miro',
      embeddable: true,
      transformUrl: (url: string) => url.replace('/app/board/', '/app/live-embed/'),
    },
  },
  {
    pattern: /google\.com\/maps/,
    info: {
      name: 'Google Maps',
      embeddable: true,
      transformUrl: (url: string) => {
        if (url.includes('/embed')) return url;
        return url.replace('/maps/', '/maps/embed/');
      },
    },
  },
];

export function detectProvider(url: string): ProviderInfo | null {
  for (const { pattern, info } of PROVIDERS) {
    if (pattern.test(url)) return info;
  }
  return null;
}

/** Resolves a YouTube video id from watch, short, or /embed/ URLs (editor uses a poster, not the embed player). */
export function extractYouTubeVideoId(url: string): string | null {
  const embed = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (embed) return embed[1];
  const watch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (watch) return watch[1];
  return null;
}

export function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/** Document `data` payload for an embed block after the user pastes a URL. */
export function embedDataFromUrl(url: string): Record<string, unknown> {
  const p = detectProvider(url);
  return {
    url,
    title: p?.name ?? '',
    provider: p?.name,
  };
}
