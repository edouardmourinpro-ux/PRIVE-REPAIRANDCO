export const STORES = [
  {
    id: "nimes-etoile",
    name: "Nîmes Étoile",
    address: "116 Rue André Dupont, Entrée 4",
    city: "Nîmes",
    postalCode: "30900",
    location: "Carrefour Nîmes Étoile",
    phone: "04 66 84 80 79",
    whatsapp: "33466848079",
    hours: "Lundi–Samedi : 9h30–19h30",
    rating: 4.7,
    reviewsCount: 225,
    qualirepar: true,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=116+Rue+André+Dupont+30900+Nîmes",
    testimonial: {
      text: "Écran de mon iPhone réparé en 45 minutes ! Service impeccable et prix très correct.",
      author: "Marie L."
    }
  },
  {
    id: "nimes-cap-costieres",
    name: "Nîmes Cap Costières",
    address: "Impasse de Rousellas, CC La Galerie",
    city: "Nîmes",
    postalCode: "30900",
    location: "CC La Galerie",
    phone: "04 48 19 14 09",
    whatsapp: "33448191409",
    hours: "Lundi–Samedi : 9h30–20h00",
    rating: 3.5,
    reviewsCount: null,
    qualirepar: true,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Impasse+de+Rousellas+30900+Nîmes",
    testimonial: {
      text: "Accueil sympathique, réparation de ma tablette effectuée rapidement.",
      author: "Pierre D."
    }
  },
  {
    id: "montpellier-sud",
    name: "Montpellier Sud",
    address: "504 Avenue du Mas d'Argelliers, CC Intermarché",
    city: "Montpellier",
    postalCode: "34070",
    location: "CC Intermarché",
    phone: "04 67 58 81 39",
    whatsapp: "33467588139",
    hours: "Lundi–Samedi : 9h30–20h00",
    rating: 4.1,
    reviewsCount: 283,
    qualirepar: true,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=504+Avenue+du+Mas+d'Argelliers+34070+Montpellier",
    testimonial: {
      text: "Batterie de mon Samsung changée rapidement. L'équipe est très professionnelle !",
      author: "Thomas B."
    }
  },
  {
    id: "perols-lattes",
    name: "Pérols / Lattes",
    address: "CC Grand Sud (Klepierre), Entrée 2",
    city: "Lattes",
    postalCode: "34970",
    location: "CC Grand Sud",
    phone: "06 61 66 03 30",
    whatsapp: "33661660330",
    hours: "Lundi–Samedi : 9h30–20h00",
    rating: null,
    reviewsCount: null,
    qualirepar: true,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Grand+Sud+Lattes",
    testimonial: null
  },
  {
    id: "beziers",
    name: "Béziers",
    address: "Centre Commercial",
    city: "Béziers",
    postalCode: "34500",
    location: "Centre Commercial",
    phone: "06 61 66 03 30",
    whatsapp: "33661660330",
    hours: "Lundi–Samedi : 9h30–20h00",
    rating: null,
    reviewsCount: null,
    qualirepar: true,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Béziers+centre+commercial",
    testimonial: null
  }
];

export const SERVICES = [
  {
    id: "smartphones",
    title: "Smartphones",
    icon: "Smartphone",
    description: "Réparation rapide de tous vos smartphones : écran, batterie, connecteur de charge et plus encore.",
    repairs: [
      "Écran cassé / remplacement de vitre",
      "Batterie (autonomie dégradée)",
      "Connecteur de charge",
      "Caméra avant / arrière",
      "Boutons volume / power",
      "Haut-parleur / micro"
    ],
    brands: ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus", "Google", "Oppo"],
    delay: "30 min à 1h",
    priceFrom: 29
  },
  {
    id: "tablettes",
    title: "Tablettes",
    icon: "Tablet",
    description: "Votre tablette a besoin d'attention ? Nous réparons iPad, Samsung Tab et toutes les marques.",
    repairs: [
      "Écran fissuré / remplacement",
      "Batterie",
      "Connecteur de charge",
      "Boutons et connectique"
    ],
    brands: ["iPad", "Samsung Tab", "Lenovo", "Huawei", "Microsoft Surface"],
    delay: "1h à 2h",
    priceFrom: 39
  },
  {
    id: "pc",
    title: "PC & Ordinateurs",
    icon: "Laptop",
    description: "Portables et fixes, toutes marques. Diagnostic complet et réparation professionnelle.",
    repairs: [
      "Remplacement écran",
      "Clavier",
      "Batterie",
      "Nettoyage / optimisation",
      "Remplacement disque dur / SSD",
      "Réinstallation système"
    ],
    brands: ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple MacBook", "MSI"],
    delay: "24h à 48h",
    priceFrom: 49
  },
  {
    id: "electromenager",
    title: "Petit électroménager",
    icon: "Coffee",
    description: "Cafetières, aspirateurs, grille-pain, mixeurs... On répare aussi vos appareils du quotidien.",
    repairs: [
      "Cafetières",
      "Aspirateurs",
      "Grille-pain",
      "Mixeurs",
      "Diagnostic + réparation sur place"
    ],
    brands: ["Toutes marques"],
    delay: "Selon pièces disponibles",
    priceFrom: null
  }
];

