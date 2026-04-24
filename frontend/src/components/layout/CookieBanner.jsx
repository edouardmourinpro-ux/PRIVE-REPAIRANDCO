import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { const c = localStorage.getItem('cookie-consent'); if (!c) { const t = setTimeout(() => setIsVisible(true), 1500); return () => clearTimeout(t); } }, []);
  const handleAccept = () => { localStorage.setItem('cookie-consent', 'accepted'); setIsVisible(false); };
  const handleDecline = () => { localStorage.setItem('cookie-consent', 'declined'); setIsVisible(false); };
  if (!isVisible) return null;
  return (
    <div data-testid="cookie-banner" className="cookie-banner" role="dialog" aria-label="Consentement aux cookies">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[#1A1A2E] text-sm leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience sur notre site. En continuant à naviguer, vous acceptez notre utilisation des cookies conformément à notre{' '}
            <a href="/rgpd" className="text-[#1A5C3A] underline hover:text-[#2ECC71]">politique de confidentialité</a>.
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button data-testid="cookie-decline" variant="outline" size="sm" onClick={handleDecline} className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full">Refuser</Button>
            <Button data-testid="cookie-accept" size="sm" onClick={handleAccept} className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full">Accepter</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
