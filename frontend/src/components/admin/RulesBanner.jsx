import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const RULES = [
  {
    title: 'Rappeler dans les 15 minutes',
    text: 'Une demande qui tombe, c\u2019est un client qui attend au comptoir. On ne fait pas attendre un client.',
  },
  {
    title: 'Jamais de prix à l\u2019écrit',
    text: 'Le prix se donne au téléphone. Ni email, ni SMS, ni WhatsApp.',
  },
  {
    title: 'Ne jamais raccrocher sans une date',
    text: 'Un RDV, une date de rappel, ou un refus avec son motif. Jamais « je vous rappelle ».',
  },
];

const HOWTO_STEPS = [
  {
    title: 'Une demande arrive : appelez dans les 15 minutes',
    text: 'Avec le téléphone du magasin. Prenez la demande tout en haut de « À appeler maintenant ».',
  },
  {
    title: 'Cliquez sur « Appel » et laissez-vous guider',
    text: 'Le numéro s\u2019affiche en grand. Après l\u2019appel, l\u2019admin pose les questions une par une.',
  },
  {
    title: 'Le client répond : donnez toujours une suite',
    text: 'Oui : le prix, puis quand il vient. Il réfléchit ou il n\u2019est pas dispo : le prix s\u2019il y en a un, puis quand on le rappelle. Non : le motif.',
  },
  {
    title: 'Pas de réponse : message vocal, email, WhatsApp',
    text: 'Les trois, à chaque fois. Les boutons ouvrent l\u2019email et le WhatsApp déjà écrits. Le client revient dans la liste 3 heures plus tard.',
  },
  {
    title: 'Le client a payé : cochez « Facturé »',
    text: 'La demande sort de votre liste et compte dans votre taux de transfo.',
  },
];

// Bandeau permanent sous l'en-tête — rappelle les 3 règles d'or de l'équipe.
// Visible sur toutes les pages/onglets de l'admin. Le "Comment faire ?"
// déplie 5 étapes ; l'état ouvert/fermé est mémorisé par navigateur.
export const RulesBanner = () => {
  const [expanded, setExpanded] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('admin_howto_expanded') === '1')
  );

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem('admin_howto_expanded', next ? '1' : '0'); } catch { /* ignore */ }
  };

  return (
    <div className="bg-[#1A1A2E] text-white" data-testid="admin-rules-banner">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <span className="flex-shrink-0 text-[#2ECC71] font-bold text-xs sm:text-sm tracking-wide" data-testid="rules-banner-label">
            LES 3 RÈGLES
          </span>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RULES.map((r, i) => (
              <div key={i} className="flex items-start gap-2" data-testid={`rules-banner-rule-${i + 1}`}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2ECC71] text-[#1A1A2E] text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm leading-tight">{r.title}</p>
                  <p className="text-[11px] text-white/60 leading-snug mt-0.5">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex-shrink-0 self-start lg:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/30 transition-colors"
            data-testid="rules-banner-howto-toggle"
          >
            Comment faire ? {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-4" data-testid="rules-banner-howto-cards">
            {HOWTO_STEPS.map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3" data-testid={`howto-card-${i + 1}`}>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1A5C3A] text-white text-[11px] font-bold mb-1.5">
                  {i + 1}
                </span>
                <p className="font-bold text-[#1A1A2E] text-xs leading-tight">{s.title}</p>
                <p className="text-[11px] text-[#1A1A2E]/60 leading-snug mt-1">{s.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
