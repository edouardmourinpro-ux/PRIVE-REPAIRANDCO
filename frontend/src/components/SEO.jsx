import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://repairandco.fr';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

/**
 * Reusable SEO component — sets title, meta description, canonical, Open Graph,
 * Twitter Card and optionally a JSON-LD structured data block.
 *
 * Usage:
 *   <SEO
 *     title="Réparation smartphone à Lattes"
 *     description="…"
 *     path="/magasins"
 *     jsonLd={[{...}, {...}]}
 *   />
 */
export const SEO = ({
  title,
  description,
  path = '',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  jsonLd,
  noindex = false,
}) => {
  const fullTitle = title
    ? `${title} | Repair & Co`
    : 'Repair & Co — Réparation smartphone, tablette et PC | Nîmes, Montpellier, Béziers';
  const fullDescription =
    description ||
    "Repair & Co : réparation rapide de smartphones, tablettes et PC à Nîmes, Montpellier, Pérols et Béziers. Devis gratuit, label QualiRépar, entre 15 et 80€ d'aide de l'État.";
  const url = `${SITE_URL}${path}`;
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="Repair & Co" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD structured data */}
      {structuredData.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
