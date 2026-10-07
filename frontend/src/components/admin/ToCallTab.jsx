import { useState } from 'react';
import { Phone, Loader2, ChevronDown } from 'lucide-react';
import { CallLogPanel } from './CallLogPanel';
import { LOST_REASON_OPTIONS } from '../../data/lostReasons';

// Styles par groupe (S22) — repris du libellé renvoyé par /admin/to-call.
// 1 rappel dû = vert · 2 nouvelle demande = rouge · 3 relance = orange ·
// 5/9 RDV & rappels à venir = bleu · 7/8 clients attendus = cyan · 4/6 à classer = gris.
const GROUP_STYLE = {
  1: { bg: 'bg-[#E8F5EE]', bar: 'border-[#2ECC71]', text: 'text-[#1A5C3A]' },
  2: { bg: 'bg-red-50', bar: 'border-red-500', text: 'text-red-700' },
  3: { bg: 'bg-orange-50', bar: 'border-orange-500', text: 'text-orange-700' },
  5: { bg: 'bg-blue-50', bar: 'border-blue-500', text: 'text-blue-700' },
  9: { bg: 'bg-blue-50', bar: 'border-blue-500', text: 'text-blue-700' },
  7: { bg: 'bg-cyan-50', bar: 'border-cyan-500', text: 'text-cyan-700' },
  8: { bg: 'bg-cyan-50', bar: 'border-cyan-500', text: 'text-cyan-700' },
  4: { bg: 'bg-gray-100', bar: 'border-gray-400', text: 'text-gray-700' },
  6: { bg: 'bg-gray-100', bar: 'border-gray-400', text: 'text-gray-700' },
};
const DEFAULT_STYLE = { bg: 'bg-gray-50', bar: 'border-gray-300', text: 'text-[#1A1A2E]' };

const SECTION_META = {
  maintenant: {
    title: 'À appeler maintenant',
    desc: "Rappels dont l'heure est passée, nouvelles demandes, relances, clients attendus à vérifier.",
  },
  plus_tard: {
    title: "Plus tard aujourd'hui",
    desc: "Rappels et RDV prévus, avec l'heure.",
  },
  a_classer: {
    title: 'À classer',
    desc: "6 appels sans réponse, ou client qui réfléchit toujours après 2 relances.",
  },
};
const SECTION_ORDER = ['maintenant', 'plus_tard', 'a_classer'];

const SMS_TYPE_PHRASE = {
  creation: 'nous nous sommes engagés à le rappeler',
  rdv: 'confirmation de RDV envoyée',
  passage: 'confirmation de passage envoyée',
};

const formatHHMM = (iso) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso));
  } catch {
    return '';
  }
};

