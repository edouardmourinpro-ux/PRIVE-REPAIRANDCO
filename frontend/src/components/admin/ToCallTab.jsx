import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { REFUS_REASON_OPTIONS } from '../../data/lostReasons';
import { clientSmsInfo } from '../../lib/leadFormat';

// Onglet « 📞 À appeler » : qui appeler, et quand. Calculé côté serveur.
// Chaque demande s'ouvre comme dans les autres onglets (renderCard = DemandCard).
const SECTIONS = [
  { id: 'maintenant', title: 'À appeler maintenant', hint: 'Rappels dont l\'heure est passée, nouvelles demandes, relances, clients attendus à vérifier.' },
  { id: 'plus_tard', title: 'Plus tard aujourd\'hui', hint: 'Rappels et RDV prévus, avec l\'heure.' },
  { id: 'a_classer', title: 'À classer', hint: '6 appels sans réponse, ou client qui réfléchit toujours après 2 relances.' },
];

// Couleur du bandeau selon la raison de l'appel.
const GROUP_STYLE = {
  1: 'bg-green-50 text-green-800 border-green-200',
  2: 'bg-red-50 text-red-700 border-red-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
  4: 'bg-gray-100 text-gray-800 border-gray-200',
  5: 'bg-blue-50 text-blue-800 border-blue-200',
  6: 'bg-gray-100 text-gray-800 border-gray-200',
  7: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  8: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  9: 'bg-blue-50 text-blue-800 border-blue-200',
};

const CALLBACK_CHOICES = [['1h', 'Dans 1 h'], ['18h', 'Ce soir 18h'], ['demain_10h', 'Demain 10h']];

