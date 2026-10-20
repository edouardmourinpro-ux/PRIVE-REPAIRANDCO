// Statuts du pipeline serveur (S20) — libellés, couleurs et calcul de
// l'affichage "prochaine action" utilisés par la ligne de demande (tous les
// onglets) et les pastilles de filtre (S23 — refonte de la ligne).

export const APPT_SLOT_SHORT = {
  'Matin (9h30-12h30)': '9h30-12h30',
  'Après-midi (14h-17h)': '14h-17h',
  'Fin de journée (17h-19h30)': '17h-19h30',
};

const WEEKDAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const PARIS_DATE_FMT = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'numeric' });
const PARIS_TIME_FMT = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false });

// "AAAA-MM-JJ" (date de RDV/passage, pas d'heure) → "mar. 6/10"
export const formatApptDateShort = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_FMT.format(date)} ${d}/${m}`;
};

// ISO datetime UTC (rappel programmé) → "mar. 6/10 16:15" en heure de Paris
export const formatCallbackShort = (iso) => {
  if (!iso) return '';
  const dt = new Date(iso);
  const parts = PARIS_DATE_FMT.formatToParts(dt);
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  return `${get('weekday')} ${get('day')}/${get('month')} ${PARIS_TIME_FMT.format(dt)}`;
};

// Pipeline complet (S20) + anciens statuts (S14, conservés en lecture).
export const STATUS_META = {
  nouveau:        { label: 'Nouveau',        activeBg: 'bg-red-500',    idleBg: 'bg-red-50',    idleText: 'text-red-700',    border: 'border-red-100' },
  pas_de_reponse: { label: 'Pas de réponse', activeBg: 'bg-amber-500',  idleBg: 'bg-amber-50',  idleText: 'text-amber-700',  border: 'border-amber-100' },
  a_rappeler:     { label: 'À rappeler',     activeBg: 'bg-blue-500',   idleBg: 'bg-blue-50',   idleText: 'text-blue-700',   border: 'border-blue-100' },
  reflechit:      { label: 'Réfléchit',      activeBg: 'bg-purple-500', idleBg: 'bg-purple-50', idleText: 'text-purple-700', border: 'border-purple-100' },
  devis_accepte:  { label: 'Devis accepté',  activeBg: 'bg-teal-500',   idleBg: 'bg-teal-50',   idleText: 'text-teal-700',   border: 'border-teal-100' },
  rdv_pris:       { label: 'RDV pris',       activeBg: 'bg-cyan-500',   idleBg: 'bg-cyan-50',   idleText: 'text-cyan-700',   border: 'border-cyan-100' },
  facture:        { label: 'Facturé',        activeBg: 'bg-[#1A5C3A]',  idleBg: 'bg-[#E8F5EE]', idleText: 'text-[#1A5C3A]',  border: 'border-[#E8F5EE]' },
  refus_devis:    { label: 'Refus',          activeBg: 'bg-gray-500',   idleBg: 'bg-gray-50',   idleText: 'text-gray-700',   border: 'border-gray-200' },
  client_perdu:   { label: 'Perdu',          activeBg: 'bg-gray-800',   idleBg: 'bg-gray-100',  idleText: 'text-gray-900',   border: 'border-gray-300' },
  contacte:       { label: 'Contacté',       activeBg: 'bg-orange-500', idleBg: 'bg-orange-50', idleText: 'text-orange-700', border: 'border-orange-100' },
  pris_en_charge: { label: 'Pris en charge', activeBg: 'bg-sky-500',    idleBg: 'bg-sky-50',    idleText: 'text-sky-700',    border: 'border-sky-100' },
};

export const STATUS_FILTER_ORDER = ['nouveau', 'pas_de_reponse', 'a_rappeler', 'reflechit', 'devis_accepte', 'rdv_pris', 'pris_en_charge', 'facture', 'refus_devis', 'client_perdu'];
export const LEGACY_STATUS_ORDER = ['contacte'];

// Statuts depuis lesquels le client a dit "oui" — seuls ceux-là affichent la
// case à cocher "Facturé" sur la ligne (+ "facture" lui-même, pour décocher).
export const FACTURABLE_STATUSES = ['devis_accepte', 'rdv_pris', 'pris_en_charge', 'facture'];

// Libellé "prochaine action" affiché en colonne 3 de la ligne de demande.
export const getStatusDisplay = (item) => {
  const status = item.status || 'nouveau';
  const meta = STATUS_META[status] || STATUS_META.nouveau;
  let text = meta.label;
  if (status === 'a_rappeler' && item.next_callback_at) {
    text = `À rappeler · ${formatCallbackShort(item.next_callback_at)}`;
  } else if (status === 'reflechit' && item.next_callback_at) {
    text = `Réfléchit · ${formatCallbackShort(item.next_callback_at)}`;
  } else if (status === 'rdv_pris' && item.appt_date) {
    const slot = APPT_SLOT_SHORT[item.appt_slot] || item.appt_slot || '';
    text = `RDV ${formatApptDateShort(item.appt_date)}${slot ? `, ${slot}` : ''}`;
  } else if (status === 'devis_accepte' && item.appt_date) {
    text = `Passe le ${formatApptDateShort(item.appt_date)}`;
  }
  return { text, idleBg: meta.idleBg, idleText: meta.idleText, border: meta.border };
};

// Décocher "Facturé"/"Pris en charge" → retrouve le statut juste avant le
// dernier passage à `targetStatus` dans l'historique. Valeur de repli
// raisonnable si l'historique manque.
export const getPreviousStatusBefore = (item, targetStatus) => {
  const history = item.status_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].status === targetStatus) {
      for (let j = i - 1; j >= 0; j--) {
        if (history[j].status !== targetStatus) return history[j].status;
      }
      break;
    }
  }
  return 'devis_accepte';
};

export const getPreviousStatusBeforeFacture = (item) => getPreviousStatusBefore(item, 'facture');
