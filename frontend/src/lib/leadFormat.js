// Formatage partagé des leads (fiche admin + onglet "À appeler") — ne pas dupliquer.
export const DEVICE_TYPE_LABELS = {
  smartphone: 'Smartphone',
  tablette: 'Tablette',
  pc: 'PC',
  electromenager: 'Électroménager',
  'velo-trottinette': 'Vélo / Trottinette',
  autre: 'Autre',
};

// Parse legacy RDV message blob (created by AppointmentPage before structured fields existed)
export const parseRdvMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return {};
  const lines = msg.split('\n');
  const out = {};
  const free = [];
  const map = { 'Type': 'device_type', 'Marque': 'brand', 'Modèle': 'model', 'Panne': 'issue', 'Date': 'date', 'Créneau': 'slot' };
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m && map[m[1].trim()]) {
      const v = m[2].trim();
      if (v && v !== '-') out[map[m[1].trim()]] = v;
    } else if (line.trim()) {
      free.push(line);
    }
  }
  out.free = free.join('\n').trim();
  return out;
};

export const formatLeadTitle = (item, type) => {
  // Affichage admin : priorité au NOM (name / last_name). Prénom réservé aux relances.
  const nom = item.name || item.last_name || item.first_name || '';

  if (type === 'devis') {
    const appareil = [item.brand, item.model].filter(Boolean).join(' ') || DEVICE_TYPE_LABELS[item.device_type] || item.device_type || '';
    return [nom, appareil].filter(Boolean).join(' / ');
  }
  if (type === 'contact') {
    const isRdv = (item.subject || '').startsWith('RDV') || item.rdv_device_type || item.rdv_brand;
    if (isRdv) {
      const legacy = parseRdvMessage(item.message);
      const appareil = [item.rdv_brand || legacy.brand, item.rdv_model || legacy.model].filter(Boolean).join(' ')
        || DEVICE_TYPE_LABELS[item.rdv_device_type || legacy.device_type] || '';
      const rdvDate = item.rdv_date || legacy.date || '';
      return [nom, appareil, rdvDate].filter(Boolean).join(' / ');
    }
    return [nom, item.subject || ''].filter(Boolean).join(' / ');
  }
  if (type === 'entreprise') {
    const nomEntreprise = item.last_name || item.first_name || '';
    return [nomEntreprise, item.company].filter(Boolean).join(' / ');
  }
  if (type === 'rachat') {
    const appareil = [item.brand, item.model].filter(Boolean).join(' ') || '';
    return [nom, appareil].filter(Boolean).join(' / ');
  }
  return nom || item.id;
};

// SMS de confirmation réellement parti au client (jamais une promesse en l'air)
export const clientSmsInfo = (item) => {
  const sent = (item.client_sms || []).find(e => e.kind === 'client_confirmation' && e.status === 'sent');
  const digits = (item.phone || '').replace(/\D/g, '');
  const fixe = digits.length === 10 && !['06', '07'].includes(digits.slice(0, 2));
  return { at: sent ? new Date(sent.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null, fixe };
};