export const ToCallTab = ({ items, loading, requireIdentity, onStatusChange, onRefresh, renderCard, onPassage }) => {
  const [confirmingId, setConfirmingId] = useState(null);
  const [perduId, setPerduId] = useState(null);
  // « Le client est-il venu ? » : oui puis facturé, ou non puis date de rappel
  const [venu, setVenu] = useState(null); // { id, step: 'facture' | 'note' | 'date', venu: bool, note }

  const btn = 'min-h-[36px] px-3 rounded-full text-xs font-medium';
  const closeVenu = () => setVenu(null);
  const sendPassage = (item, payload) => {
    requireIdentity(async () => {
      await onPassage(item, payload);
      closeVenu();
    });
  };

  const classerPerdu = (item, code) => {
    requireIdentity(() => {
      onStatusChange(item.id, 'client_perdu', { lostReasonCode: code }, item.category).then(() => {
        setPerduId(null);
        onRefresh();
      });
    });
  };

  const confirmInjoignable = (item) => {
    requireIdentity(() => {
      onStatusChange(item.id, 'client_perdu', { lostReasonCode: 'injoignable' }, item.category).then(() => {
        setConfirmingId(null);
        onRefresh();
      });
    });
  };

  if (loading && !items.length) {
    return (
      <div className="flex justify-center py-12" data-testid="to-call-loading">
        <Loader2 className="animate-spin text-[#1A5C3A]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="to-call-tab">
      {SECTIONS.map(section => {
        const sectionItems = items.filter(i => i.section === section.id);
        if (section.id !== 'maintenant' && !sectionItems.length) return null;
        return (
          <section key={section.id} data-testid={`to-call-section-${section.id}`}>
            <div className="mb-3">
              <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                {section.title}
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#E8F5EE] text-[#1A5C3A]">{sectionItems.length}</span>
              </h2>
              <p className="text-xs text-[#1A1A2E]/60">{section.hint}</p>
            </div>
            {!sectionItems.length ? (
              <p className="text-sm text-[#1A1A2E]/50 py-4" data-testid="to-call-empty-state">Personne à appeler pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {sectionItems.map(item => (
                  <div key={item.id} data-testid={`to-call-row-${item.id}`}>
                    <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-1 rounded-lg border text-sm font-semibold ${GROUP_STYLE[item.group] || GROUP_STYLE[4]}`}>
                      <span data-testid={`to-call-label-${item.id}`}>
                        {item.label} · {item.store_name}
                        {!item.call_attempts_count && clientSmsInfo(item).at && (
                          <span className="block font-normal text-xs opacity-80" data-testid={`to-call-sms-${item.id}`}>
                            SMS envoyé au client à {clientSmsInfo(item).at} : nous nous sommes engagés à le rappeler.
                          </span>
                        )}
                      </span>
                      {[7, 8].includes(item.group) && (
                        venu?.id !== item.id ? (
                          <span className="flex gap-2">
                            <button onClick={() => setVenu({ id: item.id, step: 'facture', venu: true, note: '' })} className={`${btn} bg-[#1A5C3A] text-white`} data-testid={`to-call-venu-oui-${item.id}`}>Oui, il est venu</button>
                            <button onClick={() => setVenu({ id: item.id, step: 'date', venu: false, note: '' })} className={`${btn} bg-white text-gray-800 border border-gray-300`} data-testid={`to-call-venu-non-${item.id}`}>Non</button>
                          </span>
                        ) : venu.step === 'facture' ? (
                          <span className="flex flex-wrap items-center gap-2">
                            Facturé ?
                            <button onClick={() => sendPassage(item, { venu: true, facture: true })} className={`${btn} bg-[#1A5C3A] text-white`} data-testid={`to-call-facture-oui-${item.id}`}>Oui</button>
                            <button onClick={() => setVenu({ ...venu, step: 'note' })} className={`${btn} bg-white text-gray-800 border border-gray-300`} data-testid={`to-call-facture-non-${item.id}`}>Non</button>
                            <button onClick={closeVenu} className={`${btn} text-gray-500`}>Annuler</button>
                          </span>
                        ) : venu.step === 'note' ? (
                          <span className="flex flex-wrap items-center gap-2 w-full">
                            <input
                              value={venu.note}
                              onChange={e => setVenu({ ...venu, note: e.target.value })}
                              placeholder="Pourquoi pas de facture ? (obligatoire)"
                              className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-normal"
                              autoFocus
                              data-testid={`to-call-facture-note-${item.id}`}
                            />
                            <button onClick={() => setVenu({ ...venu, step: 'date' })} disabled={!venu.note.trim()} className={`${btn} bg-[#1A5C3A] text-white disabled:opacity-40`} data-testid={`to-call-note-valider-${item.id}`}>Continuer</button>
                            <button onClick={closeVenu} className={`${btn} text-gray-500`}>Annuler</button>
                          </span>
                        ) : (
                          <span className="flex flex-wrap items-center gap-2">
                            On le rappelle quand ?
                            {CALLBACK_CHOICES.map(([value, label]) => (
                              <button
                                key={value}
                                onClick={() => sendPassage(item, { venu: venu.venu, facture: false, note: venu.note.trim() || undefined, callback_choice: value })}
                                className={`${btn} bg-white text-gray-800 border border-gray-300`}
                                data-testid={`to-call-venu-callback-${value}-${item.id}`}
                              >{label}</button>
                            ))}
                            <button onClick={closeVenu} className={`${btn} text-gray-500`}>Annuler</button>
                          </span>
                        )
                      )}
                      {item.group === 6 && (
                        perduId === item.id ? (
                          <span className="flex flex-wrap gap-2">
                            {REFUS_REASON_OPTIONS.map(r => (
                              <button key={r.value} onClick={() => classerPerdu(item, r.value)} className="min-h-[36px] px-3 rounded-full text-xs font-medium bg-white text-gray-800 border border-gray-300" data-testid={`to-call-perdu-${r.value}-${item.id}`}>{r.label}</button>
                            ))}
                            <button onClick={() => setPerduId(null)} className="min-h-[36px] px-3 rounded-full text-xs font-medium text-gray-500">Annuler</button>
                          </span>
                        ) : (
                          <button onClick={() => setPerduId(item.id)} className="min-h-[36px] px-3 rounded-full text-xs font-medium bg-gray-800 text-white" data-testid={`to-call-perdu-btn-${item.id}`}>Classer perdu</button>
                        )
                      )}
                      {item.group === 4 && (
                        confirmingId === item.id ? (
                          <span className="flex gap-2">
                            <button onClick={() => setConfirmingId(null)} className="min-h-[36px] px-3 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200" data-testid={`to-call-injoignable-cancel-${item.id}`}>Annuler</button>
                            <button onClick={() => confirmInjoignable(item)} className="min-h-[36px] px-3 rounded-full text-xs font-medium bg-gray-800 text-white" data-testid={`to-call-injoignable-confirm-${item.id}`}>Confirmer</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmingId(item.id)} className="min-h-[36px] px-3 rounded-full text-xs font-medium bg-gray-800 text-white" data-testid={`to-call-injoignable-btn-${item.id}`}>Classer Injoignable</button>
                        )
                      )}
                    </div>
                    {renderCard(item)}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
