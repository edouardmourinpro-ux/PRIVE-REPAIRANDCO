import { useState } from 'react';
import { RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const CATEGORY_LABELS = { devis: 'Devis', contact: 'Contact / RDV', rachat: 'Rachat' };

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Corbeille (S32) — réservée à la direction : valide ou refuse les demandes
// de suppression faites par les équipes. Rien n'est jamais supprimé sans le
// code de sécurité (bouton "Supprimer définitivement").
export const CorbeilleTab = ({ items, loading, requireIdentity, onRestore, onHardDelete }) => {
  const [restoringId, setRestoringId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRestore = (item) => requireIdentity(async () => {
    setRestoringId(item.id);
    try {
      await onRestore(item.id, item.category);
    } finally {
      setRestoringId(null);
    }
  });

  const handleHardDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await onHardDelete(deleteTarget.id, deleteCode, deleteTarget.category);
      setDeleteTarget(null);
      setDeleteCode('');
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Code incorrect');
    }
    setDeleteLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" data-testid="corbeille-loading">
        <Loader2 className="animate-spin text-[#1A5C3A]" size={32} />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-12 text-[#1A1A2E]/50" data-testid="corbeille-empty-state">
        Aucune demande de suppression en attente.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="corbeille-tab">
      {items.map(item => {
        const dr = item.deletion_requested || {};
        return (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200"
            data-testid={`corbeille-row-${item.id}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#1A1A2E]" data-testid={`corbeille-label-${item.id}`}>
                {item.label} <span className="text-xs text-[#1A1A2E]/50 font-normal">· {CATEGORY_LABELS[item.category] || item.category} · {item.store_name}</span>
              </p>
              <p className="text-xs text-[#1A1A2E]/60 mt-1">
                Demandé par <strong>{dr.by || '—'}</strong> le {formatDate(dr.at)}
              </p>
              <p className="text-sm text-[#1A1A2E]/80 mt-1 italic" data-testid={`corbeille-reason-${item.id}`}>« {dr.reason || '—'} »</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => handleRestore(item)}
                disabled={restoringId === item.id}
                variant="outline"
                className="rounded-full text-xs border-[#E8F5EE] text-[#1A5C3A] hover:bg-[#E8F5EE]"
                data-testid={`corbeille-restore-${item.id}`}
              >
                {restoringId === item.id ? <Loader2 className="animate-spin mr-1" size={14} /> : <RotateCcw size={14} className="mr-1" />}
                Restaurer
              </Button>
              <Button
                onClick={() => { setDeleteTarget(item); setDeleteCode(''); setDeleteError(''); }}
                className="rounded-full text-xs bg-red-600 hover:bg-red-700 text-white"
                data-testid={`corbeille-hard-delete-${item.id}`}
              >
                <Trash2 size={14} className="mr-1" /> Supprimer définitivement
              </Button>
            </div>
          </div>
        );
      })}

      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) { setDeleteTarget(null); setDeleteCode(''); setDeleteError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E]">Suppression définitive</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Entrez le code de sécurité pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              type="password"
              placeholder="Code de sécurité"
              value={deleteCode}
              onChange={e => setDeleteCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && deleteCode && handleHardDeleteSubmit()}
              className="form-input"
              autoFocus
              data-testid="corbeille-delete-code-input"
            />
            {deleteError && <p className="text-red-600 text-sm" data-testid="corbeille-delete-error">{deleteError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="text-xs rounded-full">Annuler</Button>
              <Button
                onClick={handleHardDeleteSubmit}
                disabled={deleteLoading || !deleteCode}
                className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-full"
                data-testid="corbeille-delete-confirm"
              >
                {deleteLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <Trash2 size={14} className="mr-1" />}
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
