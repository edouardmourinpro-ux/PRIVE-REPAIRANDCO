export const STORES = [
  {
    id: "lattes",
    name: "Repair&Co Lattes",
    type: "Kiosque",
    location: "CC Carrefour Grand Sud (Entrée 2)",
    address: "Av. Georges Frêche",
    city: "Lattes",
    postalCode: "34970",
    phone: "07 88 80 93 86",
    email: "lattes@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/lFzdAJaUSU0dZM7JL",
  },
  {
    id: "montpellier-nord",
    name: "Repair&Co Montpellier Nord",
    type: "Magasin",
    location: "CC Carrefour Trifontaine",
    address: "Route de Ganges",
    city: "Saint Clément de Rivière",
    postalCode: "34980",
    phone: "09 87 13 68 93",
    email: "montpellier.nord@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/cjKv9XBwmmeiSo7G8",
  },
  {
    id: "montpellier-sud",
    name: "Repair&Co Montpellier Sud",
    type: "Magasin",
    location: "CC Intermarché près d'Arènes",
    address: "Av. Mas d'Argelliers",
    city: "Montpellier",
    postalCode: "34070",
    phone: "09 82 81 89 34",
    email: "montpellier.sud@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/8vetq0WeJoznjXbR6",
  },
  {
    id: "nimes-costieres",
    name: "Repair&Co Nîmes Costières",
    type: "Kiosque",
    location: "Shop Park Nîmes Costières",
    address: "400 Av. Dr Baillet",
    city: "Nîmes",
    postalCode: "30900",
    phone: "07 57 53 23 89",
    email: "nimes.costieres@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/7D1tlWpfmE2Qv5Iq0",
  },
  {
    id: "nimes-etoile",
    name: "Repair&Co Nîmes Étoile",
    type: "Magasin",
    location: "CC Carrefour Nîmes Étoile",
    address: "116 Rue André Dupont",
    city: "Nîmes",
    postalCode: "30900",
    phone: "04 66 84 80 79",
    email: "nimes.etoile@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–19h30",
    qualirepar: true,
    mapsUrl: "https://share.google/3Lw5HHNnYOYc6ggsI",
  },
  {
    id: "beziers",
    name: "Repair&Co Béziers",
    type: "Magasin",
    location: "",
    address: "12 Allées Paul Riquet",
    city: "Béziers",
    postalCode: "34500",
    phone: "04 67 94 30 34",
    email: "beziers@repair-and-co.fr",
    hours: "Lundi–Samedi : 9h30–19h30",
    qualirepar: true,
    mapsUrl: "https://maps.app.goo.gl/8EK9ZbNd77gP5v759",
  },
  {
    id: "boulogne",
    name: "Repair&Co Boulogne",
    type: "Kiosque",
    location: "CC Les Passages",
    address: "5 Rue Tony Garnier",
    city: "Boulogne-Billancourt",
    postalCode: "92100",
    phone: "07 67 11 88 96",
    email: "boulogne@repair-and-co.fr",
    hours: "Lundi–Samedi : 10h00–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/eatJYSOrIqBDGof4S",
  },
  {
    id: "plaisir",
    name: "Repair&Co Plaisir",
    type: "Magasin",
    location: "CC Aushopping Grand Plaisir",
    address: "CD 161",
    city: "Plaisir",
    postalCode: "78370",
    phone: "01 30 43 89 07",
    email: "plaisir@repair-and-co.fr",
    hours: "Lundi–Samedi : 10h00–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/psFOmyRzMZ8fc1MsB",
  },
  {
    id: "les-ulis",
    name: "Repair&Co Les Ulis",
    type: "Kiosque",
    location: "CC Ulis 2",
    address: "Av. de l'Aubrac",
    city: "Les Ulis",
    postalCode: "91940",
    phone: "07 49 95 24 72",
    email: "les.ulis@repair-and-co.fr",
    hours: "Lundi–Samedi : 10h00–20h00",
    qualirepar: true,
    mapsUrl: "https://share.google/XYoPozYOfuetnBCx6",
  }
];

// 4 magasins sélectionnés pour la homepage et la page "Qui sommes-nous"
export const FEATURED_STORE_IDS = ["nimes-etoile", "nimes-costieres", "montpellier-sud", "lattes"];

export const SERVICES = [
  {
    id: "smartphones",
    title: "Smartphones",
    icon: "Smartphone",
    description: "Réparation rapide de tous vos smartphones : écran, batterie, connecteur de charge et plus encore.",
    repairs: ["Écran cassé / remplacement de vitre", "Batterie (autonomie dégradée)", "Connecteur de charge", "Caméra avant / arrière", "Boutons volume / power", "Haut-parleur / micro"],
    brands: ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus", "Google", "Oppo"],
    delay: "30 min à 1h",
    priceFrom: 29
  },
  {
    id: "tablettes",
    title: "Tablettes",
    icon: "Tablet",
    description: "Votre tablette a besoin d'attention ? Nous réparons iPad, Samsung Tab et toutes les marques.",
    repairs: ["Écran fissuré / remplacement", "Batterie", "Connecteur de charge", "Boutons et connectique"],
    brands: ["iPad", "Samsung Tab", "Lenovo", "Huawei", "Microsoft Surface"],
    delay: "1h à 2h",
    priceFrom: 39
  },
  {
    id: "pc",
    title: "PC & Ordinateurs",
    icon: "Laptop",
    description: "Portables et fixes, toutes marques. Diagnostic complet et réparation professionnelle.",
    repairs: ["Remplacement écran", "Clavier", "Batterie", "Nettoyage / optimisation", "Remplacement disque dur / SSD", "Réinstallation système"],
    brands: ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple MacBook", "MSI"],
    delay: "24h à 48h",
    priceFrom: 49
  },
  {
    id: "electromenager",
    title: "Petit électroménager",
    icon: "Coffee",
    description: "Cafetières, aspirateurs, grille-pain, mixeurs... On répare aussi vos appareils du quotidien.",
    repairs: ["Cafetières", "Aspirateurs", "Grille-pain", "Mixeurs", "Diagnostic + réparation sur place"],
    brands: ["Toutes marques"],
    delay: "Selon pièces disponibles",
    priceFrom: null
  }
];

