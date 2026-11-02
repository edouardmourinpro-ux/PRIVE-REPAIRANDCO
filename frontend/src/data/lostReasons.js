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

// Case "Perdu" sur la ligne (S35) — motifs proposés dans l'ordre demandé,
// avec un libellé plus explicite que les mêmes codes ailleurs dans l'app.
export const PERDU_REASON_OPTIONS = [
  { value: 'injoignable', label: 'Injoignable' },
  { value: 'plus_besoin', label: 'Plus besoin' },
  { value: 'prix', label: 'Prix trop élevé' },
  { value: 'delai', label: 'Délai trop long' },
  { value: 'deja_repare_ailleurs', label: 'Déjà réparé ailleurs' },
  { value: 'piece_indisponible', label: 'Pièce indisponible' },
  { value: 'autre', label: 'Autre' },
];
export const PERDU_REASON_LABELS = PERDU_REASON_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {});
