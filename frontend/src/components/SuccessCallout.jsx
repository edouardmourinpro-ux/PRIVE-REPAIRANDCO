import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { STORES } from '../data/stores';

const TOTAL_SECONDS = 15 * 60;

export const SuccessCallout = ({ storeId }) => {
  const store = STORES.find(s => s.id === storeId);
  const shortName = store ? store.name.replace(/^Repair&Co\s*/i, '') : null;
  const telHref = store ? `tel:+33${store.phone.replace(/\s/g, '').slice(1)}` : null;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS - 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = (secondsLeft / TOTAL_SECONDS) * 100;

  return (
    <div className="space-y-4 text-left">
      <div data-testid="success-proximity-message" className="bg-[#E8F5EE] border border-[#1A5C3A]/20 rounded-2xl p-5">
        <p className="text-[#1A5C3A] font-bold text-base mb-2">
          ✅ Votre demande a bien été transmise !
        </p>
        <p className="text-[#1A5C3A]/80 text-sm leading-relaxed mb-2">
          {store
            ? <>Un technicien de notre magasin de <span className="font-semibold text-[#1A5C3A]">{shortName}</span> vient d'en prendre connaissance.</>
            : <>Un technicien vient d'en prendre connaissance.</>}
        </p>
        <p className="text-[#1A5C3A] font-bold text-sm leading-relaxed">
          Nous vous rappelons dans moins de 15 minutes.{' '}
          <span className="font-normal text-[#1A5C3A]/60">(heures d'ouverture du magasin)</span>
        </p>
        <div data-testid="success-timer" className="mt-4 bg-white rounded-xl border border-[#1A5C3A]/10 p-4 text-center">
          <p className="text-xs font-semibold text-[#1A5C3A]/70 uppercase tracking-wide mb-1">
            Mise en relation avec votre magasin sous :
          </p>
          <p data-testid="success-timer-value" className="font-mono font-extrabold text-3xl text-[#1A5C3A] tabular-nums leading-tight mb-3">
            {mm}:{ss} <span className="text-base font-bold text-[#1A5C3A]/60">min</span>
          </p>
          <div className="h-2.5 w-full bg-[#E8F5EE] rounded-full overflow-hidden">
            <div
              data-testid="success-timer-bar"
              className="h-full bg-[#2ECC71] rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      {store && (
        <div data-testid="success-call-block" className="bg-white border-2 border-[#2ECC71] rounded-2xl p-5">
          <p className="text-[#1A1A2E] text-sm leading-relaxed mb-3">
            <span className="font-semibold">Besoin d'une réponse immédiate ?</span><br />
            Joignez directement votre technicien :
          </p>
          <a
            data-testid="success-call-phone-link"
            href={telHref}
            className="inline-flex items-center gap-2 bg-[#1A5C3A] text-white font-bold px-5 py-2.5 rounded-full hover:bg-[#2ECC71] transition-colors"
          >
            <Phone size={18} /> {store.phone}
          </a>
        </div>
      )}
    </div>
  );
};

export default SuccessCallout;
