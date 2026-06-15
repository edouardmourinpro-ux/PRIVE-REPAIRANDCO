import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Cookie, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import {
  readConsent,
  acceptAll,
  rejectAll,
  saveConsent,
  OPEN_COOKIE_PREFS_EVENT,
  initConsent,
} from '../../lib/consent';

const CATEGORY_DEFAULTS = { necessary: true, analytics: false };

export const CookieBanner = () => {
  // 'hidden' | 'banner' | 'customize'
  const [view, setView] = useState('hidden');
  const [prefs, setPrefs] = useState(
    () => readConsent()?.preferences || CATEGORY_DEFAULTS
  );

  // On first mount, re-apply existing consent (if any). Show banner if none.
  useEffect(() => {
    initConsent();
    const existing = readConsent();
    if (!existing) {
      // Slight delay to avoid layout jank on first paint.
      const t = setTimeout(() => setView('banner'), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  // Footer "Gérer mes cookies" link dispatches this event.
  useEffect(() => {
    const handler = () => {
      const existing = readConsent();
      if (existing) setPrefs(existing.preferences);
      setView('customize');
    };
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, handler);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, handler);
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    setView('hidden');
  }, []);

  const handleRejectAll = useCallback(() => {
    rejectAll();
    setView('hidden');
  }, []);

  const handleSavePrefs = useCallback(() => {
    saveConsent(prefs);
    setView('hidden');
  }, [prefs]);

  if (view === 'hidden') return null;

  // ----- "Customize" modal -----
  if (view === 'customize') {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#1A1A2E]/60 backdrop-blur-sm p-0 sm:p-4"
        data-testid="cookie-prefs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
      >
        <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 sm:px-8 pt-6 pb-4 border-b border-[#1A5C3A]/10">
            <div className="flex items-start gap-3">
              <div className="bg-[#E8F5EE] rounded-full p-2 mt-1 flex-shrink-0">
                <Cookie size={20} className="text-[#1A5C3A]" />
              </div>
              <div>
                <h2
                  id="cookie-prefs-title"
                  className="text-xl sm:text-2xl font-bold text-[#1A5C3A] leading-tight"
                >
                  Préférences cookies
                </h2>
                <p className="text-sm text-[#1A1A2E]/70 mt-1">
                  Choisissez les catégories que vous souhaitez activer.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('banner')}
              className="text-[#1A1A2E]/50 hover:text-[#1A1A2E] transition p-1 -mt-1"
              aria-label="Fermer"
              data-testid="cookie-prefs-close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 sm:px-8 py-5 space-y-4 flex-1">
            {/* Necessary */}
            <div className="border border-[#1A5C3A]/15 rounded-xl p-4 bg-[#E8F5EE]/40">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <ShieldCheck size={20} className="text-[#1A5C3A] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-[#1A1A2E]">Strictement nécessaires</h3>
                    <p className="text-sm text-[#1A1A2E]/70 mt-1 leading-relaxed">
                      Indispensables au fonctionnement du site (session, sécurité, mémorisation
                      de vos préférences cookies). Ils ne peuvent pas être désactivés.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#1A5C3A] bg-white border border-[#1A5C3A]/20 px-2.5 py-1 rounded-full flex-shrink-0">
                  Toujours actifs
                </span>
              </div>
            </div>

            {/* Analytics */}
            <div className="border border-[#1A5C3A]/15 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <BarChart3 size={20} className="text-[#1A5C3A] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-[#1A1A2E]">Mesure d&apos;audience</h3>
                    <p className="text-sm text-[#1A1A2E]/70 mt-1 leading-relaxed">
                      Cookies Google Analytics (GA4) qui nous aident à comprendre la fréquentation
                      du site et à l&apos;améliorer. Aucun script GA n&apos;est chargé sans votre accord.
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={!!prefs.analytics}
                  onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  testid="cookie-toggle-analytics"
                  label="Activer la mesure d'audience"
                />
              </div>
            </div>

            <p className="text-xs text-[#1A1A2E]/60 leading-relaxed pt-2">
              Votre choix est conservé pendant 6 mois. Vous pouvez le modifier à tout moment via
              le lien « Gérer mes cookies » en bas de page. En savoir plus :{' '}
              <Link
                to="/politique-cookies"
                className="text-[#1A5C3A] underline hover:text-[#2ECC71]"
                onClick={() => setView('hidden')}
              >
                Politique de gestion des cookies
              </Link>
              .
            </p>
          </div>

          {/* Footer actions */}
          <div className="px-5 sm:px-8 py-4 border-t border-[#1A5C3A]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAFCFB]">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                data-testid="cookie-prefs-reject-all"
                variant="outline"
                onClick={handleRejectAll}
                className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-5"
              >
                Tout refuser
              </Button>
              <Button
                data-testid="cookie-prefs-accept-all"
                variant="outline"
                onClick={handleAcceptAll}
                className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-5"
              >
                Tout accepter
              </Button>
            </div>
            <Button
              data-testid="cookie-prefs-save"
              onClick={handleSavePrefs}
              className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-6 w-full sm:w-auto"
            >
              Enregistrer mes choix
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----- First-visit banner -----
  return (
    <div
      data-testid="cookie-banner"
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[90] p-3 sm:p-5"
    >
      <div className="max-w-5xl mx-auto bg-white border border-[#1A5C3A]/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-[#E8F5EE] rounded-full p-2 flex-shrink-0">
              <Cookie size={20} className="text-[#1A5C3A]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A5C3A] leading-tight">
                Nous respectons votre vie privée
              </h2>
              <p className="text-sm text-[#1A1A2E]/80 mt-1.5 leading-relaxed">
                Nous utilisons des cookies pour faire fonctionner ce site et, avec votre accord,
                pour mesurer son audience (Google Analytics). Aucun cookie de mesure d&apos;audience
                n&apos;est posé sans votre consentement. Consultez notre{' '}
                <Link
                  to="/politique-cookies"
                  className="text-[#1A5C3A] underline hover:text-[#2ECC71]"
                >
                  politique cookies
                </Link>
                .
              </p>
            </div>
          </div>

          {/* 3 actions, same visual hierarchy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button
              data-testid="cookie-reject-all"
              variant="outline"
              onClick={handleRejectAll}
              className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full font-semibold py-5 sm:py-5"
            >
              Tout refuser
            </Button>
            <Button
              data-testid="cookie-customize"
              variant="outline"
              onClick={() => setView('customize')}
              className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full font-semibold py-5 sm:py-5"
            >
              Personnaliser
            </Button>
            <Button
              data-testid="cookie-accept-all"
              onClick={handleAcceptAll}
              className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full font-semibold py-5 sm:py-5"
            >
              Tout accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, testid, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    data-testid={testid}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:ring-offset-2 ${
      checked ? 'bg-[#1A5C3A]' : 'bg-[#1A1A2E]/20'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-1 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);
