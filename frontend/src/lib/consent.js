// Cookie consent manager — CNIL compliant, Google Consent Mode v2.
//
// GA4 is loaded STATICALLY in public/index.html with all consent categories
// denied by default. This file only flips the switches when the user makes a
// choice in the cookie banner. As long as consent is denied, GA4 stores no
// cookies and sends no /g/collect hits (Google's official spec).

const STORAGE_KEY = 'rc-cookie-consent';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// Custom event used by the UI to know when to re-open the preferences modal.
export const OPEN_COOKIE_PREFS_EVENT = 'rc:open-cookie-prefs';

const defaultPreferences = () => ({
  necessary: true, // always on, never user-editable
  analytics: false,
});

export const readConsent = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      preferences: { ...defaultPreferences(), ...(parsed.preferences || {}) },
      decidedAt: parsed.decidedAt || null,
      expiresAt: parsed.expiresAt || null,
    };
  } catch {
    return null;
  }
};

export const saveConsent = (preferences) => {
  const now = Date.now();
  const payload = {
    preferences: { ...defaultPreferences(), ...preferences, necessary: true },
    decidedAt: now,
    expiresAt: now + SIX_MONTHS_MS,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors (private mode etc.)
  }
  applyConsent(payload.preferences);
  return payload;
};

export const acceptAll = () => saveConsent({ analytics: true });
export const rejectAll = () => saveConsent({ analytics: false });

// Re-open the preferences modal from anywhere (footer link).
export const openPreferences = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_COOKIE_PREFS_EVENT));
  }
};

const removeGaCookies = () => {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split(';');
  cookies.forEach((c) => {
    const eq = c.indexOf('=');
    const name = (eq > -1 ? c.substr(0, eq) : c).trim();
    if (name.startsWith('_ga') || name === '_gid') {
      const domains = [window.location.hostname, `.${window.location.hostname}`];
      domains.forEach((d) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      });
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
};

// Flip Google Consent Mode v2 signals based on the user's saved preferences.
// The gtag() function is bootstrapped in public/index.html, so it exists even
// before the analytics library finishes loading (calls are queued in
// dataLayer and honored once gtag.js is ready).
export const applyConsent = (preferences) => {
  if (!preferences || typeof window === 'undefined') return;
  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;

  if (preferences.analytics) {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      // Ads categories stay denied — we only collect audience measurement.
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  } else {
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    removeGaCookies();
  }
};

// Called once at app boot: re-apply any existing consent so gtag knows the
// state after a hard refresh.
export const initConsent = () => {
  const existing = readConsent();
  if (existing) applyConsent(existing.preferences);
};
