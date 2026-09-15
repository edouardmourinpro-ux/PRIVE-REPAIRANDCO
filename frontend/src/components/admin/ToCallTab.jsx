import { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { CallLogPanel } from './CallLogPanel';
import { formatLeadTitle } from '../../lib/leadFormat';

// Accent visuel par groupe (1=rappel dû, 2=nouveau, 3=relance, 4=injoignable prêt).
const GROUP_BORDER = {
  1: 'border-l-4 border-[#2ECC71]',
  2: 'border-l-4 border-red-400',
  3: 'border-l-4 border-orange-400',
  4: 'border-l-4 border-gray-500',
};

// Onglet "📞 À appeler" — qui appeler maintenant, calculé côté serveur (S19).
// Ne modifie jamais de données par lui-même : chaque action ré-interroge le
// serveur via onRefresh() pour rester la source de vérité (aucun page reload).
export const ToCallTab = ({ items, loading, requireIdentity, onLogCall, onStatusChange, onRefresh }) => {
  const [callPanelItem, setCallPanelItem] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

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

  return (
    <div className="space-y-3" data-testid="to-call-tab">
      {items.map(item => {
        const isConfirming = confirmingId === item.id;
        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border border-[#E8F5EE] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${GROUP_BORDER[item.group] || ''}`}
            data-testid={`to-call-row-${item.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A2E] truncate">{formatLeadTitle(item, item.category)}</p>
              <p className="text-xs text-[#1A1A2E]/60">{item.store_name}</p>
              <p className="text-xs font-medium text-[#1A5C3A] mt-1" data-testid={`to-call-label-${item.id}`}>{item.label}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {item.call_attempts_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#1A1A2E]/60 font-medium" data-testid={`to-call-count-${item.id}`}>
                  <Phone size={12} /> {item.call_attempts_count}
                </span>
              )}
              {item.group === 4 && (
                isConfirming ? (
                  <>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="min-h-[44px] px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                      data-testid={`to-call-injoignable-cancel-${item.id}`}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => confirmInjoignable(item)}
                      className="min-h-[44px] px-3 rounded-full text-xs font-medium bg-gray-800 text-white hover:bg-gray-900"
                      data-testid={`to-call-injoignable-confirm-${item.id}`}
                    >
                      Confirmer ?
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmingId(item.id)}
                    className="min-h-[44px] px-3 rounded-full text-xs font-medium bg-gray-200 text-gray-900 hover:bg-gray-300"
                    data-testid={`to-call-injoignable-btn-${item.id}`}
                  >
                    Classer Injoignable
                  </button>
                )
              )}
              <a
                href={`tel:${item.phone || ''}`}
                onClick={() => openCallPanel(item)}
                className="min-h-[44px] flex items-center gap-1.5 px-4 rounded-full text-xs font-semibold bg-[#1A5C3A] text-white hover:bg-[#2ECC71] transition-colors"
                data-testid={`to-call-call-btn-${item.id}`}
              >
                <Phone size={13} /> Appeler
              </a>
            </div>
          </div>
        );
      })}

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
