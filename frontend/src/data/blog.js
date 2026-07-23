import PrixReparationEcranIphone from '../content/articles/PrixReparationEcranIphone';

// Blog articles registry. Adding a new article = adding an entry here.
// Each article exports its React content component + metadata.
export const ARTICLES = [
  PrixReparationEcranIphone,
];

export const findArticle = (slug) => ARTICLES.find((a) => a.slug === slug) || null;
