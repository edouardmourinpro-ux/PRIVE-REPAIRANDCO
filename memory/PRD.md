# Repair & Co — PRD

## Architecture
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) + MongoDB
- **Preview** : https://repair-south-france.preview.emergentagent.com
- **Production** : https://repairandco.fr (deployed by user)

## Charte graphique officielle (5 couleurs uniquement)
| Rôle | Couleur | Code |
|---|---|---|
| Vert foncé (logo, titres, boutons, nav) | Vert forêt | `#1A5C3A` |
| Fond sections alternées | Vert menthe pâle | `#E8F5EE` |
| Accent (mots-clés, icônes, hover) | Vert vif | `#2ECC71` |
| Fond cards, sections claires | Blanc | `#FFFFFF` |
| Texte principal (body) | Bleu nuit | `#1A1A2E` |

## QualiRépar : 60€ (15-60€)

## 9 Magasins
Lattes, Montpellier Nord/Sud, Nîmes Costières (07 57 53 23 89), Nîmes Étoile (04 66 84 80 79), Béziers, Boulogne, Plaisir, Les Ulis

## Contact B2B
04 67 71 67 69 / contact@repair-and-co.fr

## Intégrations 3rd party
- **SMTP** o2switch (notifications email)
- **UltraMsg** WhatsApp API (notifications instantanées par magasin, 9 numéros mappés)
- **JWT** auth (admin)

## Admin Mini-CRM (Phase 1 simplifiée — S10 — 08/05/2026)
- Login JWT — `/admin` — credentials dans `test_credentials.md`
- **Header KPI compact** : `{total} demandes · {n} en attente`
- **Tabs** : Devis, Contact/RDV, Entreprise, Rachat (avec compteurs)
- **Filtre par magasin** (9 magasins + Tous)
- **Statuts simplifiés (3)** : `En attente`, `Pris en charge`, `Closé`
- **Formulaire feedback équipe** : apparaît inline quand statut = `Closé`, 3 textareas (source, opinion site, dislikes)
- **Section "Retour du client"** : visible dans la fiche dépliée si la mini-enquête a été remplie
- **Export CSV** : par catégorie, BOM UTF-8 + filtre magasin appliqué, inclut customer_* et staff_* fields
- WhatsApp template : date/heure + lien admin + "Action sous 15 min"

## Mini-Enquête post-soumission (S10 — 08/05/2026)
Composant `<MiniSurvey>` réutilisable affiché sur les pages de succès des 5 formulaires (Quote, Contact, Appointment, Enterprise, Buyback).
- 2 questions facultatives :
  1. Comment nous avez-vous connus ? (Google, Réseaux sociaux, Bouche à oreille, En passant devant le magasin, Autre)
  2. Un point que vous n'avez pas aimé ou pas compris ?
- Boutons : Envoyer mon retour / Passer
- Stockage : champs `customer_source` + `customer_feedback` sur la demande

## API Endpoints

### Admin (JWT auth)
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/admin/stats?store=` → `{devis, contact, entreprise, rachat, total, en_attente, pris_en_charge, cloture}`
- `GET /api/admin/demandes/{category}?store=` (devis|contact|entreprise|rachat)
- `PATCH /api/admin/demandes/{category}/{id}/status` — accepte `en_attente|pris_en_charge|cloture` (mappe les anciens statuts auto)
- `PATCH /api/admin/demandes/{category}/{id}/feedback` — staff_source, staff_site_opinion, staff_dislikes
- `GET /api/admin/demandes/{category}/export?store=` (CSV)

### Public
- `POST /api/quote`, `/api/contact`, `/api/buyback`, `/api/b2b` → renvoient `{status, id}`
- `POST /api/demandes/{category}/{id}/survey` → enregistre customer_source + customer_feedback

## Schéma MongoDB
Chaque demande :
```
id, created_at, status (en_attente | pris_en_charge | cloture), type,
... fields métier ...
customer_source, customer_feedback,        # mini-enquête client
staff_source, staff_site_opinion, staff_dislikes  # feedback équipe (post-clôture)
```
Collections : `demandes_devis`, `demandes_contact`, `demandes_entreprise`, `demandes_rachat`, `admin_users`

## Migration auto au démarrage
Convertit anciens statuts → simplifiés :
- `nouveau`, `pending`, manquant → `en_attente`
- `contacte`, `rdv_fixe` → `pris_en_charge`
- `repare`, `annule` → `cloture`

## Historique
- S1-S6 : Foundation
- S7 : Palette officielle
- S8 (V4) : QualiRépar 60€, pictos personnalisés, page RDV refonte
- S9 (06/05/2026) : Mini-CRM Admin v1 (KPIs, CA, 5 statuts) — *remplacé par S10*
- **S10 (08/05/2026)** : Phase 1 simplification (3 statuts seulement, KPI/CA supprimés, feedback équipe inline) + Mini-Enquête post-soumission sur les 5 formulaires + Nîmes Costières téléphone corrigé. Tests : 100% (28/28 backend + frontend). Voir `test_reports/iteration_9.json`
- **S10.1 (08/05/2026)** : UX polish — toutes les pages "Demande reçue" mentionnent le bon délai (15 min pour Devis/Contact/RDV ; 24h pour Rachat ; vague pour B2B) ; scroll automatique vers le haut après envoi pour révéler la mini-enquête ; admin /admin → choisir "Closé" ouvre la carte et scrolle vers le formulaire feedback équipe.
- **S10.2 (08/05/2026)** : Email transactionnel refondu (header vert #1A5C3A, sections Informations/Client/Détails, bouton CTA "Ouvrir dans /admin", action 15 min). Email envoyé simultanément avec WhatsApp aux 2 destinataires (`david.m@repairandco.fr` + `edouardmourinpro@gmail.com`). Le endpoint `/api/demandes/{cat}/{id}/survey` envoie un email de suivi quand le client remplit la mini-enquête, incluant les réponses + tous les détails de la demande.

## Backlog
- **P1** : Google Analytics GA4 (en attente ID utilisateur)
- **P1** : Upload/téléchargement PDF brochure B2B
- **P2** : URL admin → .env (hardcoding restant)
- **P2** : SEO Schema.org structuré
- **P3** : Notification push admin temps-réel quand nouvelle demande arrive (toast sonore navigateur)
- **P3** : Permettre de vider un champ `staff_*` (actuellement le PATCH ne traite pas les chaînes vides comme reset)
