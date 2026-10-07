import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { STAFF_IDENTITIES } from '../../data/staffIdentities';

// "Qui êtes-vous ?" — le compte admin est partagé par toute l'équipe, donc
// l'identité de la personne qui agit est mémorisée en localStorage plutôt
// que rattachée au login. S'affiche une seule fois par navigateur, avec un
// lien "changer" toujours visible pour la mettre à jour.
export const IdentityModal = ({ open, currentIdentity, onConfirm, onClose, options }) => {
  const [selected, setSelected] = useState(currentIdentity || '');
  const list = options || STAFF_IDENTITIES;

  useEffect(() => {
    if (open) setSelected(currentIdentity || '');
  }, [open, currentIdentity]);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-sm" data-testid="identity-modal">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A2E]">Qui êtes-vous ?</DialogTitle>
          <DialogDescription>
            Le compte admin est partagé, précisez votre identité avant d'appeler ou de changer un statut.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71] min-h-[44px]"
            data-testid="identity-select"
            autoFocus
          >
            <option value="">Sélectionner...</option>
            {list.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="flex justify-end">
            <Button
              onClick={() => selected && onConfirm(selected)}
              disabled={!selected}
              className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full min-h-[44px] px-6"
              data-testid="identity-confirm-btn"
            >
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