export const REVIEWS = [
  {
    id: 1,
    name: "Marie L.",
    rating: 5,
    text: "Écran de mon iPhone réparé en 45 minutes ! Service impeccable et prix très correct. Je recommande vivement.",
    store: "Nîmes Étoile",
    date: "Il y a 2 semaines"
  },
  {
    id: 2,
    name: "Thomas B.",
    rating: 5,
    text: "Batterie de mon Samsung changée rapidement. L'équipe est très professionnelle et sympathique. Merci !",
    store: "Montpellier Sud",
    date: "Il y a 1 mois"
  },
  {
    id: 3,
    name: "Sophie M.",
    rating: 4,
    text: "Bon accueil, réparation rapide de mon PC portable. Le bonus QualiRépar m'a fait économiser 25€. Super !",
    store: "Nîmes Étoile",
    date: "Il y a 3 semaines"
  }
];

export const FAQ_DATA = [
  {
    category: "Général",
    questions: [
      {
        q: "Quelles marques réparez-vous ?",
        a: "Nous réparons toutes les marques : Apple, Samsung, Xiaomi, Huawei, Lenovo, HP, Dell, et bien d'autres. Que ce soit un smartphone, une tablette ou un PC, nos techniciens sont formés pour intervenir sur tous les appareils."
      },
      {
        q: "Combien de temps dure une réparation ?",
        a: "La durée varie selon le type de réparation. Pour les cas courants (écran, batterie de smartphone), comptez 30 minutes à 1 heure. Pour les PC et réparations plus complexes, cela peut aller jusqu'à 24-48h."
      },
      {
        q: "Proposez-vous une garantie ?",
        a: "Oui, toutes nos réparations sont garanties. La durée de garantie dépend du type d'intervention et des pièces utilisées. Demandez les détails à nos techniciens lors de votre visite."
      },
      {
        q: "Que se passe-t-il si la réparation est impossible ?",
        a: "Le diagnostic est gratuit. Si nous ne pouvons pas réparer votre appareil, nous vous le restituons sans frais et vous conseillons sur les alternatives possibles."
      }
    ]
  },
  {
    category: "QualiRépar",
    questions: [
      {
        q: "C'est quoi le label QualiRépar ?",
        a: "QualiRépar est un label officiel de l'État français qui garantit la qualité des réparations. Il vous permet de bénéficier d'une aide financière directement déduite de votre facture, jusqu'à 50€ selon l'appareil réparé."
      },
      {
        q: "Tous vos magasins sont labellisés ?",
        a: "Oui, tous nos stands Repair & Co sont labellisés QualiRépar. Vous pouvez bénéficier du bonus réparation dans n'importe lequel de nos 5 magasins."
      }
    ]
  },
  {
    category: "Tarifs & Paiement",
    questions: [
      {
        q: "Comment sont fixés vos prix ?",
        a: "Nous établissons un devis gratuit avant toute intervention. Pas de surprise : le prix annoncé est le prix final. Les tarifs dépendent du type d'appareil, de la panne et des pièces nécessaires."
      },
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "Nous acceptons les cartes bancaires, les espèces et le paiement sans contact. Le paiement en plusieurs fois est également disponible pour les réparations plus importantes."
      }
    ]
  },
  {
    category: "Prise de rendez-vous",
    questions: [
      {
        q: "Comment prendre rendez-vous ?",
        a: "Vous pouvez prendre rendez-vous via notre formulaire en ligne sur ce site, ou directement par téléphone. Vous pouvez aussi venir directement en magasin."
      },
      {
        q: "Puis-je venir sans rendez-vous ?",
        a: "Absolument ! Nos stands accueillent les clients sans rendez-vous, selon la disponibilité de nos techniciens. Pour garantir une prise en charge rapide, le rendez-vous reste recommandé."
      }
    ]
  },
  {
    category: "Magasins",
    questions: [
      {
        q: "Où êtes-vous situés ?",
        a: "Nous sommes présents dans 5 centres commerciaux du Sud de la France : Carrefour Nîmes Étoile, CC La Galerie Nîmes, CC Intermarché Montpellier, Grand Sud Lattes, et à Béziers."
      },
      {
        q: "Quels sont vos horaires ?",
        a: "Nos horaires varient légèrement selon les magasins, généralement du lundi au samedi de 9h30 à 19h30 ou 20h. Consultez la page 'Nos Magasins' pour les horaires détaillés de chaque point de vente."
      }
    ]
  }
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
