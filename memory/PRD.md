# Repair & Co — PRD (Product Requirements Document)

## Problème original
Créer un site web complet et professionnel pour **Repair & Co**, une marque de réparation électronique située dans des centres commerciaux du Sud de la France (Nîmes, Montpellier, Béziers).

## Architecture technique
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) — endpoints mock pour formulaires
- **Base de données** : MongoDB (non utilisé activement)
- **Preview** : https://repair-south-france.preview.emergentagent.com

## Charte graphique (Mise à jour DA - Session 4+5)

### Fond clair (blanc, gris, #e8f5f5)
| Élément | Couleur | Code |
|---|---|---|
| Texte principal (H1/H2/H3, body) | Noir | `#111111` |
| Mots accents dans titres | Vert foncé | `#005157` |
| Boutons CTA | Fond vert + texte blanc | `#005157` / `#FFFFFF` |
| Boutons secondaires | Contour vert + texte vert | `#005157` |
| Icônes, checkmarks, étoiles | Vert foncé | `#005157` |
| Fonds de sections | Bleu clair | `#86cbd4` / `#e8f5f5` |

### Fond foncé (#005157, #003d42)
| Élément | Couleur | Code |
|---|---|---|
| Texte principal | Blanc | `#FFFFFF` |
| Texte secondaire | Blanc cassé | `#FFFFFF/80` |
| Accents / liens | Bleu clair | `#86cbd4` |
| Icônes | Blanc ou bleu clair | `#FFFFFF` / `#86cbd4` |

**PAS DE ROUGE** dans la charte.

## Pages (10)
Accueil, Services, Magasins, Devis, Rendez-vous, Boutique/Rachat, Services Entreprise, Qui sommes-nous, FAQ, Contact

## Ce qui est MOCK
- Endpoints API formulaires (retournent succès sans email)
- GA4 non configuré
- URL RDV Nîmes Étoile = placeholder

## Historique
- **Session 1** : MVP complet
- **Session 2** : Réorganisation 3 univers, QualiRépar
- **Session 3** : Refonte couleurs, "Services Entreprise", Programme RSE, footer séparé
- **Session 4** : Hiérarchie visuelle noir/vert, icônes vert foncé
- **Session 5** : Contraste footer (text-white), fix overflow mobile (/devis step bar), suppression doublon CTA Services, responsive 375px validé

## Backlog
### P1
- Google Analytics (GA4) — en attente ID
- Brochure PDF B2B
- Intégration email formulaires

### P2
- URL RDV Nîmes → .env
- SEO avancé (Schema.org, sitemap)
- Google Maps API key en .env
