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

// Défini en dehors du panneau : un composant recréé à chaque rendu ferait
// perdre le curseur au champ de saisie (le texte s'écrivait à l'envers).
const YesNo = ({ name, itemId, noFor, setNoFor, noReason, setNoReason, onAnswer, submitting }) => (
  noFor === name ? (
    <div>
      <textarea
        value={noReason}
        onChange={e => setNoReason(e.target.value)}
        placeholder="Pourquoi ? (obligatoire)"
        className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm mb-2"
        rows={2}
        autoFocus
        data-testid={`call-${name}-raison-${itemId}`}
      />
      <div className="grid grid-cols-2 gap-2">
        <Chip onClick={() => { setNoFor(null); setNoReason(''); }} testId={`call-${name}-annuler-${itemId}`}>Retour</Chip>
        <Chip onClick={() => onAnswer(name, false, noReason.trim())} disabled={!noReason.trim() || submitting} variant="primary" testId={`call-${name}-non-valider-${itemId}`}>Valider</Chip>
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <Chip onClick={() => onAnswer(name, true)} disabled={submitting} testId={`call-${name}-oui-${itemId}`}>Oui</Chip>
      <Chip onClick={() => setNoFor(name)} disabled={submitting} testId={`call-${name}-non-${itemId}`}>Non</Chip>
    </div>
  )
);

// Panneau « Journal d'appel » : le résultat de l'appel fixe le statut et la prochaine action.
// Aucun texte obligatoire : des boutons, plus le prix et la date quand il le faut.
export const CallLogPanel = ({ open, onClose, itemId, phone, onSubmit, onOpenEmail, onOpenWhatsApp, clientRdv, clientSms }) => {
  const [step, setStep] = useState('root');
  const [detail, setDetail] = useState(null);
  const [price, setPrice] = useState('');
  const [rdvDate, setRdvDate] = useState(todayIso());
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noFor, setNoFor] = useState(null);
  const [noReason, setNoReason] = useState('');

  useEffect(() => {
    if (open) {
      // RDV demandé sur le site : on part de la date choisie par le client
      const clientDate = clientRdv?.date && clientRdv.date >= todayIso() ? clientRdv.date : todayIso();
      setStep('root'); setDetail(null); setPrice(''); setRdvDate(clientDate); setAnswers({});
      setNote(''); setShowNote(false); setCustomDate(''); setSubmitting(false);
      setNoFor(null); setNoReason('');
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

  // Pas de réponse : 4 questions à la suite. Un « Non » demande toujours pourquoi.
  const PDR_STEPS = [
    { key: 'rappel_2e', question: 'Vous avez rappelé une deuxième fois ?', non: "Vous n'avez pas rappelé une 2ème fois :" },
    { key: 'message_laisse', question: 'Message vocal laissé ?', non: "Vous n'avez pas laissé de message vocal :" },
    { key: 'mail_envoye', question: 'Email envoyé au client ?', non: "Vous n'avez pas envoyé de mail au client :", action: 'email' },
    { key: 'message_envoye', question: 'WhatsApp envoyé au client ?', non: "Vous n'avez pas envoyé de WhatsApp au client :", action: 'whatsapp' },
  ];

  const answer = (key, value, raison) => {
    const next = { ...answers, [key]: value, ...(value === false ? { [`${key}_raison`]: raison } : {}) };
    setAnswers(next);
    setNoFor(null); setNoReason('');
    const i = PDR_STEPS.findIndex(st => st.key === key);
    if (i >= 0 && i < PDR_STEPS.length - 1) setStep(`pdr_${PDR_STEPS[i + 1].key}`);
    else submit({ outcome: 'pas_de_reponse', ...next });
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
          <p className="text-2xl font-bold text-[#1A5C3A] tracking-wide select-all" data-testid={`call-panel-phone-${itemId}`}>
            {phone || 'Numéro non renseigné'}
          </p>
          {clientSms?.at && (
            <p className="text-xs text-[#1A5C3A] mt-1 px-3" data-testid={`call-panel-sms-${itemId}`}>
              Le client a reçu un SMS à {clientSms.at} : le magasin le rappelle. Nous nous sommes engagés.
            </p>
          )}
          {!clientSms?.at && clientSms?.fixe && (
            <p className="text-xs text-[#1A1A2E]/50 mt-1 px-3">Pas de SMS envoyé : numéro fixe.</p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          {step !== 'root' && (
            <button onClick={() => { setStep('root'); setDetail(null); }} className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 hover:text-[#1A5C3A] mb-1" data-testid={`call-back-${itemId}`}>
              <ChevronLeft size={14} /> Retour
            </button>
          )}

          {step === 'root' && (
            <div className="grid gap-2">
              <Chip onClick={() => setStep('joint')} testId={`call-outcome-joint-${itemId}`}>✅ Client joint</Chip>
              <Chip onClick={() => setStep('pdr_rappel_2e')} testId={`call-outcome-no-answer-${itemId}`}>📵 Pas de réponse</Chip>
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

          {PDR_STEPS.map(st => step === `pdr_${st.key}` && (
            <div key={st.key}>
              <Question>{noFor === st.key ? st.non : st.question}</Question>
              {st.action === 'email' && onOpenEmail && noFor !== st.key && (
                <button onClick={onOpenEmail} className="w-full flex items-center justify-center gap-1 mb-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] min-h-[40px]" data-testid={`call-open-email-${itemId}`}>
                  <Mail size={14} /> Ouvrir l'email prêt à envoyer
                </button>
              )}
              {st.action === 'whatsapp' && onOpenWhatsApp && noFor !== st.key && (
                <button onClick={onOpenWhatsApp} className="w-full flex items-center justify-center gap-1 mb-2 px-3 py-2 rounded-xl text-xs font-medium border border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] min-h-[40px]" data-testid={`call-open-whatsapp-${itemId}`}>
                  <MessageCircle size={14} /> Ouvrir WhatsApp prêt à envoyer
                </button>
              )}
              <YesNo
                name={st.key}
                itemId={itemId}
                noFor={noFor}
                setNoFor={setNoFor}
                noReason={noReason}
                setNoReason={setNoReason}
                onAnswer={answer}
                submitting={submitting}
              />
            </div>
          ))}

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
