import { STORES } from '../data/stores';

// Texte de relance client (email/WhatsApp) — partagé entre la fiche de
// demande et le journal d'appel (flux "Pas de réponse"), zéro duplication.
const getPrenom = (item) => item.first_name || (item.name || '').split(' ')[0] || '';
const getNom = (item) => item.name || item.last_name || '';
const getStore = (item) => STORES.find(s => s.id === item.store) || null;
// `getStore(item).name` contient déjà "Repair&Co" (ex: "Repair&Co Lattes") —
// ne jamais préfixer à nouveau "Repair & Co" dans la signature.
const getStoreName = (item) => {
  if (item.store === 'test') return 'Repair&Co TEST';
  return getStore(item)?.name || item.store || '';
};
const getStorePhone = (item) => {
  if (item.store === 'test') return item.phone || '00 00 00 00 00';
  return getStore(item)?.phone || '04 67 71 67 69';
};

export const buildRelanceText = (item) => {
  const prenom = getPrenom(item);
  const nom = getNom(item);
  const storeName = getStoreName(item);
  const storePhone = getStorePhone(item);
  return (
    `Bonjour ${prenom} ${nom},\n\n` +
    `Nous avons bien pris en compte votre demande de réparation.\n\n` +
    `Afin de vous répondre le plus finement possible, nous aurions besoin de vous poser quelques questions techniques.\n\n` +
    `Pourriez-vous nous rappeler s'il vous plaît ? Toute l'équipe sera à votre disposition au ${storePhone}.\n\n` +
    `À l'aide de ces précisions, nous vous indiquerons le prix le plus juste, en tenant compte notamment :\n` +
    `- Des pièces les plus adaptées,\n` +
    `- De la réduction Qualirepar pour laquelle nous sommes labellisés 💪.\n\n` +
    `Bon à savoir aussi : un paiement en 3 ou 4 fois vous sera proposé.\n\n` +
    `À très bientôt,\n` +
    `L'équipe ${storeName}`
  );
};

export const getRelanceMailtoUrl = (item) => {
  const subject = encodeURIComponent('Votre demande de réparation chez Repair & Co');
  const body = encodeURIComponent(buildRelanceText(item));
  return `mailto:${item.email}?subject=${subject}&body=${body}`;
};

export const getRelanceWaUrl = (item) => {
  const phone = (item.phone || '').replace(/[\s\-().]/g, '').replace(/^0/, '33');
  const text = encodeURIComponent(buildRelanceText(item));
  return `https://wa.me/${phone}?text=${text}`;
};

// Numéro mobile FR (06/07) = seul type sur lequel un SMS peut partir.
export const isFrenchMobilePhone = (phone) => {
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('0') && digits.length === 10 ? '33' + digits.slice(1) : digits;
  return normalized.startsWith('336') || normalized.startsWith('337');
};
