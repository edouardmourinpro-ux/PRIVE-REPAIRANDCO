# Repair & Co — PRD

## Architecture
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) + MongoDB
- **Preview** : https://repair-south-france.preview.emergentagent.com
- **Production** : https://repairandco.fr (deployed by user)

## Charte graphique officielle
| Rôle | Couleur | Code |
|---|---|---|
| Vert foncé (logo, titres, boutons, nav) | Vert forêt | `#1A5C3A` |
| Fond sections alternées | Vert menthe pâle | `#E8F5EE` |
| Accent (mots-clés, icônes, hover) | Vert vif | `#2ECC71` |
| Fond cards, sections claires | Blanc | `#FFFFFF` |
| Texte principal (body) | Bleu nuit | `#1A1A2E` |

## Pictos personnalisés
- Smartphone, Machine à café, Trottinette, Ordinateur, Gaming, Vélo électrique
- V3 logos groupés (RDV page)

## QualiRépar : 60€ (15-60€)

## 9 Magasins
Lattes, Montpellier Nord/Sud, Nîmes Costières/Étoile, Béziers, Boulogne, Plaisir, Les Ulis

## Contact B2B
04 67 71 67 69 / contact@repair-and-co.fr

## Intégrations 3rd party
- **SMTP** o2switch (notifications email)
- **UltraMsg** WhatsApp API (notifications instantanées par magasin, 9 numéros mappés)
- **JWT** auth (admin)

## Admin Mini-CRM (S9 — 08/05/2026)
- Login JWT — `/admin` — credentials dans `test_credentials.md`
- **Bandeau KPI** : CA total (Réparé), Réparations, Panier moyen, Total demandes
- **Filtre magasin** (9 magasins + Tous)
- **Tabs** : Devis, Contact/RDV, Entreprise, Rachat (avec compteurs)
- **Statuts par demande** : Nouveau, Contacté, RDV Fixé, Réparé, Annulé
- **Champ CA €** : apparaît uniquement quand statut = Réparé, sauvegarde au blur
- **Export CSV** : par catégorie, avec BOM UTF-8 + filtre magasin appliqué
- WhatsApp : template inclut date/heure de soumission

## API Endpoints (Admin)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/stats?store=`
- `GET /api/admin/demandes/{category}?store=` (devis|contact|entreprise|rachat)
- `PATCH /api/admin/demandes/{category}/{id}/status`
- `PATCH /api/admin/demandes/{category}/{id}/ca`
- `GET /api/admin/demandes/{category}/export?store=`

## API Endpoints (Public)
- `POST /api/quote`, `/api/contact`, `/api/buyback`, `/api/b2b`

## Schéma MongoDB
Chaque demande : `id, created_at, status (default 'nouveau'), ca (default 0), type, ...fields`
- `demandes_devis`, `demandes_contact`, `demandes_entreprise`, `demandes_rachat`, `admin_users`

## Historique
- S1-S6 : Foundation
- S7 : Palette officielle #1A5C3A/#2ECC71/#E8F5EE
- S8 (V4) : QualiRépar 60€, pictos personnalisés, page RDV refonte
- **S9 (08/05/2026)** : Mini-CRM Admin complet (KPIs, filtres, statuts, CA, export CSV) + WhatsApp UltraMsg avec date/heure. Tests : 100% (37/37). Voir `test_reports/iteration_8.json`

## Backlog
- **P1** : Google Analytics GA4 (en attente ID utilisateur)
- **P1** : Upload/téléchargement PDF brochure B2B
- **P2** : URL admin/RDV → .env (hardcoding restant dans certains fichiers frontend)
- **P2** : SEO Schema.org structuré
- **P3** : (Suggestion) Notification push admin temps-réel quand nouvelle demande arrive
