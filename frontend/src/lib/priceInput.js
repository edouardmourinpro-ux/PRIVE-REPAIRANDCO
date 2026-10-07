// Prix annoncé — chiffres uniquement, un seul séparateur de centimes (, ou .),
// 6 caractères max. Utilisé à la fois sur la ligne de demande et dans la
// fenêtre d'appel (étape "Prix annoncé"). Filtre aussi bien la frappe que le collage.
export const sanitizePriceInput = (raw) => {
  if (!raw) return '';
  let result = '';
  let sepUsed = false;
  for (const ch of raw) {
    if (result.length >= 6) break;
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if ((ch === ',' || ch === '.') && !sepUsed) {
      result += ch;
      sepUsed = true;
    }
  }
  return result;
};
