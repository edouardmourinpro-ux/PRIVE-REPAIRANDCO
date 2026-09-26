import { useState } from 'react';
import { ChevronDown, ChevronUp, Phone, Mail, MessageCircle, CheckCircle2 } from 'lucide-react';

// Les règles qui ne se discutent pas, toujours visibles en haut de l'admin.
const RULES = [
  'Jamais de prix à l\'écrit',
  'Toujours avoir le client au téléphone',
  'Rappeler le plus vite possible',
  'Une demande = un client au comptoir qui attend',
  'On ne laisse jamais un client sans suite',
  'Toujours fixer une date de rappel',
  'Jamais de flou : on sait toujours la prochaine étape',
];

const STEPS = [
  {
    icon: Phone,
    title: 'Une demande arrive : appelez dans les 15 minutes',
    text: 'Avec le téléphone du magasin. Prenez la demande tout en haut de « À appeler maintenant ».',
  },
  {
    icon: CheckCircle2,
    title: 'Cliquez sur « Appel » et notez le résultat',
    text: 'Le numéro s\'affiche en grand. Après l\'appel : Joint, Pas de réponse, ou Numéro invalide.',
  },
  {
    icon: MessageCircle,
    title: 'Pas de réponse : message vocal, email, WhatsApp',
    text: 'Les trois, à chaque fois. Les boutons ouvrent l\'email et le WhatsApp déjà écrits. Le client revient dans la liste 3 heures plus tard pour un nouvel appel.',
  },
  {
    icon: Mail,
    title: 'Le client répond : donnez toujours une suite',
    text: 'Il dit oui : le prix, puis la date de son RDV. Il hésite : le prix, puis la date à laquelle vous le rappelez. Il dit non : le motif. Jamais « je vous rappellerai » sans date.',
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
    <div className="bg-[#E8F5EE] border-b border-[#CDEBDA]" data-testid="admin-rules">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#1A5C3A]">
          <span className="font-bold uppercase tracking-wide">Les règles</span>
          {RULES.map(r => (
            <span key={r} className="flex items-center gap-1">
              <span className="text-[#2ECC71]">✓</span>{r}
            </span>
          ))}
          <button
            onClick={toggle}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#CDEBDA] font-medium hover:bg-white/60"
            data-testid="admin-rules-toggle"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Comment faire ?
          </button>
        </div>

        {open && (
          <div className="mt-2 mb-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" data-testid="admin-rules-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-white rounded-xl border border-[#CDEBDA] p-3">
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
