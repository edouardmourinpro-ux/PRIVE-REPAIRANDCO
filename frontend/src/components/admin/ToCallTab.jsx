import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// Onglet « 📞 À appeler » : qui appeler, et quand. Calculé côté serveur.
// Chaque demande s'ouvre comme dans les autres onglets (renderCard = DemandCard).
const SECTIONS = [
  { id: 'maintenant', title: 'À appeler maintenant', hint: 'Rappels dont l\'heure est passée, nouvelles demandes, relances.' },
  { id: 'plus_tard', title: 'Plus tard aujourd\'hui', hint: 'Rappels prévus, avec l\'heure.' },
  { id: 'a_classer', title: 'À classer', hint: '3 appels sans réponse sur 2 jours : vous pouvez classer le client « Injoignable ».' },
];

// Couleur du bandeau selon la raison de l'appel.
const GROUP_STYLE = {
  1: 'bg-green-50 text-green-800 border-green-200',
  2: 'bg-red-50 text-red-700 border-red-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
  4: 'bg-gray-100 text-gray-800 border-gray-200',
  5: 'bg-blue-50 text-blue-800 border-blue-200',
};

export const ToCallTab = ({ items, loading, requireIdentity, onStatusChange, onRefresh, renderCard }) => {
  const [confirmingId, setConfirmingId] = useState(null);

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
                      <span data-testid={`to-call-label-${item.id}`}>{item.label} · {item.store_name}</span>
                      {item.section === 'a_classer' && (
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
