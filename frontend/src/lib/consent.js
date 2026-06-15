// Cookie consent manager — CNIL compliant
// - Stores user choice in localStorage with a 6-month expiry.
// - Exposes helpers to read / update consent.
// - Loads Google Analytics (GA4) ONLY after explicit consent to the
//   "analytics" category. No GA script or cookie is set before consent.

const STORAGE_KEY = 'rc-cookie-consent';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const GA_MEASUREMENT_ID = 'G-MBR90KFN90';

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
      // expired -> ask again
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

// ----- Google Analytics dynamic loader (loaded only on consent) -----

let gaScriptLoaded = false;

const loadGoogleAnalytics = () => {
  if (gaScriptLoaded) {
    // Update consent state on an already-loaded gtag.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        analytics_storage: 'granted',
      });
    }
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Bootstrap dataLayer + gtag before the script tag, exactly like Google docs.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Default consent = denied. Then update to granted for analytics only.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });
  gtag('js', new Date());
  gtag('consent', 'update', {
    ad_storage: 'denied',
    analytics_storage: 'granted',
  });
  gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  gaScriptLoaded = true;
};

const removeGaCookies = () => {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split(';');
  cookies.forEach((c) => {
    const eq = c.indexOf('=');
    const name = (eq > -1 ? c.substr(0, eq) : c).trim();
    if (name.startsWith('_ga') || name === '_gid') {
      const domains = [window.location.hostname, `.${window.location.hostname}`];
      // Try to clear the cookie on common domains.
      domains.forEach((d) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      });
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
};

export const applyConsent = (preferences) => {
  if (!preferences) return;
  if (preferences.analytics) {
    loadGoogleAnalytics();
  } else {
    // Tell any already-loaded gtag to stop storing analytics data.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
      });
    }
    removeGaCookies();
  }
};

// Initialize on page load: if user already consented, apply it immediately.
export const initConsent = () => {
  const existing = readConsent();
  if (existing) applyConsent(existing.preferences);
};
