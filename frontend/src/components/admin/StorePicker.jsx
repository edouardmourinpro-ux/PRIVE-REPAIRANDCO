import { Store, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { STORES } from '../../data/stores';

export const storeShortName = id => (STORES.find(s => s.id === id)?.name || id || '').replace('Repair&Co ', '');

// Demandé juste après la connexion : chaque magasin ne voit que ses demandes.
// « Tous les magasins » est réservé à la direction.
export const StorePicker = ({ open, canClose, onChoose, onClose }) => (
  <Dialog open={open} onOpenChange={o => { if (!o && canClose) onClose(); }}>
    <DialogContent
      className="max-w-md"
      data-testid="store-picker"
      onInteractOutside={e => { if (!canClose) e.preventDefault(); }}
      onEscapeKeyDown={e => { if (!canClose) e.preventDefault(); }}
    >
      <DialogHeader>
        <DialogTitle className="text-[#1A1A2E]">Quel magasin ?</DialogTitle>
        <DialogDescription>Vous ne verrez que les demandes de ce magasin.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {STORES.map(s => (
          <button
            key={s.id}
            onClick={() => onChoose(s.id)}
            className="flex items-center gap-2 min-h-[48px] px-3 py-2 rounded-xl border border-[#E8F5EE] bg-white text-sm font-medium text-[#1A1A2E] text-left hover:bg-[#E8F5EE] hover:border-[#1A5C3A] transition-colors"
            data-testid={`store-picker-${s.id}`}
          >
            <Store size={16} className="text-[#1A5C3A] flex-shrink-0" />
            {storeShortName(s.id)}
          </button>
        ))}
      </div>
      <button
        onClick={() => onChoose('')}
        className="mt-2 w-full flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-xl bg-[#1A5C3A] text-white text-sm font-medium hover:bg-[#2ECC71] transition-colors"
        data-testid="store-picker-all"
      >
        <Users size={16} /> Tous les magasins (direction)
      </button>
      <button
        onClick={() => onChoose('test')}
        className="mt-1 text-xs text-[#1A1A2E]/40 hover:text-[#1A5C3A] underline"
        data-testid="store-picker-test"
      >
        Magasin TEST
      </button>
    </DialogContent>
  </Dialog>
);
