const content = `# Politique de gestion des cookies

_Dernière mise à jour : 3 juin 2026_

Cette politique explique comment le site **repairandco.fr** utilise les cookies et traceurs, et comment vous pouvez les paramétrer.

Elle complète notre [Politique de confidentialité](./politique-confidentialite.md) et est conforme à la directive ePrivacy ainsi qu'aux recommandations de la CNIL.

---

## 1. Qu'est-ce qu'un cookie ?

Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) lorsque vous visitez un site web. Il permet au site de mémoriser des informations sur votre visite (par exemple votre langue, votre panier, ou votre statut de connexion).

D'autres technologies similaires (pixels, balises web, local storage…) peuvent être utilisées et sont également couvertes par la présente politique.

## 2. Cookies utilisés sur repairandco.fr

### 2.1 Cookies strictement nécessaires (sans consentement)

Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas être désactivés.

| Cookie | Finalité | Durée |
|---|---|---|
| Cookie de session | Maintenir votre session de navigation | Le temps de la visite |
| Préférence cookies | Mémoriser votre choix sur la bannière cookies | 6 mois |
| Sécurité (CSRF) | Protection contre les attaques de type cross-site | Le temps de la visite |

Pour l'accès au back-office administrateur (\`/admin\`), un cookie d'authentification JWT est utilisé. Il n'est posé que pour les utilisateurs autorisés.

### 2.2 Cookies de mesure d'audience (Google Analytics)

Le site utilise **Google Analytics** (fourni par Google Ireland Ltd.) pour mesurer l'audience et améliorer la qualité de la navigation. Ces cookies ne sont déposés **qu'après votre consentement explicite** via la bannière affichée à votre première visite.

| Cookie | Finalité | Durée |
|---|---|---|
| \`_ga\` | Distinguer les utilisateurs uniques | 13 mois |
| \`_ga_*\` | Conserver l'état de session | 13 mois |
| \`_gid\` | Distinguer les utilisateurs sur 24h | 24 heures |

Les données collectées sont agrégées et utilisées à des fins statistiques (nombre de visites, pages les plus consultées, durée moyenne de session, origine géographique). Elles peuvent être transférées vers les serveurs de Google, y compris hors Union européenne, dans les conditions prévues par les clauses contractuelles types adoptées par la Commission européenne.

Vous pouvez à tout moment **retirer votre consentement** via le lien "Gérer mes cookies" en bas de page, ou installer le **module de désactivation Google Analytics** : https://tools.google.com/dlpage/gaoptout

### 2.3 Cookies tiers

Aucun cookie tiers de réseaux sociaux ou de publicité n'est déposé sur le site, sauf indication explicite ci-dessus.

## 3. Vos choix et votre consentement

Lors de votre première visite sur le site, une bannière vous informe de l'utilisation de cookies et vous permet :

- d'**accepter** l'ensemble des cookies ;
- de **refuser** les cookies non essentiels (les cookies strictement nécessaires restent posés) ;
- de **personnaliser** vos choix par catégorie.

Votre choix est conservé pendant **6 mois**, après quoi la bannière sera de nouveau affichée.

Vous pouvez à tout moment modifier vos préférences en cliquant sur le lien **"Gérer mes cookies"** présent en bas de page du site.

## 4. Comment désactiver les cookies depuis votre navigateur

Vous pouvez également désactiver les cookies directement depuis les paramètres de votre navigateur :

- **Google Chrome** : Paramètres → Confidentialité et sécurité → Cookies et autres données des sites
- **Mozilla Firefox** : Paramètres → Vie privée et sécurité → Cookies et données de sites
- **Safari** : Préférences → Confidentialité → Cookies et données de sites
- **Microsoft Edge** : Paramètres → Cookies et autorisations de site

Attention : la désactivation de certains cookies peut affecter le bon fonctionnement du site.

## 5. Pour en savoir plus

- Site de la CNIL sur les cookies : https://www.cnil.fr/fr/cookies-et-autres-traceurs
- Outil de désactivation Google Analytics : https://tools.google.com/dlpage/gaoptout

## 6. Contact

Pour toute question relative à cette politique :
- **Email** : contact@repair-and-co.fr (objet : *Cookies*)

## 7. Modifications

Cette politique peut être modifiée à tout moment. La date de dernière mise à jour figure en haut du document.
`;
export default content;
