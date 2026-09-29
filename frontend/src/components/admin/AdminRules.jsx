import { useState } from 'react';
import { ChevronDown, ChevronUp, Phone, ClipboardCheck, MessageCircle, CalendarClock, CheckCircle2 } from 'lucide-react';

// Les 3 règles qui ne se discutent pas, toujours visibles en haut de l'admin.
const RULES = [
  ['Rappeler dans les 15 minutes', 'Une demande qui tombe, c\'est un client qui attend au comptoir. On ne fait pas attendre un client.'],
  ['Jamais de prix à l\'écrit', 'Le prix se donne au téléphone. Ni email, ni SMS, ni WhatsApp.'],
  ['Ne jamais raccrocher sans une date', 'Un RDV, une date de rappel, ou un refus avec son motif. Jamais « je vous rappelle ».'],
];

const STEPS = [
  {
    icon: Phone,
    title: 'Une demande arrive : appelez dans les 15 minutes',
    text: 'Avec le téléphone du magasin. Prenez la demande tout en haut de « À appeler maintenant ».',
  },
  {
    icon: ClipboardCheck,
    title: 'Cliquez sur « Appel » et laissez-vous guider',
    text: 'Le numéro s\'affiche en grand. Après l\'appel, l\'admin pose les questions une par une.',
  },
  {
    icon: CalendarClock,
    title: 'Le client répond : donnez toujours une suite',
    text: 'Oui : le prix, puis quand il vient. Il réfléchit ou il n\'est pas dispo : le prix s\'il y en a un, puis quand on le rappelle. Non : le motif.',
  },
  {
    icon: MessageCircle,
    title: 'Pas de réponse : message vocal, email, WhatsApp',
    text: '2e appel, message vocal, email, WhatsApp : l\'admin pose les 4 questions. Chaque « non » demande pourquoi. Le client revient dans la liste 3 heures plus tard.',
  },
  {
    icon: CheckCircle2,
    title: 'Le client a payé : cochez « Facturé »',
    text: 'La demande sort de votre liste et compte dans votre taux de transfo.',
  },
];

export const AdminRules = () => {
  const [open, setOpen] = useState(() => { try { return !!localStorage.getItem('admin_rules_open'); } catch { return false; } });
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('admin_rules_open', next ? '1' : ''); } catch { /* ignore */ }
  };

  return (
    <div className="bg-[#1A1A2E] text-white" data-testid="admin-rules">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-4">
          <span className="hidden lg:block text-[10px] font-bold uppercase tracking-widest text-[#2ECC71] whitespace-nowrap pt-1">
            Les 3 règles
          </span>
          <div className="flex-1 grid gap-x-6 gap-y-2 sm:grid-cols-3">
            {RULES.map(([rule, sub], i) => (
              <div key={rule} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2ECC71] text-[#1A1A2E] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{rule}</span>
                  <span className="block text-[11px] text-white/60 mt-0.5">{sub}</span>
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 border border-white/25 text-xs font-medium hover:bg-white/20 transition-colors whitespace-nowrap"
            data-testid="admin-rules-toggle"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Comment faire ?
          </button>
        </div>

        {open && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" data-testid="admin-rules-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-white rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-[#1A5C3A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <s.icon size={14} className="text-[#1A5C3A] flex-shrink-0" />
                </div>
                <p className="text-xs font-semibold text-[#1A1A2E] leading-snug">{s.title}</p>
                <p className="text-[11px] text-[#1A1A2E]/60 mt-1 leading-snug">{s.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
