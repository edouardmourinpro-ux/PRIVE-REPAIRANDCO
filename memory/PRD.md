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

## Charte graphique (Mise à jour DA - Session 4)
| Élément | Couleur | Code |
|---|---|---|
| Texte principal (titres H1/H2/H3, body, paragraphes) | Noir | `#111111` |
| Mots mis en avant / accents dans les titres | Vert foncé | `#005157` |
| Boutons principaux (CTA) | Fond vert foncé + texte blanc | `#005157` / `#FFFFFF` |
| Boutons secondaires | Contour vert foncé + texte vert foncé | `#005157` |
| Fonds de sections douces | Bleu clair désaturé | `#86cbd4` / `#e8f5f5` |
| Backgrounds neutres | Blanc / gris clair | `#FFFFFF` / `#F5F5F5` |
| Icônes, pictos, check marks | Vert foncé | `#005157` |

**Règles clés :**
- `#86cbd4` sert UNIQUEMENT pour les fonds de sections, backgrounds de cards, éléments décoratifs (logo `&`), et sur fonds sombres
- `#86cbd4` n'est JAMAIS utilisé comme accent texte sur fond clair
- **PAS DE ROUGE** dans la charte
- Titres en noir `#111111` avec mots-clés en vert `#005157`

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

## Ce qui est MOCK
- Tous les endpoints API retournent un succès sans envoyer d'email
- GA4 non configuré (en attente de l'ID)
- URL de réservation Nîmes Étoile = URL de preview (placeholder)

## Historique des changements
- **Session 1** : MVP complet, toutes les pages, backend mock
- **Session 2** : Réorganisation services en 3 univers, corrections textes QualiRépar
- **Session 3** : Refonte charte graphique (suppression rouge, palette #005157/#86cbd4), renommage "Services Entreprise", fix ancres/scroll, Programme RSE REPAIR, dropdown B2B, garantie 24 mois, séparation footer
- **Session 4** : Mise à jour hiérarchie visuelle — texte principal en noir #111111, vert #005157 réservé aux accents/mots-clés, bleu #86cbd4 uniquement décoratif/backgrounds, icônes en vert

## Backlog / Tâches restantes
### P1
- Google Analytics (GA4) — en attente de l'ID du client
- Brochure PDF B2B — placeholder actuel
- Intégration email réelle pour les formulaires

### P2
- URL RDV Nîmes Étoile → variable d'environnement
- SEO avancé (Schema.org, sitemap)
- Google Maps API key en .env