export const REVIEWS = [
  { id: 1, name: "Marie L.", rating: 5, text: "Écran de mon iPhone réparé en 45 minutes ! Service impeccable et prix très correct. Je recommande vivement.", store: "Nîmes Étoile", date: "Il y a 2 semaines" },
  { id: 2, name: "Thomas B.", rating: 5, text: "Batterie de mon Samsung changée rapidement. L'équipe est très professionnelle et sympathique. Merci !", store: "Montpellier Sud", date: "Il y a 1 mois" },
  { id: 3, name: "Sophie M.", rating: 4, text: "Bon accueil, réparation rapide de mon PC portable. Le bonus QualiRépar m'a fait économiser 25€. Super !", store: "Nîmes Étoile", date: "Il y a 3 semaines" }
];

export const FAQ_DATA = [
  { category: "Général", questions: [
    { q: "Quelles marques réparez-vous ?", a: "Nous réparons toutes les marques : Apple, Samsung, Xiaomi, Huawei, Lenovo, HP, Dell, et bien d'autres." },
    { q: "Combien de temps dure une réparation ?", a: "Pour les cas courants (écran, batterie de smartphone), comptez 30 minutes à 1 heure. Pour les PC, 24-48h." },
    { q: "Proposez-vous une garantie ?", a: "Oui, toutes nos réparations sont garanties. La durée dépend du type d'intervention." },
    { q: "Que se passe-t-il si la réparation est impossible ?", a: "Le diagnostic est gratuit. Si nous ne pouvons pas réparer, nous vous le restituons sans frais." }
  ]},
  { category: "QualiRépar", questions: [
    { q: "C'est quoi le label QualiRépar ?", a: "QualiRépar est un label officiel de l'État français qui vous permet de bénéficier d'une aide financière directement déduite de votre facture, jusqu'à 60€ selon l'appareil réparé." },
    { q: "Tous vos magasins sont labellisés ?", a: "Oui, tous nos magasins Repair & Co sont labellisés QualiRépar." }
  ]},
  { category: "Tarifs & Paiement", questions: [
    { q: "Comment sont fixés vos prix ?", a: "Nous établissons un devis gratuit avant toute intervention. Pas de surprise : le prix annoncé est le prix final." },
    { q: "Quels moyens de paiement acceptez-vous ?", a: "Nous acceptons les cartes bancaires, les espèces et le paiement sans contact." }
  ]},
  { category: "Prise de rendez-vous", questions: [
    { q: "Comment prendre rendez-vous ?", a: "Via notre formulaire en ligne, par téléphone, ou directement en magasin." },
    { q: "Puis-je venir sans rendez-vous ?", a: "Absolument ! Nos stands accueillent les clients sans rendez-vous, selon la disponibilité de nos techniciens." }
  ]},
  { category: "Magasins", questions: [
    { q: "Où êtes-vous situés ?", a: "Nous sommes présents dans 9 magasins partout en France : Nîmes, Montpellier, Lattes, Béziers, Boulogne-Billancourt, Plaisir et Les Ulis." },
    { q: "Quels sont vos horaires ?", a: "Nos horaires varient légèrement selon les magasins, généralement du lundi au samedi de 9h30 à 20h." }
  ]}
];

export const DEVICE_BRANDS = {
  smartphone: ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus", "Google Pixel", "Oppo", "Realme", "Vivo", "Sony", "Autre"],
  tablette: ["Apple iPad", "Samsung Galaxy Tab", "Lenovo", "Huawei MediaPad", "Microsoft Surface", "Amazon Fire", "Autre"],
  pc: ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple MacBook", "MSI", "Toshiba", "Samsung", "Autre"],
  electromenager: ["Philips", "Bosch", "Moulinex", "SEB", "Dyson", "Nespresso", "De'Longhi", "Autre"]
};

export const ISSUE_TYPES = {
  smartphone: ["Écran cassé", "Batterie", "Connecteur de charge", "Caméra", "Boutons", "Haut-parleur/Micro", "Autre"],
  tablette: ["Écran fissuré", "Batterie", "Connecteur de charge", "Boutons", "Autre"],
  pc: ["Écran", "Clavier", "Batterie", "Disque dur/SSD", "Système lent", "Virus/Malware", "Autre"],
  electromenager: ["Ne s'allume plus", "Fuite", "Bruit anormal", "Perte de puissance", "Autre"]
};
