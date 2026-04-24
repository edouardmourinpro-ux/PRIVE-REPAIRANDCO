# Repair & Co — PRD

## Architecture
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) — mock endpoints
- **Preview** : https://repair-south-france.preview.emergentagent.com

## Charte graphique V3 (pop)
| Élément | Couleur | Code |
|---|---|---|
| Titres / texte principal | Vert foncé | `#005157` |
| Accents dans titres | Vert vif | `#22c55e` |
| Boutons CTA | Fond `#005157` + texte blanc | |
| Boutons secondaires | Contour `#005157` | |
| Fonds sections | Blanc / `#e8f5f5` | |
| Sur fond foncé | Blanc, accents `#86cbd4` | |
| Étoiles / ratings | Vert vif `#22c55e` | |
| PAS DE ROUGE | | |

## Magasins (9)
Lattes, Montpellier Nord, Montpellier Sud, Nîmes Costières, Nîmes Étoile, Béziers, Boulogne, Plaisir, Les Ulis

## Pages (10)
Accueil, Services, Magasins (9 stores), Devis, RDV, Boutique/Rachat, Services Entreprise, Qui sommes-nous, FAQ, Contact

## Ce qui est MOCK
- Endpoints formulaires (succès sans email)
- GA4 non configuré
- URL RDV Nîmes = placeholder

## Historique
- **S1** : MVP complet
- **S2** : 3 univers services, QualiRépar
- **S3** : Couleurs #005157/#86cbd4, "Services Entreprise", Programme RSE
- **S4** : Hiérarchie noir #111111 (annulée en S5)
- **S5** : Contraste footer, responsive mobile
- **S6 (actuelle)** : DA pop (#005157 + #22c55e), QualiRepar 80€, prix univers, 9 magasins France, footer sans CTA banner, About implantations détaillées

## Backlog
- P1 : GA4 (en attente ID), Brochure PDF B2B, Intégration email formulaires
- P2 : URL RDV → .env, SEO Schema.org/sitemap
