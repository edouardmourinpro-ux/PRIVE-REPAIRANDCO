// Structured-data builders (Schema.org JSON-LD) for SEO.
import { STORES } from '../data/stores';

const SITE_URL = 'https://repairandco.fr';

// Per-store opening hours (Mo-Sa) — used by allStoresSchema.
const STORE_HOURS = {
  'lattes': { opens: '09:30', closes: '20:00' },
  'montpellier-nord': { opens: '09:30', closes: '20:00' },
  'montpellier-sud': { opens: '09:30', closes: '20:00' },
  'nimes-costieres': { opens: '09:30', closes: '20:00' },
  'nimes-etoile': { opens: '09:30', closes: '19:30' },
  'beziers': { opens: '09:30', closes: '19:30' },
  'boulogne': { opens: '10:00', closes: '20:00' },
  'plaisir': { opens: '10:00', closes: '20:00' },
  'les-ulis': { opens: '10:00', closes: '20:00' },
};

const DAYS_MO_SA = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Global Organization schema — placed on the home page.
export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Repair & Co',
  legalName: 'VDMI REPAIR&CO GROUPE',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: 'contact@repair-and-co.fr',
  telephone: '+33467716769',
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
  const h = STORE_HOURS[s.id] || { opens: '09:30', closes: '20:00' };
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/magasins#${s.id}`,
    name: s.name,
    image: `${SITE_URL}/og-image.jpg`,
    url: `${SITE_URL}/magasins/${s.id}`,
    telephone: tel,
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [s.location, s.address].filter(Boolean).join(', '),
      addressLocality: s.city,
      postalCode: s.postalCode,
      addressCountry: 'FR',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAYS_MO_SA,
        opens: h.opens,
        closes: h.closes,
      },
    ],
    priceRange: '€€',
  };
};

// Parse the `hours` string ("Lundi–Samedi : 9h30–20h00") into Schema.org openingHours format ("Mo-Sa 09:30-20:00").
const parseHours = (hours = '') => {
  const m = hours.match(/(\d{1,2})h(\d{0,2}).*?(\d{1,2})h(\d{0,2})/);
  if (!m) return 'Mo-Sa 09:30-20:00';
  const [, h1, mn1, h2, mn2] = m;
  const fmt = (h, mn) => `${String(h).padStart(2, '0')}:${(mn || '00').padEnd(2, '0')}`;
  return `Mo-Sa ${fmt(h1, mn1)}-${fmt(h2, mn2)}`;
};

// Full LocalBusiness schema for a single store detail page (richer than allStoresSchema).
export const storeDetailSchema = (s) => {
  const tel = s.phone ? `+33${s.phone.replace(/\s/g, '').replace(/^0/, '')}` : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    '@id': `${SITE_URL}/magasins/${s.id}#localbusiness`,
    name: s.name,
    image: `${SITE_URL}/og-image.jpg`,
    url: `${SITE_URL}/magasins/${s.id}`,
    telephone: tel,
    email: s.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [s.location, s.address].filter(Boolean).join(', '),
      addressLocality: s.city,
      postalCode: s.postalCode,
      addressCountry: 'FR',
    },
    openingHours: parseHours(s.hours),
    priceRange: '€€',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.7',
      reviewCount: '120',
    },
    hasMap: s.mapsUrl,
    sameAs: s.mapsUrl ? [s.mapsUrl] : [],
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