const ActionBtn = ({ onClick, children, testId, variant = 'default', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={`min-h-[40px] px-3.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
      variant === 'danger' ? 'bg-gray-800 text-white hover:bg-gray-900'
      : variant === 'ghost' ? 'bg-white border border-[#E8F5EE] text-[#1A1A2E] hover:bg-[#E8F5EE]'
      : 'bg-[#1A5C3A] text-white hover:bg-[#2ECC71]'
    }`}
  >
    {children}
  </button>
);

const PASSAGE_CALLBACK_CHOICES = [
  { value: '1h', label: 'Dans 1 h' },
  { value: '18h', label: 'Ce soir 18h' },
  { value: 'demain_10h', label: 'Demain 10h' },
];

// Parcours "est-il venu ?" (groupes 7/8 — POST /passage). Composant stable
// défini hors du .map() parent : React ne le recrée jamais à chaque frappe,
// le curseur du champ texte ne saute donc pas.
const PassageFlow = ({ itemId, onSubmit }) => {
  const [view, setView] = useState('buttons');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (view === 'buttons') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <ActionBtn onClick={() => setView('facture_ask')} disabled={submitting} testId={`passage-venu-${itemId}`}>Oui, il est venu</ActionBtn>
        <ActionBtn onClick={() => setView('non_date')} disabled={submitting} testId={`passage-non-venu-${itemId}`} variant="ghost">Non</ActionBtn>
      </div>
    );
  }

  if (view === 'facture_ask') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[#1A1A2E]/70">Facturé ?</span>
        <ActionBtn onClick={() => submit({ venu: true, facture: true })} disabled={submitting} testId={`passage-facture-oui-${itemId}`}>Oui</ActionBtn>
        <ActionBtn onClick={() => setView('non_facture_detail')} disabled={submitting} testId={`passage-facture-non-${itemId}`} variant="ghost">Non</ActionBtn>
      </div>
    );
  }

  if (view === 'non_facture_detail') {
    return (
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <label className="text-xs font-medium text-[#1A1A2E]/70" htmlFor={`passage-note-input-${itemId}`}>
          Pourquoi pas de facture ? (obligatoire)
        </label>
        <input
          id={`passage-note-input-${itemId}`}
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ex : pas prêt à payer aujourd'hui"
          className="px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm min-h-[40px] bg-white focus:outline-none focus:border-[#2ECC71]"
          data-testid={`passage-note-input-${itemId}`}
        />
        {note.trim().length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {PASSAGE_CALLBACK_CHOICES.map(c => (
              <ActionBtn
                key={c.value}
                onClick={() => submit({ venu: true, facture: false, note: note.trim(), callback_choice: c.value })}
                disabled={submitting}
                testId={`passage-callback-${c.value}-${itemId}`}
              >
                {c.label}
              </ActionBtn>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'non_date') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[#1A1A2E]/70">Prochain rappel :</span>
        {PASSAGE_CALLBACK_CHOICES.map(c => (
          <ActionBtn
            key={c.value}
            onClick={() => submit({ venu: false, callback_choice: c.value })}
            disabled={submitting}
            testId={`passage-nonvenu-callback-${c.value}-${itemId}`}
          >
            {c.label}
          </ActionBtn>
        ))}
      </div>
    );
  }

  return null;
};

// Onglet "📞 À appeler" — 3 sections / 9 groupes calculés côté serveur (S20).
// Ne modifie jamais de données par lui-même : chaque action ré-interroge le
// serveur via onRefresh() pour rester la source de vérité (aucun page reload).
export const ToCallTab = ({
  items, loading, requireIdentity, onLogCall, onStatusChange, onLogPassage,
  onSaveStaffFeedback, onSaveQuotedPrice, onDelete, onPushSMS, onRefresh, DemandCard,
}) => {
  const [callPanelItem, setCallPanelItem] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [lostMenuId, setLostMenuId] = useState(null);

  const openCallPanel = (item) => {
    requireIdentity(() => setCallPanelItem({ id: item.id, category: item.category, phone: item.phone }));
  };

  const handleCallSubmit = async (payload) => {
    if (!callPanelItem) return;
    await onLogCall(callPanelItem.id, { ...payload, by: localStorage.getItem('admin_identity') || '' }, callPanelItem.category);
    onRefresh();
  };

  const confirmInjoignable = (item) => {
    requireIdentity(() => {
      onStatusChange(item.id, 'client_perdu', { lostReasonCode: 'injoignable' }, item.category).then(() => {
        setConfirmingId(null);
        onRefresh();
      });
    });
  };

  const pickLostReason = (item, code) => {
    requireIdentity(() => {
      onStatusChange(item.id, 'client_perdu', { lostReasonCode: code }, item.category).then(() => {
        setLostMenuId(null);
        onRefresh();
      });
    });
  };

  const submitPassage = (item, payload) => new Promise((resolve, reject) => {
    requireIdentity(async () => {
      try {
        await onLogPassage(item.id, { ...payload, by: localStorage.getItem('admin_identity') || '' }, item.category);
        onRefresh();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12" data-testid="to-call-loading">
        <Loader2 className="animate-spin text-[#1A5C3A]" size={32} />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-12 text-[#1A1A2E]/50" data-testid="to-call-empty-state">
        Aucun appel à faire pour le moment 🎉
      </div>
    );
  }

  const bySection = SECTION_ORDER.map(key => ({
    key,
    meta: SECTION_META[key],
    rows: items.filter(it => it.section === key),
  })).filter(s => s.rows.length > 0);

  return (
    <div className="space-y-6" data-testid="to-call-tab">
      {bySection.map(section => (
        <div key={section.key} data-testid={`to-call-section-${section.key}`}>
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-bold text-[#1A1A2E]">{section.meta.title}</h3>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1A5C3A] text-white"
              data-testid={`to-call-section-count-${section.key}`}
            >
              {section.rows.length}
            </span>
          </div>
          <p className="text-xs text-[#1A1A2E]/50 mb-3">{section.meta.desc}</p>

          <div className="space-y-3">
            {section.rows.map(item => {
              const style = GROUP_STYLE[item.group] || DEFAULT_STYLE;
              const isConfirming = confirmingId === item.id;
              const lostMenuOpen = lostMenuId === item.id;
              const lastSentSms = (item.client_sms || []).filter(s => s.status === 'sent').slice(-1)[0];
              const showSmsLine = (item.call_attempts_count || 0) === 0 && lastSentSms;

              return (
                <div key={item.id} data-testid={`to-call-row-${item.id}`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border-l-4 ${style.bg} ${style.bar}`}>
                    <div className="min-w-0">
                      <p className={`text-xs sm:text-sm font-semibold ${style.text}`} data-testid={`to-call-label-${item.id}`}>
                        {item.label} · {item.store_name}
                      </p>
                      {showSmsLine && (
                        <p className="text-[11px] text-[#1A1A2E]/50 mt-0.5" data-testid={`to-call-sms-line-${item.id}`}>
                          SMS envoyé au client à {formatHHMM(lastSentSms.at)} : {SMS_TYPE_PHRASE[lastSentSms.type] || 'confirmation envoyée'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {item.call_attempts_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 font-medium" data-testid={`to-call-count-${item.id}`}>
                          <Phone size={12} /> {item.call_attempts_count}
                        </span>
                      )}

                      {item.group === 4 && (
                        isConfirming ? (
                          <>
                            <ActionBtn onClick={() => setConfirmingId(null)} testId={`to-call-injoignable-cancel-${item.id}`} variant="ghost">Annuler</ActionBtn>
                            <ActionBtn onClick={() => confirmInjoignable(item)} testId={`to-call-injoignable-confirm-${item.id}`} variant="danger">Confirmer ?</ActionBtn>
                          </>
                        ) : (
                          <ActionBtn onClick={() => setConfirmingId(item.id)} testId={`to-call-injoignable-btn-${item.id}`} variant="danger">
                            Classer Injoignable
                          </ActionBtn>
                        )
                      )}

                      {item.group === 6 && (
                        lostMenuOpen ? (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end" data-testid={`to-call-lost-menu-${item.id}`}>
                            {LOST_REASON_OPTIONS.map(r => (
                              <button
                                key={r.value}
                                onClick={() => pickLostReason(item, r.value)}
                                className="min-h-[36px] px-2.5 rounded-full text-[11px] font-medium bg-white border border-[#E8F5EE] text-[#1A1A2E] hover:bg-gray-100"
                                data-testid={`to-call-lost-reason-${r.value}-${item.id}`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <ActionBtn onClick={() => setLostMenuId(item.id)} testId={`to-call-perdu-btn-${item.id}`} variant="danger">
                            Classer perdu <ChevronDown size={13} className="inline ml-1" />
                          </ActionBtn>
                        )
                      )}

                      {(item.group === 7 || item.group === 8) && (
                        <PassageFlow
                          itemId={item.id}
                          onSubmit={(payload) => submitPassage(item, payload)}
                        />
                      )}

                      {![4, 6, 7, 8].includes(item.group) && (
                        <ActionBtn onClick={() => openCallPanel(item)} testId={`to-call-call-btn-${item.id}`}>
                          <Phone size={13} className="inline mr-1.5" /> Appel
                        </ActionBtn>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5">
                    <DemandCard
                      item={item}
                      type={item.category}
                      onStatusChange={(id, status, extra) => onStatusChange(id, status, extra, item.category)}
                      onSaveStaffFeedback={(id, payload) => onSaveStaffFeedback(id, payload, item.category)}
                      onSaveQuotedPrice={(id, price) => onSaveQuotedPrice(id, price, item.category)}
                      onDelete={(id, code) => onDelete(id, code, item.category)}
                      onPushSMS={(id, code) => onPushSMS(id, code, item.category)}
                      requireIdentity={requireIdentity}
                      onLogCall={(id, payload) => onLogCall(id, payload, item.category)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <CallLogPanel
        open={!!callPanelItem}
        onClose={() => setCallPanelItem(null)}
        itemId={callPanelItem?.id || 'to-call'}
        phone={callPanelItem?.phone}
        onSubmit={handleCallSubmit}
      />
    </div>
  );
};
