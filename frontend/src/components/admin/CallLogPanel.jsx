import { useState, useEffect } from 'react';
import { Phone, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { REFUS_REASON_OPTIONS } from '../../data/lostReasons';
import { APPT_SLOT_SHORT } from '../../lib/statusDisplay';
import { getRelanceMailtoUrl, getRelanceWaUrl, isFrenchMobilePhone } from '../../lib/relanceText';

const Chip = ({ children, onClick, testId, variant = 'default', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
      variant === 'danger'
        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
        : 'border-[#E8F5EE] bg-white text-[#1A1A2E] hover:bg-[#E8F5EE]'
    }`}
  >
    {children}
  </button>
);

const PDR_QUESTIONS = [
  { field: 'rappel_2e', reasonField: 'rappel_2e_raison', question: 'Vous avez rappelé une deuxième fois ?', constat: "Vous n'avez pas rappelé une 2ème fois :" },
  { field: 'message_laisse', reasonField: 'message_laisse_raison', question: 'Message vocal laissé ?', constat: "Vous n'avez pas laissé de message vocal :" },
  { field: 'mail_envoye', reasonField: 'mail_envoye_raison', question: 'Email envoyé au client ?', constat: "Vous n'avez pas envoyé de mail au client :", action: 'email' },
  { field: 'message_envoye', reasonField: 'message_envoye_raison', question: 'WhatsApp envoyé au client ?', constat: "Vous n'avez pas envoyé de WhatsApp au client :", action: 'whatsapp' },
];

// Panneau "Journal d'appel" — numéro non cliquable (on appelle avec le
// téléphone du magasin), parcours guidé par le résultat de l'appel.
export const CallLogPanel = ({ open, onClose, item, onSubmit, onSaveQuotedPrice }) => {
  const itemId = item?.id;
  const phone = item?.phone;

  const [step, setStep] = useState('root');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [customCallback, setCustomCallback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [priceDraft, setPriceDraft] = useState('');
  const [pendingPrice, setPendingPrice] = useState('');
  const [apptDate, setApptDate] = useState('');

  const [pdrIndex, setPdrIndex] = useState(0);
  const [pdrAnswers, setPdrAnswers] = useState({});
  const [pdrAwaitingReason, setPdrAwaitingReason] = useState(false);
  const [pdrReason, setPdrReason] = useState('');

  useEffect(() => {
    if (open) {
      setStep('root'); setNote(''); setShowNote(false); setCustomCallback(''); setSubmitting(false);
      setPriceDraft(''); setPendingPrice(''); setApptDate('');
      setPdrIndex(0); setPdrAnswers({}); setPdrAwaitingReason(false); setPdrReason('');
    }
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

  const finalizeRdv = async (slot) => {
    if (pendingPrice) { try { await onSaveQuotedPrice(itemId, pendingPrice); } catch { /* ignore */ } }
    await submit({ outcome: 'joint', detail: 'rdv_pris', appt_date: apptDate, appt_slot: slot });
  };
  const finalizePassage = async () => {
    if (pendingPrice) { try { await onSaveQuotedPrice(itemId, pendingPrice); } catch { /* ignore */ } }
    await submit({ outcome: 'joint', detail: 'devis_accepte', appt_date: apptDate });
  };
  const finalizeReflechit = (choice, at) => submit({
    outcome: 'joint', detail: 'reflechit', callback_choice: choice, callback_at: at,
    quoted_price: pendingPrice || undefined,
  });

  const handlePdrAnswer = (yes) => {
    const q = PDR_QUESTIONS[pdrIndex];
    const next = { ...pdrAnswers, [q.field]: yes, ...(yes ? {} : { [q.reasonField]: pdrReason.trim() }) };
    setPdrAnswers(next);
    setPdrAwaitingReason(false);
    setPdrReason('');
    if (pdrIndex === PDR_QUESTIONS.length - 1) {
      submit({ outcome: 'pas_de_reponse', ...next });
    } else {
      setPdrIndex(pdrIndex + 1);
    }
  };

  const callbackChips = (onPick, prefix) => (
    <div className="grid gap-2">
      <Chip onClick={() => onPick('1h')} testId={`${prefix}-1h-${itemId}`}>Dans 1 h</Chip>
      <Chip onClick={() => onPick('18h')} testId={`${prefix}-18h-${itemId}`}>Ce soir 18h</Chip>
      <Chip onClick={() => onPick('demain_10h')} testId={`${prefix}-demain-${itemId}`}>Demain 10h</Chip>
      <div className="flex gap-2 items-center">
        <input
          type="datetime-local"
          value={customCallback}
          onChange={e => setCustomCallback(e.target.value)}
          className="flex-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px]"
          data-testid={`${prefix}-custom-input-${itemId}`}
        />
        <Button
          onClick={() => customCallback && onPick('custom', new Date(customCallback).toISOString())}
          disabled={!customCallback || submitting}
          className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full min-h-[44px]"
          data-testid={`${prefix}-custom-${itemId}`}
        >
          Valider
        </Button>
      </div>
    </div>
  );

  const creationSms = (item?.client_sms || []).find(s => s.type === 'creation' && s.status === 'sent');
  let smsLine = null;
  if (creationSms) {
    const hhmm = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(creationSms.at));
    smsLine = `Le client a reçu un SMS à ${hhmm} : le magasin le rappelle. Nous nous sommes engagés.`;
  } else if (phone && !isFrenchMobilePhone(phone)) {
    smsLine = 'Pas de SMS envoyé : numéro fixe.';
  }

  const canGoBack = step !== 'root';
  const goBack = () => {
    if (['devis_price', 'reflechit_price', 'rappeler_when', 'refus'].includes(step)) setStep('joint');
    else if (step === 'devis_when') setStep('devis_price');
    else if (step === 'reflechit_when') setStep('reflechit_price');
    else if (step === 'pas_de_reponse') {
      if (pdrAwaitingReason) { setPdrAwaitingReason(false); setPdrReason(''); }
      else if (pdrIndex > 0) setPdrIndex(pdrIndex - 1);
      else setStep('root');
    }
    else setStep('root');
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm" data-testid={`call-log-dialog-${itemId}`}>
        <DialogHeader>
          <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
            <Phone size={16} className="text-[#1A5C3A]" /> Journal d'appel
          </DialogTitle>
          <DialogDescription>À composer sur le téléphone du magasin.</DialogDescription>
        </DialogHeader>

        <div className="text-center py-3 bg-[#E8F5EE] rounded-xl">
          <p className="text-3xl font-bold text-[#1A5C3A] tracking-wide" data-testid={`call-panel-phone-${itemId}`}>
            {phone || 'Numéro non renseigné'}
          </p>
          <p className="text-[11px] text-[#1A1A2E]/50 mt-1">À composer sur le téléphone du magasin</p>
        </div>
        {smsLine && (
          <p className="text-xs text-center text-[#1A5C3A] mt-2 px-1" data-testid={`call-panel-sms-info-${itemId}`}>{smsLine}</p>
        )}

        <div className="space-y-2 mt-2">
          {canGoBack && (
            <button onClick={goBack} className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 hover:text-[#1A5C3A] mb-1" data-testid={`call-back-${itemId}`}>
              <ChevronLeft size={14} /> Retour
            </button>
          )}

          {step === 'root' && (
            <div className="grid gap-2">
              <Chip onClick={() => setStep('joint')} testId={`call-outcome-joint-${itemId}`}>✅ Client joint</Chip>
              <Chip onClick={() => setStep('pas_de_reponse')} testId={`call-outcome-no-answer-${itemId}`}>📵 Pas de réponse</Chip>
              <Chip onClick={() => submit({ outcome: 'numero_invalide' })} testId={`call-outcome-invalid-${itemId}`} variant="danger">⚠️ Numéro invalide</Chip>
            </div>
          )}

          {step === 'joint' && (
            <div className="grid gap-2">
              <Chip onClick={() => { setPriceDraft(''); setPendingPrice(''); setApptDate(item?.rdv_date || ''); setStep('devis_price'); }} testId={`call-detail-devis-accepte-${itemId}`}>
                Oui, devis accepté
              </Chip>
              <Chip onClick={() => { setPriceDraft(''); setPendingPrice(''); setStep('reflechit_price'); }} testId={`call-detail-reflechit-${itemId}`}>
                Pas encore, il réfléchit
              </Chip>
              <Chip onClick={() => setStep('rappeler_when')} testId={`call-detail-rappeler-${itemId}`}>
                Pas dispo, à rappeler
              </Chip>
              <Chip onClick={() => setStep('refus')} testId={`call-detail-refus-${itemId}`} variant="danger">Refus</Chip>
            </div>
          )}

          {(step === 'devis_price' || step === 'reflechit_price') && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#1A1A2E]">Prix annoncé</p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={priceDraft}
                  onChange={e => setPriceDraft(e.target.value)}
                  placeholder="Ex: 89"
                  className="flex-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px]"
                  data-testid={`call-price-input-${itemId}`}
                />
                <Button
                  onClick={() => { setPendingPrice(priceDraft.trim()); setStep(step === 'devis_price' ? 'devis_when' : 'reflechit_when'); }}
                  disabled={!priceDraft.trim()}
                  className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full min-h-[44px]"
                  data-testid={`call-price-validate-${itemId}`}
                >
                  Valider
                </Button>
              </div>
              <button
                onClick={() => { setPendingPrice(''); setStep(step === 'devis_price' ? 'devis_when' : 'reflechit_when'); }}
                className="text-xs text-[#1A1A2E]/60 underline"
                data-testid={`call-price-skip-${itemId}`}
              >
                Passer (pas de prix)
              </button>
            </div>
          )}

          {step === 'devis_when' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#1A1A2E]">Quand vient-il ?</p>
              <input
                type="date"
                value={apptDate}
                onChange={e => setApptDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px]"
                data-testid={`appt-date-input-${itemId}`}
              />
              <div className="grid gap-2">
                {Object.keys(APPT_SLOT_SHORT).map(slot => (
                  <Chip key={slot} onClick={() => finalizeRdv(slot)} disabled={!apptDate || submitting} testId={`appt-slot-${slot}-${itemId}`}>
                    {slot}
                    {item?.rdv_slot === slot && (
                      <span className="block text-[10px] text-[#1A5C3A] font-normal">choisi par le client sur le site</span>
                    )}
                  </Chip>
                ))}
                <Chip onClick={finalizePassage} disabled={!apptDate || submitting} testId={`appt-no-rdv-${itemId}`}>
                  Sans RDV, il passe dans la journée
                </Chip>
              </div>
            </div>
          )}

          {step === 'reflechit_when' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#1A1A2E]">Quand le relancer ?</p>
              {callbackChips((choice, at) => finalizeReflechit(choice, at), 'reflechit-callback')}
            </div>
          )}

          {step === 'rappeler_when' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#1A1A2E]">Quand le rappeler ?</p>
              {callbackChips((choice, at) => submit({ outcome: 'joint', detail: 'rappeler', callback_choice: choice, callback_at: at }), 'callback')}
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

          {step === 'pas_de_reponse' && (() => {
            const q = PDR_QUESTIONS[pdrIndex];
            return (
              <div className="space-y-3">
                <p className="text-xs text-[#1A1A2E]/50">Question {pdrIndex + 1}/4</p>
                {q.action && (
                  <button
                    onClick={() => window.open(q.action === 'email' ? getRelanceMailtoUrl(item) : getRelanceWaUrl(item), '_blank')}
                    className="text-xs text-[#1A5C3A] underline"
                    data-testid={`pdr-open-${q.action}-${itemId}`}
                  >
                    Ouvrir {q.action === 'email' ? "l'email" : 'WhatsApp'} prêt à envoyer
                  </button>
                )}
                {!pdrAwaitingReason ? (
                  <>
                    <p className="text-sm font-medium text-[#1A1A2E]">{q.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Chip onClick={() => handlePdrAnswer(true)} testId={`pdr-yes-${q.field}-${itemId}`}>Oui</Chip>
                      <Chip onClick={() => setPdrAwaitingReason(true)} testId={`pdr-no-${q.field}-${itemId}`}>Non</Chip>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-red-600">{q.constat}</p>
                    <textarea
                      value={pdrReason}
                      onChange={e => setPdrReason(e.target.value)}
                      placeholder="Pourquoi ? (obligatoire)"
                      rows={2}
                      autoFocus
                      className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm focus:outline-none focus:border-[#2ECC71] resize-none"
                      data-testid={`pdr-reason-input-${q.field}-${itemId}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => { setPdrAwaitingReason(false); setPdrReason(''); }}
                        variant="outline"
                        className="flex-1 text-xs rounded-full border-[#E8F5EE] text-[#1A1A2E]"
                        data-testid={`pdr-reason-back-${q.field}-${itemId}`}
                      >
                        Retour
                      </Button>
                      <Button
                        onClick={() => handlePdrAnswer(false)}
                        disabled={!pdrReason.trim() || submitting}
                        className="flex-1 bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full"
                        data-testid={`pdr-reason-validate-${q.field}-${itemId}`}
                      >
                        Valider
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

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
