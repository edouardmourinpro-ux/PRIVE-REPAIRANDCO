import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Store, Building2, FlaskConical } from 'lucide-react';
import { STORES } from '../../data/stores';

// « Quel magasin ? » — s'affiche à chaque connexion réussie, tant qu'aucun
// choix n'est fait. Volontairement non-fermable (pas de X, pas d'Échap, pas
// de clic en dehors) : le staff doit choisir avant de voir quoi que ce soit.
export const StoreGateModal = ({ open, onPickStore, onPickAll }) => {
  if (!open) return null;
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#1A1A2E]/80 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[60] w-[94%] max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-5 sm:p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto"
          data-testid="store-gate-modal"
        >
          <DialogPrimitive.Title className="text-xl sm:text-2xl font-bold text-[#1A1A2E] flex items-center gap-2">
            <Store size={22} className="text-[#1A5C3A] flex-shrink-0" /> Quel magasin ?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-[#1A1A2E]/60 mt-1 mb-5">
            Vous ne verrez que les demandes de ce magasin
          </DialogPrimitive.Description>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="store-gate-store-grid">
            {STORES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPickStore(s.id)}
                className="min-h-[48px] px-3 py-2.5 rounded-xl border-2 border-[#E8F5EE] bg-[#E8F5EE] text-[#1A5C3A] font-semibold text-sm hover:bg-[#2ECC71] hover:border-[#2ECC71] hover:text-white transition-colors text-center"
                data-testid={`store-gate-store-${s.id}`}
              >
                {s.name.replace('Repair&Co ', '')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onPickAll}
            className="w-full mt-4 min-h-[52px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1A5C3A] text-white font-bold text-sm hover:bg-[#1A1A2E] transition-colors"
            data-testid="store-gate-all-stores"
          >
            <Building2 size={18} /> Tous les magasins (direction)
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => onPickStore('test')}
              className="inline-flex items-center gap-1.5 text-xs text-[#1A1A2E]/40 hover:text-[#1A1A2E]/70 transition-colors"
              data-testid="store-gate-test-store"
            >
              <FlaskConical size={12} /> Magasin TEST
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
