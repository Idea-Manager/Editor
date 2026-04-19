export type OS = 'mac' | 'windows' | 'linux' | 'unknown';

let cachedOS: OS | null = null;

export function detectOS(): OS {
  if (cachedOS) return cachedOS;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined'
    ? (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform
    : '';

  if (/Mac/i.test(platform)) {
    cachedOS = 'mac';
  } else if (/Win/i.test(platform)) {
    cachedOS = 'windows';
  } else if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
    cachedOS = 'linux';
  } else {
    cachedOS = 'unknown';
  }

  return cachedOS;
}

export function isMac(): boolean {
  return detectOS() === 'mac';
}
