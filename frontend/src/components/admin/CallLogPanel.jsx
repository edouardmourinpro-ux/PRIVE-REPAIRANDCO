import { useState, useEffect } from 'react';
import { Phone, ChevronLeft, Mail, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { REFUS_REASON_OPTIONS } from '../../data/lostReasons';

const Chip = ({ children, onClick, testId, variant = 'default', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border transition-colors text-left disabled:opacity-40 ${
      variant === 'danger'
        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
        : variant === 'primary'
          ? 'border-[#1A5C3A] bg-[#1A5C3A] text-white hover:bg-[#2ECC71]'
          : 'border-[#E8F5EE] bg-white text-[#1A1A2E] hover:bg-[#E8F5EE]'
    }`}
  >
    {children}
  </button>
);

// Mêmes plages que le formulaire de RDV du site.
export const RDV_SLOTS = ['Matin (9h30-12h30)', 'Après-midi (14h-17h)', 'Fin de journée (17h-19h30)'];
// « Après-midi (14h-17h) » -> « 14h-17h »
export const slotHours = slot => ((slot || '').match(/\(([^)]+)\)/) || [])[1] || slot || '';

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const Question = ({ children }) => <p className="text-sm font-semibold text-[#1A1A2E] mb-2">{children}</p>;

// Panneau « Journal d'appel » : le résultat de l'appel fixe le statut et la prochaine action.
// Aucun texte obligatoire : des boutons, plus le prix et la date quand il le faut.
export const CallLogPanel = ({ open, onClose, itemId, phone, onSubmit, onOpenEmail, onOpenWhatsApp, clientRdv }) => {
  const [step, setStep] = useState('root');
  const [detail, setDetail] = useState(null);
  const [price, setPrice] = useState('');
  const [rdvDate, setRdvDate] = useState(todayIso());
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // RDV demandé sur le site : on part de la date choisie par le client
      const clientDate = clientRdv?.date && clientRdv.date >= todayIso() ? clientRdv.date : todayIso();
      setStep('root'); setDetail(null); setPrice(''); setRdvDate(clientDate); setAnswers({});
      setNote(''); setShowNote(false); setCustomDate(''); setSubmitting(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      await onSubmit({ ...payload, note: note.trim() || undefined });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const joint = (extra = {}) => ({ outcome: 'joint', detail, ...(price.trim() ? { quoted_price: price.trim() } : {}), ...extra });

  const chooseJoint = (d) => {
    setDetail(d);
    setStep(d === 'rappeler' ? 'when' : d === 'refus' ? 'refus' : 'price');
  };

  const afterPrice = () => {
    if (detail === 'rdv_pris') setStep('rdv');
    else if (detail === 'reflechit') setStep('when');
    else submit(joint());
  };

  const answer = (key, value) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (key === 'message_laisse') setStep('pdr_mail');
    else if (key === 'mail_envoye') setStep('pdr_message');
    else submit({ outcome: 'pas_de_reponse', ...next });
  };

  const YesNo = ({ name }) => (
    <div className="grid grid-cols-2 gap-2">
      <Chip onClick={() => answer(name, true)} disabled={submitting} testId={`call-${name}-oui-${itemId}`}>Oui</Chip>
      <Chip onClick={() => answer(name, false)} disabled={submitting} testId={`call-${name}-non-${itemId}`}>Non</Chip>
    </div>
  );

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
          <p className="text-2xl font-bold text-[#1A5C3A] tracking-wide select-all" data-testid={`call-panel-phone-${itemId}`}>
            {phone || 'Numéro non renseigné'}
          </p>
        </div>

        <div className="space-y-2 mt-2">
          {step !== 'root' && (
            <button onClick={() => { setStep('root'); setDetail(null); }} className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 hover:text-[#1A5C3A] mb-1" data-testid={`call-back-${itemId}`}>
              <ChevronLeft size={14} /> Retour
            </button>
          )}

          {step === 'root' && (
            <div className="grid gap-2">
              <Chip onClick={() => setStep('joint')} testId={`call-outcome-joint-${itemId}`}>✅ Joint</Chip>
              <Chip onClick={() => setStep('pdr')} testId={`call-outcome-no-answer-${itemId}`}>📵 Pas de réponse</Chip>
              <Chip onClick={() => submit({ outcome: 'numero_invalide' })} disabled={submitting} testId={`call-outcome-invalid-${itemId}`} variant="danger">⚠️ Numéro invalide</Chip>
            </div>
          )}

          {step === 'joint' && (
            <div className="grid gap-2">
              <Chip onClick={() => chooseJoint('rdv_pris')} testId={`call-detail-rdv-pris-${itemId}`}>Oui, devis accepté</Chip>
              <Chip onClick={() => chooseJoint('reflechit')} testId={`call-detail-reflechit-${itemId}`}>Pas encore, il réfléchit</Chip>
              <Chip onClick={() => chooseJoint('rappeler')} testId={`call-detail-rappeler-${itemId}`}>Pas dispo, à rappeler</Chip>
              <Chip onClick={() => chooseJoint('refus')} testId={`call-detail-refus-${itemId}`} variant="danger">Refus</Chip>
            </div>
          )}

          {step === 'price' && (
            <div>
              <Question>Prix annoncé au client</Question>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && price.trim()) afterPrice(); }}
                  placeholder="ex. 89"
                  className="flex-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-lg min-h-[44px]"
                  data-testid={`call-price-input-${itemId}`}
                />
                <span className="text-lg font-semibold text-[#1A1A2E]">€</span>
              </div>
              <div className="grid gap-2 mt-2">
                <Chip onClick={afterPrice} disabled={!price.trim() || submitting} variant="primary" testId={`call-price-ok-${itemId}`}>Valider</Chip>
                <button onClick={() => { setPrice(''); afterPrice(); }} className="text-xs text-[#1A1A2E]/50 underline" data-testid={`call-price-skip-${itemId}`}>Passer (pas de prix)</button>
              </div>
            </div>
          )}

          {step === 'rdv' && (
            <div>
              <Question>Quand vient-il ?</Question>
              <input
                type="date"
                value={rdvDate}
                min={todayIso()}
                onChange={e => setRdvDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px] mb-2"
                data-testid={`call-rdv-date-${itemId}`}
              />
              <div className="grid gap-2">
                {RDV_SLOTS.map(slot => (
                  <Chip key={slot} onClick={() => rdvDate && submit(joint({ rdv_date: rdvDate, rdv_slot: slot }))} disabled={!rdvDate || submitting} testId={`call-rdv-slot-${slotHours(slot)}-${itemId}`}>
                    {slot}
                    {clientRdv?.slot === slot && rdvDate === clientRdv.date && <span className="ml-2 text-xs text-[#1A5C3A]">choisi par le client sur le site</span>}
                  </Chip>
                ))}
                <Chip
                  onClick={() => rdvDate && submit(joint({ detail: 'devis_accepte', rdv_date: rdvDate }))}
                  disabled={!rdvDate || submitting}
                  testId={`call-rdv-sans-creneau-${itemId}`}
                >
                  Sans RDV, il passe dans la journée
                </Chip>
              </div>
            </div>
          )}

          {step === 'when' && (
            <div>
              <Question>Quand le rappeler ?</Question>
              <div className="grid gap-2">
                <Chip onClick={() => submit(joint({ callback_choice: '1h' }))} disabled={submitting} testId={`callback-1h-${itemId}`}>Dans 1 h</Chip>
                <Chip onClick={() => submit(joint({ callback_choice: '18h' }))} disabled={submitting} testId={`callback-18h-${itemId}`}>Ce soir 18h</Chip>
                <Chip onClick={() => submit(joint({ callback_choice: 'demain_10h' }))} disabled={submitting} testId={`callback-demain-${itemId}`}>Demain 10h</Chip>
                <div className="flex gap-2 items-center">
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[44px]"
                    data-testid={`callback-custom-input-${itemId}`}
                  />
                  <Button
                    onClick={() => customDate && submit(joint({ callback_choice: 'custom', callback_at: new Date(customDate).toISOString() }))}
                    disabled={!customDate || submitting}
                    className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full min-h-[44px]"
                    data-testid={`callback-custom-${itemId}`}
                  >
                    Valider
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'refus' && (
            <div className="grid gap-2">
              {REFUS_REASON_OPTIONS.map(r => (
                <Chip key={r.value} onClick={() => submit({ outcome: 'joint', detail: 'refus', refus_reason: r.value })} disabled={submitting} testId={`refus-reason-${r.value}-${itemId}`} variant="danger">
                  {r.label}
                </Chip>
              ))}
            </div>
          )}

          {step === 'pdr' && (
            <div>
              <Question>Message vocal laissé ?</Question>
              <YesNo name="message_laisse" />
            </div>
          )}

          {step === 'pdr_mail' && (
            <div>
              <Question>Email envoyé au client ?</Question>
              {onOpenEmail && (
                <button onClick={onOpenEmail} className="w-full flex items-center justify-center gap-1 mb-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] min-h-[40px]" data-testid={`call-open-email-${itemId}`}>
                  <Mail size={14} /> Ouvrir l'email prêt à envoyer
                </button>
              )}
              <YesNo name="mail_envoye" />
            </div>
          )}

          {step === 'pdr_message' && (
            <div>
              <Question>WhatsApp ou SMS envoyé au client ?</Question>
              {onOpenWhatsApp && (
                <button onClick={onOpenWhatsApp} className="w-full flex items-center justify-center gap-1 mb-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] min-h-[40px]" data-testid={`call-open-whatsapp-${itemId}`}>
                  <MessageCircle size={14} /> Ouvrir WhatsApp prêt à envoyer
                </button>
              )}
              <YesNo name="message_envoye" />
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
                placeholder="Note facultative..."
                className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm"
                rows={2}
                data-testid={`call-note-input-${itemId}`}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
