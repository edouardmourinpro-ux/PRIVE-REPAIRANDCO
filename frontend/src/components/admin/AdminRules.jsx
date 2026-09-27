import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Les 3 règles qui ne se discutent pas, toujours visibles en haut de l'admin.
const RULES = [
  ['Toujours au téléphone', 'jamais de prix à l\'écrit'],
  ['Rappeler tout de suite', 'un client qui attend au comptoir'],
  ['Jamais sans date', 'on sait toujours quand on se reparle'],
];

const STEPS = [
  ['Appelez dans les 15 minutes', 'avec le téléphone du magasin'],
  ['Notez l\'appel', 'bouton « Appel », même sans réponse'],
  ['Pas de réponse', 'vocal, email, WhatsApp. Il revient dans 3 h'],
  ['Il répond', 'une réponse, une date. Payé : cochez « Facturé »'],
];

export const AdminRules = () => {
  const [open, setOpen] = useState(() => { try { return !!localStorage.getItem('admin_rules_open'); } catch { return false; } });
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('admin_rules_open', next ? '1' : ''); } catch { /* ignore */ }
  };

  return (
    <div className="bg-white border-b border-[#E8F5EE]" data-testid="admin-rules">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-8 gap-y-2">
        {RULES.map(([rule, sub], i) => (
          <div key={rule} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#1A5C3A] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <span className="text-sm font-semibold text-[#1A1A2E] leading-tight">
              {rule}
              <span className="block text-[11px] font-normal text-[#1A1A2E]/50">{sub}</span>
            </span>
          </div>
        ))}
        <button
          onClick={toggle}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E8F5EE] text-xs font-medium text-[#1A5C3A] hover:bg-[#E8F5EE]"
          data-testid="admin-rules-toggle"
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Comment faire ?
        </button>
      </div>

      {open && (
        <div className="max-w-7xl mx-auto px-4 pb-3" data-testid="admin-rules-steps">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, sub], i) => (
              <div key={title} className="flex items-start gap-2 bg-[#E8F5EE]/60 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-[#1A5C3A] mt-0.5">{i + 1}.</span>
                <span className="text-xs text-[#1A1A2E] leading-snug">
                  <span className="font-semibold">{title}</span>
                  <span className="block text-[#1A1A2E]/60">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
