# Repair & Co — PRD (Product Requirements Document)

## Problème original
Créer un site web complet et professionnel pour **Repair & Co**, une marque de réparation électronique située dans des centres commerciaux du Sud de la France (Nîmes, Montpellier, Béziers).

## Personas
- **Particuliers** : Propriétaires de smartphones, tablettes, PC, petit électroménager, vélos/trottinettes électriques
- **Entreprises** : Gestionnaires de flottes mobiles/informatiques, responsables RSE
- **Collaborateurs** : Bénéficiaires du programme RSE REPAIR

## Architecture technique
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) — endpoints mock pour formulaires
- **Base de données** : MongoDB (non utilisé activement pour l'instant)
- **Hébergement preview** : https://repair-south-france.preview.emergentagent.com

## Charte graphique
- **Couleur principale** : `#005157` (vert foncé / teal)
- **Couleur secondaire** : `#86cbd4` (bleu clair)
- **Fond clair** : `#e8f5f5` (mint)
- **Neutres** : blanc, gris
- **PAS DE ROUGE** dans la charte

## Pages implémentées
1. **Accueil** — Hero, métriques, QualiRépar, services (3 univers), magasins, avis, boutique, B2B
2. **Services** — 3 univers (SMART & CONNECT, HOME, MOBILITY) avec tarifs
3. **Magasins** — Liste des 5 magasins avec cartes, itinéraire, WhatsApp
4. **Devis** — Formulaire multi-étapes (appareil > marque > problème > coordonnées)
5. **Rendez-vous** — Dropdown magasin + réservation Nîmes Étoile + formulaire autres
6. **Boutique/Rachat** — Vente appareil + achat reconditionné (garantie 24 mois)
7. **Services Entreprise** — Nav interne, solutions adaptées, Programme RSE REPAIR, formulaire B2B
8. **Qui sommes-nous** — Texte complet ESS, QualiRépar, équipe, implantations
9. **FAQ** — Accordéon par catégorie
10. **Contact** — Formulaire + liste magasins

## Fonctionnalités clés
- Formulaires envoyés via API (stockage à ajouter, emails à configurer)
- Google Maps embeds sur page magasins
- ScrollToTop avec support hash navigation
- Cookie banner
- SEO basique (Helmet)

## Ce qui est MOCK
- Tous les endpoints API (/api/quote, /api/contact, /api/buyback, /api/b2b) retournent un succès sans envoyer d'email
- GA4 non configuré (en attente de l'ID)
- URL de réservation Nîmes Étoile = URL de preview (placeholder)

## Historique des changements
- **Session 1** : MVP complet, toutes les pages, backend mock
- **Session 2** : Réorganisation services en 3 univers, corrections textes QualiRépar
- **Session 3 (actuelle)** : Refonte complète charte graphique, renommage "Offre Entreprise" → "Services Entreprise", fix ancres/scroll, mises à jour textuelles sur toutes les pages, Programme RSE REPAIR, dropdown type de besoin B2B, dropdown magasin RDV, garantie 24 mois boutique, séparation visuelle footer

## Backlog / Tâches restantes
### P1
- Google Analytics (GA4) — en attente de l'ID du client
- Brochure PDF B2B — placeholder actuel
- Intégration email réelle pour les formulaires (SendGrid, Resend, etc.)

### P2
- URL RDV Nîmes Étoile → variable d'environnement
- SEO avancé (Schema.org, sitemap)
- Google Maps API key en .env
