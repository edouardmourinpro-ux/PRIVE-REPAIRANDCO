import { useState, useEffect } from 'react';
import { Phone, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { REFUS_REASON_OPTIONS } from '../../data/lostReasons';

const Chip = ({ children, onClick, testId, variant = 'default' }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border transition-colors text-left ${
      variant === 'danger'
        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
        : 'border-[#E8F5EE] bg-white text-[#1A1A2E] hover:bg-[#E8F5EE]'
    }`}
  >
    {children}
  </button>
);

// Panneau "Journal d'appel" — 1 à 2 clics maximum, sans texte obligatoire.
// Résultat immédiatement envoyé au serveur dès le choix final (feuille).
export const CallLogPanel = ({ open, onClose, itemId, phone, onSubmit }) => {
  const [step, setStep] = useState('root');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setStep('root'); setNote(''); setShowNote(false); setCustomDate(''); setSubmitting(false); }
  }, [open]);

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      await onSubmit({ ...payload, note: note.trim() || undefined });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm" data-testid={`call-log-dialog-${itemId}`}>
        <DialogHeader>
          <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
            <Phone size={16} className="text-[#1A5C3A]" /> Journal d'appel
          </DialogTitle>
          <DialogDescription>
            À composer sur le téléphone du magasin.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-3 bg-[#E8F5EE] rounded-xl">
          <p className="text-2xl font-bold text-[#1A5C3A] tracking-wide select-all" data-testid={`call-panel-phone-${itemId}`}>
            {phone || 'Numéro non renseigné'}
          </p>
        </div>

        <div className="space-y-2 mt-2">
          {step !== 'root' && (
            <button onClick={() => setStep('root')} className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 hover:text-[#1A5C3A] mb-1" data-testid={`call-back-${itemId}`}>
              <ChevronLeft size={14} /> Retour
            </button>
          )}

          {step === 'root' && (
            <div className="grid gap-2">
              <Chip onClick={() => setStep('joint')} testId={`call-outcome-joint-${itemId}`}>✅ Joint</Chip>
              <Chip onClick={() => setStep('pas_de_reponse')} testId={`call-outcome-no-answer-${itemId}`}>📵 Pas de réponse</Chip>
              <Chip onClick={() => submit({ outcome: 'numero_invalide' })} testId={`call-outcome-invalid-${itemId}`} variant="danger">⚠️ Numéro invalide</Chip>
            </div>
          )}

          {step === 'joint' && (
            <div className="grid gap-2">
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'rdv_pris' })} testId={`call-detail-rdv-pris-${itemId}`}>RDV pris</Chip>
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'vient_magasin' })} testId={`call-detail-vient-magasin-${itemId}`}>Vient en magasin</Chip>
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'devis_accepte' })} testId={`call-detail-devis-accepte-${itemId}`}>Devis accepté</Chip>
              <Chip onClick={() => setStep('rappeler')} testId={`call-detail-rappeler-${itemId}`}>À rappeler</Chip>
              <Chip onClick={() => setStep('refus')} testId={`call-detail-refus-${itemId}`} variant="danger">Refus</Chip>
            </div>
          )}

          {step === 'rappeler' && (
            <div className="grid gap-2">
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'rappeler', callback_choice: '1h' })} testId={`callback-1h-${itemId}`}>Dans 1 h</Chip>
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'rappeler', callback_choice: '18h' })} testId={`callback-18h-${itemId}`}>Ce soir 18h</Chip>
              <Chip onClick={() => submit({ outcome: 'joint', detail: 'rappeler', callback_choice: 'demain_10h' })} testId={`callback-demain-${itemId}`}>Demain 10h</Chip>
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px]"
                  data-testid={`callback-custom-input-${itemId}`}
                />
                <Button
                  onClick={() => customDate && submit({ outcome: 'joint', detail: 'rappeler', callback_choice: 'custom', callback_at: new Date(customDate).toISOString() })}
                  disabled={!customDate || submitting}
                  className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full min-h-[44px]"
                  data-testid={`callback-custom-${itemId}`}
                >
                  Valider
                </Button>
              </div>
            </div>
          )}

          {step === 'refus' && (
            <div className="grid gap-2">
              {REFUS_REASON_OPTIONS.map(r => (
                <Chip key={r.value} onClick={() => submit({ outcome: 'joint', detail: 'refus', refus_reason: r.value })} testId={`refus-reason-${r.value}-${itemId}`} variant="danger">
                  {r.label}
                </Chip>
              ))}
            </div>
          )}

          {step === 'pas_de_reponse' && (
            <div>
              <p className="text-xs text-[#1A1A2E]/70 mb-2">Message laissé ?</p>
              <div className="grid grid-cols-2 gap-2">
                <Chip onClick={() => submit({ outcome: 'pas_de_reponse', message_laisse: true })} testId={`message-laisse-oui-${itemId}`}>Oui</Chip>
                <Chip onClick={() => submit({ outcome: 'pas_de_reponse', message_laisse: false })} testId={`message-laisse-non-${itemId}`}>Non</Chip>
              </div>
            </div>
          )}

          <div className="mt-2">
            {!showNote ? (
              <button onClick={() => setShowNote(true)} className="text-xs text-[#1A5C3A] underline" data-testid={`call-note-toggle-${itemId}`}>
                + Ajouter une note (facultatif)
              </button>
            ) : (
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Note facultative..."
                className="w-full mt-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm focus:outline-none focus:border-[#2ECC71] resize-none"
                data-testid={`call-note-input-${itemId}`}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
