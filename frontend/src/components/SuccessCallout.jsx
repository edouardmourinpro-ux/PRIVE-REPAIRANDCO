import React from 'react';
import { Phone } from 'lucide-react';
import { STORES } from '../data/stores';

export const SuccessCallout = ({ storeId, variant = '15min' }) => {
  const store = STORES.find(s => s.id === storeId);
  const shortName = store ? store.name.replace(/^Repair&Co\s*/i, '') : null;
  const telHref = store ? `tel:+33${store.phone.replace(/\s/g, '').slice(1)}` : null;

  return (
    <div className="space-y-4 text-left">
      <div data-testid="success-proximity-message" className="bg-[#E8F5EE] border border-[#1A5C3A]/20 rounded-2xl p-5">
        <p className="text-[#1A5C3A] font-bold text-base leading-relaxed">
          Votre demande a bien été transmise !{' '}
          {store
            ? <>Un technicien de notre magasin de {shortName} vient d'en prendre connaissance.</>
            : <>Un technicien vient d'en prendre connaissance.</>}{' '}
          {variant === '24h'
            ? <>Il vous recontactera sous 24h avec une offre de rachat.</>
            : <>Restez bien attentif à votre téléphone, nous allons vous rappeler dans moins de 15 minutes.</>}
        </p>
      </div>
      {store && (
        <div data-testid="success-call-block" className="bg-white border-2 border-[#2ECC71] rounded-2xl p-5">
          <p className="text-[#1A1A2E] text-sm leading-relaxed mb-3">
            <span className="font-semibold">Besoin d'une réponse immédiate ?</span>{' '}
            Vous pouvez également joindre directement votre technicien au numéro ci-dessous. Il se fera un plaisir de répondre à toutes vos questions.
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
