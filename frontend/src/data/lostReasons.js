// Motifs de perte / refus — liste fixe en un clic (aligné avec backend/server.py).
export const LOST_REASON_OPTIONS = [
  { value: 'injoignable', label: 'Injoignable' },
  { value: 'prix', label: 'Prix' },
  { value: 'delai', label: 'Délai' },
  { value: 'deja_repare_ailleurs', label: 'Déjà réparé ailleurs' },
  { value: 'plus_besoin', label: "N'en a plus besoin" },
  { value: 'piece_indisponible', label: 'Pièce indisponible' },
  { value: 'magasin_ferme', label: 'Magasin fermé' },
  { value: 'numero_invalide', label: 'Numéro invalide' },
  { value: 'doublon_erreur', label: 'Doublon / erreur' },
  { value: 'autre', label: 'Autre' },
];

// Sous-ensemble proposé après un appel "Refus" (pas de Magasin fermé / Numéro
// invalide / Injoignable / Doublon dans ce contexte précis).
const REFUS_VALUES = ['prix', 'delai', 'deja_repare_ailleurs', 'plus_besoin', 'piece_indisponible', 'autre'];
export const REFUS_REASON_OPTIONS = LOST_REASON_OPTIONS.filter(o => REFUS_VALUES.includes(o.value));

export const LOST_REASON_LABELS = LOST_REASON_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {});
