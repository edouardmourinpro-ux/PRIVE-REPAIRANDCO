// Liste des identités possibles pour "Qui êtes-vous ?" — compte admin partagé.
// Une seule constante, facile à modifier.
export const STAFF_IDENTITIES = [
  'Équipe Lattes',
  'Équipe Montpellier Nord',
  'Équipe Montpellier Sud',
  'Équipe Nîmes Costières',
  'Équipe Nîmes Étoile',
  'Équipe Béziers',
  'Équipe Boulogne',
  'Équipe Plaisir',
  'Équipe Les Ulis',
  'Mathilde',
  'Aurélie',
  'Laurence',
  'Charlotte',
  'Mickael',
  'Eren',
  'Elisa',
  'David',
  'Edouard',
];

// « Équipe X » → id du magasin correspondant (data/stores.js) — utilisé pour
// présélectionner le filtre Magasin quand une équipe se connecte (S19).
export const STAFF_IDENTITY_STORE_MAP = {
  'Équipe Lattes': 'lattes',
  'Équipe Montpellier Nord': 'montpellier-nord',
  'Équipe Montpellier Sud': 'montpellier-sud',
  'Équipe Nîmes Costières': 'nimes-costieres',
  'Équipe Nîmes Étoile': 'nimes-etoile',
  'Équipe Béziers': 'beziers',
  'Équipe Boulogne': 'boulogne',
  'Équipe Plaisir': 'plaisir',
  'Équipe Les Ulis': 'les-ulis',
};
