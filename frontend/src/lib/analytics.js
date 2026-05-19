// Google Analytics GA4 — helper for form conversion tracking.
// Fires a `form_submission` event with the form_type as a parameter,
// so each of the 5 forms (devis, rdv, contact, b2b, rachat) can be
// distinguished in GA4 reports / conversions.

export const trackFormSubmission = (formType, extra = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'form_submission', {
        form_type: formType,
        ...extra,
      });
    }
  } catch {
    // never break the UX if GA isn't loaded (e.g. ad-blockers)
  }
};
