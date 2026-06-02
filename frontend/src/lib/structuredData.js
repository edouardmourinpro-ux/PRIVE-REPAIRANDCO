// Structured-data builders (Schema.org JSON-LD) for SEO.
import { STORES } from '../data/stores';

const SITE_URL = 'https://repairandco.fr';

// Global Organization schema — placed on the home page.
export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Repair & Co',
  url: SITE_URL,
  logo: `${SITE_URL}/og-cover.jpg`,
  sameAs: [
    'https://www.facebook.com/repairandco',
    'https://www.instagram.com/repairandco',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+33-4-67-71-67-69',
      contactType: 'customer service',
      areaServed: 'FR',
      availableLanguage: ['French'],
    },
  ],
});

// Build a single LocalBusiness JSON-LD block from a STORE object.
const localBusinessFromStore = (s) => {
  const tel = s.phone ? `+33${s.phone.replace(/\s/g, '').replace(/^0/, '')}` : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    '@id': `${SITE_URL}/magasins#${s.id}`,
    name: s.name,
    image: `${SITE_URL}/og-cover.jpg`,
    url: `${SITE_URL}/magasins`,
    telephone: tel,
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [s.location, s.address].filter(Boolean).join(', '),
      addressLocality: s.city,
      postalCode: s.postalCode,
      addressCountry: 'FR',
    },
    openingHours: 'Mo-Sa 09:30-20:00',
    priceRange: '€€',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.7',
      reviewCount: '120',
    },
  };
};

// All 9 stores as an array of LocalBusiness schemas — used on /magasins.
export const allStoresSchema = () => STORES.map(localBusinessFromStore);

// Generic Service schema — describes the repair service.
export const repairServiceSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Réparation smartphone, tablette et ordinateur',
  provider: {
    '@type': 'Organization',
    name: 'Repair & Co',
    url: SITE_URL,
  },
  areaServed: {
    '@type': 'AdministrativeArea',
    name: 'Occitanie',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Services de réparation',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Réparation écran smartphone' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Remplacement batterie smartphone' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Réparation tablette' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Réparation PC / Mac' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rachat smartphone occasion' } },
    ],
  },
});

// FAQPage schema — pass an array of {question, answer} objects.
export const faqSchema = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({
    '@type': 'Question',
    name: it.question,
    acceptedAnswer: { '@type': 'Answer', text: it.answer },
  })),
});

// Breadcrumb helper — pass [{name, path}, ...] ordered from root to current.
export const breadcrumbSchema = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});
