import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
    // TODO: Initialize analytics here when GA4 ID is configured
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      data-testid="cookie-banner"
      className="cookie-banner"
      role="dialog"
      aria-label="Consentement aux cookies"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[#1A1A2E] text-sm leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
              En continuant à naviguer, vous acceptez notre utilisation des cookies conformément à notre{' '}
              <a href="/rgpd" className="text-[#005157] underline hover:text-[#005157]/70">
                politique de confidentialité
              </a>.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              data-testid="cookie-decline"
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full"
            >
              Refuser
            </Button>
            <Button
              data-testid="cookie-accept"
              size="sm"
              onClick={handleAccept}
              className="bg-[#005157] text-white hover:bg-[#86cbd4] rounded-full"
            >
              Accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
