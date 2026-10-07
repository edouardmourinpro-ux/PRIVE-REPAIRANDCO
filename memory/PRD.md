# Repair & Co — PRD

> **MAJ 23/07/2026 (v6) — Blog SEO** :
> - Section blog data-driven créée : `/blog` (index en cartes) + `/blog/:slug` (article, template `BlogArticlePage`).
> - Ajouter un futur article = ajouter une entrée dans `/app/frontend/src/data/blog.js` (import du composant contenu depuis `content/articles/`).
> - 1er article publié : « Prix réparation écran iPhone 2026 : le guide par modèle » (slug `prix-reparation-ecran-iphone`). Contenu React (pas de markdown runtime) : `content/articles/PrixReparationEcranIphone.jsx` — hero, callout "L'essentiel", tableau de prix responsive, 2 SVG inline (compat clair/sombre via `currentColor`), FAQ accordéon, CTA `/devis` + `/rendez-vous`, sources externes.
> - **3 JSON-LD** par article injectés en `<head>` via Helmet : `BlogPosting`, `BreadcrumbList`, `FAQPage` (générés dynamiquement depuis les données de l'article).
> - **OpenGraph par page** : `og:type=article` sur l'article (retiré d'`index.html` pour laisser Helmet gérer). `og:image` = hero absolu `https://repairandco.fr/blog/hero.png`.
> - **Aucun lien mort** : liens internes vers routes existantes uniquement (`/services`, `/magasins`, `/devis`, `/rendez-vous`, `/rachat`, `/blog`). Liens externes : `target="_blank" rel="nofollow noopener noreferrer"`.
> - Nav "Blog" ajouté dans le Header (`data-testid="nav-blog"`) et le Footer (`data-testid="footer-blog"`).
> - Image `/public/blog/hero.png` (1200×630) self-hostée.
> - Styles typographiques article dans `index.css` (`.blog-prose`).

> **MAJ 15/07/2026 (v5b) — Filtre magasin persistant + badge périmètre alertes** : storeFilter persisté dans `localStorage.admin_store_filter`. Badge coloré à côté du toggle Alertes indique le magasin ciblé.

> **MAJ 14/07/2026 (v5) — Alertes admin, prix annoncé & routage email 9 magasins** :
> - **Routage email par magasin** : dict `STORE_EMAIL` (9 magasins → email boîte magasin) dans `backend/server.py`. `send_notification()` / `_send_smtp_email()` acceptent `extra_recipients` (dédupliqué). Appliqué aux endpoints `/api/quote`, `/api/contact` (RDV **et** messages), `/api/buyback`. B2B non touché.
> - **Prix annoncé (note interne)** : `PATCH /api/admin/demandes/{category}/{demand_id}/quoted-price` (string libre, vide = reset). Petit input € dans l'en-tête de chaque `DemandCard` (visible même repliée), sauvegarde inline au blur/Enter, ✓ vert éphémère. `data-testid` : `quoted-price-input-{id}`, `quoted-price-saved-{id}`.
> - **Alertes nouveau lead** : `GET /api/admin/latest?store=…` (5 leads récents tous types, projection minimale). Bouton "Activer les alertes" (`data-testid="alerts-toggle-btn"`) OFF / ON / à-réactiver, préférence dans `localStorage`. Polling 20s dès activation, bip Web Audio (2 notes, pas de fichier), notification navigateur (agrégée si multiples), toast `sonner`, préfixe `(nouveau)` sur `document.title` si onglet caché. Respecte `storeFilter`. Arrêt propre sur 401.

> **MAJ 15/06/2026 (v4) — Fondations SEO** :
> - `public/index.html` nettoyé : `lang="fr"`, `theme-color="#1A5C3A"`, favicon/manifest/apple-touch-icon, `<title>` + OG truly-global (og:type, og:locale, og:site_name) + `twitter:card`. Tags **dynamiques** (description, canonical, og:url, og:title, og:description, og:image, twitter:image, twitter:title, twitter:description, robots) retirés du HTML statique pour éviter les doublons avec `react-helmet-async` qui n'écrase pas les meta statiques.
> - `SEO.jsx` : émet désormais 1 seul tag par catégorie (description, canonical, og:*, twitter:*, robots). Default `robots="index, follow"`, `noindex, nofollow` si prop `noindex` true. Évite l'auto-suffixe `| Repair & Co` si le titre le contient déjà.
> - Toutes les pages : `title` + `description` + `path` alignés sur les valeurs exactes du chantier SEO. `AdminPage` ajoute `<SEO noindex />`.
> - `structuredData.js` : Organization enrichie (`legalName`, `email`, `telephone`, `logo: icon-512.png`). `allStoresSchema` : `LocalBusiness` × 9 avec `openingHoursSpecification` **par magasin** (Mo-Sa, horaires réels) et `url: /magasins/{id}`. `FAQPage` toujours généré depuis `FAQ_DATA`.
> - `public/manifest.json` créé (theme `#1A5C3A`, icons `icon-192.png` + `icon-512.png`). `og-image.jpg` créé (copie de `og-cover.jpg`).
> - `robots.txt` + `sitemap.xml` conservés tels quels.

> **MAJ 15/06/2026 (v3)** : Pages légales (Mentions / CGV / Politique de confidentialité / Politique cookies) + Pied de page « Informations légales » + Bandeau cookies CNIL 3 boutons avec 2 catégories. GA4 chargé **uniquement après consentement**. Choix mémorisé 6 mois.

> **MAJ 11/06/2026 (v2)** : Pages de succès optimisées (Devis/RDV/Rachat) — titre "📍 Prise en charge en cours... Restez près de votre téléphone !", message "proximité" dynamique (nom du magasin), **compte à rebours visuel 14:59 + barre de progression animée**, délai harmonisé à 15 min pour TOUS les formulaires (mention "pendant les heures d'ouverture"), bloc d'appel direct avec lien `tel:` cliquable. Composant : `frontend/src/components/SuccessCallout.jsx`. Testé e2e.

## Architecture
- **Frontend** : React + Tailwind CSS + Shadcn UI
- **Backend** : FastAPI (Python) + MongoDB
- **Preview** : https://repair-tech-demo.preview.emergentagent.com
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
- **S10.3 (08/05/2026)** : Harmonisation visuelle /admin — fiches RDV (et Rachat) affichent maintenant les mêmes colonnes structurées que les Devis. AppointmentPage envoie des champs `rdv_*` structurés (device_type, brand, model, issue, date, slot). Parser legacy intégré pour les anciennes fiches RDV stockées avec uniquement le bloc message. Libellés propres ("Bon état" au lieu de "bon", "Smartphone" au lieu de "smartphone").
- **S11 (11/05/2026)** : Admin Phase 2 — Filtre par plage de dates (date_from/date_to) côté backend + UI ; Suppression sécurisée par code (`DELETE_CODE=MOUR1` dans .env) avec modale de confirmation + endpoint `DELETE /admin/demandes/{category}/{id}` ; Renommage "Closé" → "Clôture" ; Titres fiches format `{Prénom} / {Appareil} / {Date RDV}` ; Numéro Montpellier Sud mis à jour (09 82 81 89 34) ; Logs EMAIL améliorés (destinataires visibles dans les logs).
- **S12 (19/05/2026)** : Admin Dashboard — Compteurs dynamiques & Barre de filtre par statut.
  - `/api/admin/stats` accepte désormais `date_from` / `date_to` : tous les compteurs (total, par catégorie, par statut, et nouveau `by_category_status`) reflètent la plage de dates active.
  - `/api/admin/demandes/{category}` accepte un paramètre `status` (nouveau | en_attente | pris_en_charge | cloture | client_perdu | all).
  - `/api/admin/export-all` accepte `status` en plus de `date_from`/`date_to` → CSV unifié filtré sur les 2 dimensions actives.
  - UI : nouvelle **barre de filtre par statut** sous les tabs catégorie, avec compteur exact à droite de chaque pastille (Tous | Nouveau | En attente | Prise en charge | Clôture | Perdu). Couleurs alignées sur les status badges. Les compteurs et la liste se mettent à jour en temps réel quand la plage de dates change.
- **S13 (19/05/2026)** : Google Analytics GA4.
  - Script `gtag.js` ajouté à `/app/frontend/public/index.html` avec measurement ID `G-MBR90KFN90` → toutes les pages sont trackées (page_view automatique).
  - Helper centralisé `/app/frontend/src/lib/analytics.js` exposant `trackFormSubmission(form_type, extra)`.
  - Évènement personnalisé `form_submission` déclenché à chaque soumission réussie des 5 formulaires avec un paramètre `form_type` permettant de les distinguer dans GA4 :
    - `devis` (QuotePage) + `store`, `device_type`
    - `rdv` (AppointmentPage) + `store`, `device_type`
    - `contact` (ContactPage) + `subject`, `store`
    - `rachat` (BuybackPage) + `brand`, `store`, `condition`
    - `b2b` (EnterprisePage) + `fleet_size`, `need_type`
  - Bandeau "Aperçu du Trafic" /admin : **non-implémenté** dans ce sprint (le Service Account Google Cloud n'est pas prêt côté utilisateur). À reprendre quand le JSON sera fourni.
- **S14 (20/05/2026)** : Pipeline CRM refondu — passage de 5 → **6 statuts** avec libellés précis et couleurs sémantiques.
  - Nouveaux statuts (clés DB → labels UI) :
    - `nouveau` → **Nouveau client** (rouge vif, "À traiter")
    - `contacte` → **Client contacté** (orange, "En attente de réponse") ← migration depuis `en_attente`
    - `pris_en_charge` → **Pris en charge** (bleu, "PEC ou Devis effectué")
    - `facture` → **Client Facturé** (vert foncé `#1A5C3A`, "Vente clôturée") ← migration depuis `cloture`
    - `refus_devis` → **Refus devis client** (gris, "Décliné l'offre") — **nouveau**
    - `client_perdu` → **Client Perdu** (gris foncé, "Jamais répondu/venu")
  - `migrate_legacy_statuses()` au démarrage convertit automatiquement `en_attente` → `contacte`, `cloture` → `facture` (aucune donnée perdue).
  - `ALLOWED_STATUSES`, `STATUS_OPTIONS`, `stats.by_category_status` et la barre de filtre par statut alignés sur les 6 nouvelles valeurs.
  - Header `/admin` : "X demandes · Y à traiter" (au lieu de "Y nouveau(x)").
  - L'enclenchement du formulaire feedback équipe a été déplacé de `cloture` vers `facture` (= clôture de vente).

## API Endpoints (mise à jour S14)
- `GET /api/admin/stats?store=&date_from=&date_to=` → `by_category_status: {devis: {nouveau, contacte, pris_en_charge, facture, refus_devis, client_perdu}, ...}`
- `GET /api/admin/demandes/{category}?store=&date_from=&date_to=&status=` (status = all | nouveau | contacte | pris_en_charge | facture | refus_devis | client_perdu)
- `GET /api/admin/export-all?store=&date_from=&date_to=&status=` (CSV unifié)

## Backlog
- **P1** : Google Analytics GA4 (en attente ID utilisateur)
- **P1** : Upload/téléchargement PDF brochure B2B
- **P2** : URL admin → .env (hardcoding restant)
- **P2** : SEO Schema.org structuré
- **P3** : Notification push admin temps-réel quand nouvelle demande arrive (toast sonore navigateur)
- **P3** : Permettre de vider un champ `staff_*` (actuellement le PATCH ne traite pas les chaînes vides comme reset)

## S17 (14/09/2026) — Escalade 3 paliers (15/30/2h) + mode test isolé + fix duplication
- Contexte : 1er passage escalade (14/09 10h32) a envoyé 19 emails pour 9 leads (doublons + tous paliers en rafale sur leads anciens).
- `backend/server.py` : réécriture complète `_run_escalation_once` — 3 paliers (`ESCALATION_TIERS = ["15min","30min","2h"]`), calcul d'âge en **minutes ouvrées** (lun-sam 9h-20h Paris, dimanche fermé) via `_business_minutes_elapsed` (testé unitairement, conforme au spec vendredi/samedi soir).
- **Fix duplication (cause racine)** : `escalations_sent` est désormais réclamé de façon **atomique AVANT l'envoi** (`_claim_tier`, update Mongo conditionnel `$nin`) — élimine tout double-envoi même en cas d'exécutions concurrentes (prouvé via `asyncio.gather` de 2 passages simultanés → un seul email).
- **Détection tardive** : si plusieurs paliers sont atteints d'un coup, seul le plus haut est envoyé, les autres marqués `<palier>:skipped` (pas de rafale).
- **Règle "même personne"** (Plaisir, temporairement Mtp Sud/Nîmes Étoile) : rien envoyé au palier 30min (déjà rappelé à 15min).
- **Migration de grandfathering** (`_migrate_skip_stale_escalations`, idempotente à chaque démarrage) : tout lead réel déjà >2h ouvrées au déploiement voit ses paliers manquants marqués `:skipped` sans envoi — les 9 leads du 14/09 ne re-reçoivent rien.
- **Mode test complet** (`is_test`, magasin technique `"test"` bloqué côté API publique) : tous les envois (nouveau lead + les 3 paliers) routés exclusivement vers `TEST_RECIPIENT_EMAIL`/`TEST_RECIPIENT_SMS` (jamais magasin/RPV/NOTIFY_EMAIL/SUPERVISION_EMAIL). Leads test exclus stats/CSV/digest/health, auto-supprimés après 48h.
- Nouveaux endpoints admin : `POST /admin/notifications/test-lead` (crée un lead is_test, options `same_person`/`accelerated` 1/2/4min), `POST /admin/notifications/digest-test` (digest → TEST_RECIPIENT_EMAIL, `[TEST]`, ne touche aucun lead), `POST /admin/notifications/test` modifié (défaut `real:false` → TEST_RECIPIENT_*, case "Envoyer vraiment au magasin" + confirmation pour le vrai envoi).
- **Fix bug structurel annexe** : `send_email_tracked`/`_notify_lead` utilisaient `_send_smtp_email` qui réinjectait TOUJOURS `NOTIFY_EMAIL` (donc David) même pour un envoi censé être 100% isolé — introduction de `_send_smtp_email_raw(subject, html, recipients)` à liste explicite, sans injection implicite.
- Emails d'escalade corrigés : "Soumis le" = vraie date de création (pas l'heure de l'alerte), ligne "En attente depuis", détails de la demande, "Action requise" différencié par palier (15min: "rappeler maintenant" / 2h: "faire rappeler par le magasin").
- Frontend `/admin` : panneau "Créer un lead de test" (catégorie/same_person/accéléré) + "Digest quotidien" (bouton test) ajoutés à côté de "Tester les notifications" (désormais test-mode par défaut, case double confirmation pour un vrai envoi).
- **SMTP réparé entre-temps** (probablement par l'utilisateur côté o2switch) : les emails partent à nouveau normalement — l'ancien P0 "emails production non reçus" semble résolu.
- Testé (self + testing_agent) : logique d'escalade validée en profondeur via appels Python directs (paliers 1/2/4min accélérés, détection tardive, dédup concurrente, règle même-personne, migration grandfathering) ; UI/API validées via testing_agent, 100% pass, aucun régression sur Béziers/stores/stats/CSV.

 — Remplacement WhatsApp (UltraMsg, compte banni) par SMS (Brevo) + tracking complet
- `backend/server.py` : suppression totale UltraMsg (`ULTRAMSG_*`, `send_whatsapp`, endpoints `push-whatsapp*`). Ajout `BREVO_API_KEY`/`SMS_SENDER`/`SMS_ENABLED` (false par défaut, expéditeur "RepairCo" pas encore validé opérateurs)/`SUPERVISION_EMAIL`.
- `STORE_PRIMARY_SMS` (mobile magasin) + `STORE_ESCALATION_SMS` (RPV) — tables figées fournies par l'utilisateur, aucun numéro ajouté.
- Chaque lead (devis/contact/b2b/rachat) déclenche en tâche de fond `_notify_lead()` : email (NOTIFY_EMAIL + magasin) + SMS primaire, avec 3 tentatives (0/5/15s), résultat persisté dans `notifications[]` + `notify_status` (ok/partial/failed) sur le document.
- Escalade automatique (`_run_escalation_once`, cron 5min, 9h-20h Paris uniquement) : SMS au RPV à 30min (ou email supervision direct si primaire=escalade, ex. Plaisir), email supervision à 2h. Garde `escalations_sent` anti-doublon.
- Digest quotidien 8h Paris (`_send_daily_digest`) + `GET /api/admin/notifications/health` (ok/degraded/down) + `POST /api/admin/notifications/test` (bouton admin, single-attempt rapide).
- `push-sms` (single + rattrapage) remplacent `push-whatsapp*`, même protection par code.
- Frontend `/admin` : pastille `NotifBadge` (🟢/🟠/🔴/—) par lead, filtre "Notification en échec", panneau `NotifTestPanel` (9 magasins).
- Testé via testing_agent (88%→100% après fix) : bug réel trouvé et corrigé — `smtplib.SMTP_SSL` sans `timeout=` provoquait des hangs de 2min/502 ; fix `timeout=10`. Nettoyage code mort résiduel dans `create_buyback`.
- **BLOCAGE CONNU (préexistant, hors périmètre de cette tâche)** : SMTP réel renvoie `535 Incorrect authentication data` — mot de passe `SMTP_PASSWORD` incorrect/expiré chez o2switch. Tant que non corrigé, `notify_status` sera `failed` pour l'email sur TOUS les leads (SMS reste `SMS_ENABLED=false` en attendant validation opérateur du expéditeur "RepairCo"). C'est exactement le problème P0 "emails production non reçus" déjà identifié — désormais VISIBLE dans `/admin` au lieu d'être silencieux.

- Contexte : Béziers fermé pour travaux, continuait de recevoir des leads impossibles à honorer (116 leads / 4 mois, 6960€ de marge perdue).
- `frontend/src/data/stores.js` : ajout `acceptsLeads` (false uniquement sur `beziers`) + export dérivé `LEAD_STORES = STORES.filter(s => s.acceptsLeads !== false)`.
- `QuotePage.jsx`, `AppointmentPage.jsx`, `BuybackPage.jsx`, `ContactPage.jsx` (2 sélecteurs) : `STORES` → `LEAD_STORES` uniquement dans les listes déroulantes de magasin.
- `StoresPage.jsx` (carte Béziers) et `StoreDetailPage.jsx` (`/magasins/beziers`) : bandeau "Fermé pour travaux" piloté par `acceptsLeads === false`, boutons Prendre RDV/Devis gratuit masqués, téléphone toujours visible.
- Aucune régression : `StoresPage`, `AdminPage`, `Footer`, `HomePage`, `FAQPage`, `AboutPage` gardent `STORES` (Béziers toujours visible/filtrable). `sitemap.xml` toujours 19 URLs.
- `backend/server.py` : `CLOSED_STORES = {"beziers"}` + garde-fou HTTP 400 sur `/api/quote`, `/api/buyback`, `/api/contact`, `/api/b2b` (store optionnel pour ces 2 derniers) si `store` est fermé.
- Testé via testing_agent : 100% pass (backend pytest + frontend Playwright), fichier régression `/app/backend/tests/test_beziers_closure.py`.

## S18 (14/09/2026) — Journal d'appel & Historique des statuts
- **Backend** (`server.py`) : chaque lead a désormais `status_history[]`, `first_contact_at`, `assigned_to` (jamais écrasé), `call_attempts[]`, `lost_reason_code`. Migration idempotente au démarrage (`_migrate_call_journal_fields`) : ajoute uniquement l'entrée de création `{status:"nouveau", at:created_at, by:"system"}` sur les leads existants, n'invente aucune date, pose `tracking_since` = date de migration.
- `PATCH /admin/demandes/{category}/{id}/status` exige désormais `by` (identité, 400 si vide) + `lost_reason_code` optionnel (10 codes fixes). Règle **"Injoignable"** bloquée serveur tant qu'il n'y a pas ≥3 appels "pas de réponse" sur ≥2 jours distincts (Paris) — `_unreachable_rule_satisfied`.
- Nouveau `POST /admin/demandes/{category}/{id}/call` : journalise un appel (`joint`/`pas_de_reponse`/`numero_invalide`, détails RDV pris/vient en magasin/devis accepté/à rappeler (+créneau ou date libre)/refus (+motif)). Le **premier appel, quel que soit le résultat, fait passer `nouveau` → `contacte`** (stoppe l'escalade, dont la requête filtre déjà sur `status=="nouveau"`). Jamais de passage auto à `facture`.
- `GET /admin/export-all` : 7 colonnes ajoutées à la fin (ordre figé) : Premier contact le · Délai 1er contact (min ouvrées) · Nb tentatives · Nb messages laissés · Dernier résultat d'appel · Motif de perte (code) · Traité par. Toujours présentes (même vides) via `_annotate_call_journal_export_fields`. `status_history`/`call_attempts`/`tracking_since` bruts jamais exportés. Leads de test toujours exclus.
- **Frontend** (`AdminPage.jsx` + nouveaux `components/admin/IdentityModal.jsx`, `components/admin/CallLogPanel.jsx`, `data/staffIdentities.js`, `data/lostReasons.js`) : popup "Qui êtes-vous ?" (compte partagé, mémorisé dans `localStorage.admin_identity`, lien "changer" permanent dans le header) obligatoire avant tout appel/changement de statut (`requireIdentity`). Bouton "📞 Appel" → panneau 1-2 clics max (aucun texte obligatoire, note facultative repliée, boutons ≥44px, numéro cliquable `tel:`). Compteur "📞 N" sur la carte. Chronologie fusionnée appels + statuts dans la fiche dépliée. Boutons rapides "Passer en Refus devis" / "Passer en perdu — numéro invalide" après un appel Refus/Numéro invalide (jamais automatique). Modale "Client perdu" refaite en puces à motif fixe (Injoignable désactivée tant que règle 3/2j non remplie).
- Rogue leads "TEST — regression" du 14/09 sur Lattes : confirmé absents de la base (aucune trace en DB).
- Testé via testing_agent : 100% backend (13/13 pytest, `/app/backend/tests/test_call_journal.py`) + 100% frontend Playwright. 1 nit de revue corrigée (garantir les 7 colonnes CSV même sur base vierge).
- **Correctifs (14/09/2026, avant republication)** :
  1. Le passage auto `nouveau → contacte` au 1er appel n'apparaissait pas dans la chronologie sans recharger la page (le `logCall` frontend ne poussait que `status`, pas `status_history`). Corrigé.
  2. Bouton "Appeler" (fiche dépliée) : ouvre désormais aussi le panneau Journal d'appel dans le même geste (`tel:` + `requireIdentity(() => setShowCallPanel(true))`), pour qu'il attende le résultat au retour sur l'onglet.
  3. Règle "Injoignable" (3 tentatives/2 jours) : ne s'applique qu'aux leads créés après `tracking_since` du lead — bypassée pour les leads antérieurs à la migration (`_unreachable_rule_satisfied(doc)` compare `created_at` vs `tracking_since`), côté backend ET frontend.
  - Testé via testing_agent (iteration_16) : 100% — nouveau test unitaire `/app/backend/tests/test_unreachable_bypass.py`.

## S19 (15/09/2026) — Onglet « 📞 À appeler »
- Nouvel onglet virtuel, premier onglet de `/admin`, **ouvert par défaut**, agrège les 4 catégories (devis/contact/entreprise/rachat).
- **Backend** : `GET /admin/to-call?store=` (lecture seule) — filtre les leads créés après `tracking_since`, statut hors Pris en charge/Facturé/Refus devis/Perdu, calcule 4 groupes triés (rappel dû > nouveau > relance > injoignable prêt) avec les textes FR exacts (« Rappel prévu à HHhMM », « Nouvelle demande — attend depuis X min », « Relance — Ne appel », « 3 appels sans réponse — classer Injoignable ? »). Réutilise `_business_minutes_elapsed`, `_format_waiting_since`, `_unreachable_rule_satisfied` (aucune duplication). Bug trouvé et corrigé au passage : `POST /admin/notifications/test-lead` ne posait pas les champs S18 (`status_history`/`call_attempts`/`tracking_since`...) — corrigé pour que le Magasin TEST fonctionne avec le nouvel onglet.
- **Frontend** : `ToCallTab.jsx` (nouveau), bouton "Appeler" ouvre le tel: + le journal d'appel en un geste, bouton "Classer Injoignable" en 2 clics (confirmation), mise à jour sans rechargement de page (refetch XHR). Filtre Magasin pré-sélectionné automatiquement si l'identité correspond à une équipe (`STAFF_IDENTITY_STORE_MAP`). Extraction de `formatLeadTitle`/`DEVICE_TYPE_LABELS`/`parseRdvMessage` vers `lib/leadFormat.js` (partagé avec `DemandCard`, zéro duplication).
- **Correctif accessibilité mobile** : l'explication du motif "Injoignable" grisé (modale Client Perdu) est maintenant visible en texte permanent sous le bouton (`{count}/3 appels — ...`), plus seulement au survol.
- **Correctif UX post-test** : ajout de l'option "Magasin TEST" dans le filtre Magasin (invisible auparavant, remonté par testing_agent).
- Testé via testing_agent (iteration_17) : 100% backend (8/8 pytest, `/app/backend/tests/test_to_call.py`) + 100% frontend. Aucune régression sur le Journal d'appel, l'escalade, les notifications ou le CSV (non modifiés).

## S20 (fork actuel) — Refonte serveur du CRM admin (backend uniquement)

Décision explicite utilisateur : backend only cette session, AdminPage.jsx (frontend) **non retouché** et donc temporairement incohérent avec les nouveaux champs — à refaire dans une prochaine session.

### Nouveau modèle de statut — directement piloté par le résultat d'appel
`ALLOWED_STATUSES` = nouveau, pas_de_reponse, a_rappeler, reflechit, devis_accepte, rdv_pris, facture, refus_devis, client_perdu (+ legacy en lecture : contacte, pris_en_charge). Chaque appel loggé via `/call` fixe directement le statut (plus de "1er appel => contacte" automatique) :
- outcome=pas_de_reponse → status=pas_de_reponse (exige 4 questions oui/non : rappel_2e, message_laisse, mail_envoye, message_envoye — chaque "non" exige sa `*_raison`)
- outcome=numero_invalide → status=client_perdu, lost_reason_code=numero_invalide
- outcome=joint, detail=rdv_pris → status=rdv_pris, exige appt_date (AAAA-MM-JJ) + appt_slot (1 des 3 libellés exacts APPT_SLOTS), calcule appt_start_at/appt_end_at (Europe/Paris → UTC), envoie SMS client de confirmation
- outcome=joint, detail=devis_accepte (ou alias legacy vient_magasin) → status=devis_accepte, appt_date seul (fenêtre 9h-20h), SMS client "on vous attend"
- outcome=joint, detail=reflechit → status=reflechit, callback_choice optionnel (défaut: 10h Paris, 2 jours ouvrés), quoted_price optionnel
- outcome=joint, detail=refus → status=refus_devis, exige refus_reason

### Nouveaux endpoints
- `POST /admin/demandes/{cat}/{id}/call` — réécrit entièrement (voir ci-dessus)
- `POST /admin/demandes/{cat}/{id}/passage` — venu/no-show en magasin : venu+facturé→facture ; venu+non facturé→a_rappeler (note obligatoire) ; non venu→a_rappeler (callback obligatoire) ; efface toujours appt_*, journalise dans `passages[]`
- `PATCH /admin/demandes/{cat}/{id}/phone` — corrige le téléphone, protégé par DELETE_CODE, journalise dans `phone_changes[]`
- `GET /admin/to-call` — 9 groupes / 3 sections (maintenant, plus_tard, a_classer) basés sur next_callback_at, call_attempts, appt_end_at — remplace l'ancienne version à 4 groupes
- `GET /admin/transfo` — taux de conversion facturé/total sur 30j glissants (devis+contact+rachat, jamais entreprise)

### B2B hors CRM
`COLLECTIONS` ne contient plus "entreprise" (devis/contact/rachat uniquement) → toutes les routes génériques `/admin/demandes/entreprise/*` renvoient 400. `/api/b2b` archive toujours dans `demandes_entreprise` (visible par script direct uniquement) mais envoie un seul email direct à `B2B_EMAIL` (.env, défaut david.m@repairandco.fr) — plus de SMS, plus de routage magasin, plus d'escalade.

### Isolation du magasin "test"
`store="test"` est maintenant accepté par les formulaires publics (/api/quote, /api/contact, /api/buyback) — avant il était bloqué 400. Toute soumission avec store="test" est auto-flaguée `is_test=True` (exclue de stats/export/digest, pas de sync Hiboutik, email/SMS routés uniquement vers TEST_RECIPIENT_*). Seul "test" bascule ainsi — les magasins fermés (béziers) restent bloqués. `push-sms` single et rattrapage utilisent aussi TEST_RECIPIENT_SMS si is_test.

### SMS client (nouveau, CLIENT_SMS_ENABLED=false par défaut)
SMS de service (jamais promo) au client : à la création (texte différent selon horaire boutique 9h-18h lun-sam) et à la confirmation RDV/passage. 1 SMS par type et par 24h (dédoublonnage via `client_sms[]`). Adresses magasin lues dynamiquement depuis `frontend/src/data/stores.js` (source unique, fonction `_store_address`).

### Tests
`backend/tests/test_s20_refactor.py` (26 tests, nouveau) couvre tout le refactor. `test_call_journal.py`/`test_to_call.py` mis à jour pour le nouveau contrat. `test_escalation_and_test_mode.py`/`test_beziers_closure.py`/`test_sms_notifications.py`/`test_phase1_survey.py` : `store="lattes"` remplacé par `store="test"` partout (fuite d'emails réels corrigée). Suite complète : 86 passed, 2 skipped (hors test_phase1_survey.py, fichier obsolète pré-S14, déjà cassé avant cette session). Validé par testing_agent (iteration_18.json) : 0 issue critique.

### S20 compléments (même session) — toujours backend only
- `POST /admin/demandes/{cat}/{id}/relance` (by, channel email|whatsapp) — journalise dans `relances[]`, renseigne first_contact_at/assigned_to si vides, **ne touche jamais au statut** ni à la position dans "À appeler".
- `GET /admin/stats` → `by_category_status` inclut désormais "entreprise" (détail brut par statut) en plus de devis/contact/rachat, mais Entreprise reste exclu des totaux agrégés (stats.total, stats.entreprise n'existe pas, stats.<statut> racine).
- Entreprise confirmé 100% hors mécanique : aucune escalade 15/30min/2h, aucun rattrapage SMS, uniquement l'email direct à B2B_EMAIL.
- Règle "Injoignable" simplifiée : 6 appels "pas de réponse" (comptage pur, plus de contrainte 2 jours distincts) ; message d'erreur « Il faut 6 appels « Pas de réponse » avant de classer Injoignable. » ; les leads antérieurs à tracking_since restent exemptés.
- Digest 8h : nouvelle ligne "SMS clients : envoyés X / échoués Y" (fenêtre 24h, client_sms[] hors is_test). Nettoyage 48h des leads is_test étendu à demandes_entreprise.
- Tests : `backend/tests/test_s20_complements.py` (8 tests), `test_unreachable_bypass.py` mis à jour pour la règle à 6 appels. Suite complète : 94 passed, 2 skipped. Validé par testing_agent (iteration_19.json) : 0 issue.

### S21 — Ajouts /admin : fenêtre "Quel magasin ?" + bandeau 3 règles (06/10/2026)
Frontend only, rien publié (pas de deploy). N'a pas touché au reste de AdminPage.jsx (toujours sur l'ancien contrat pré-refactor serveur S20 — refonte complète toujours en attente de feu vert).
- `StoreGateModal.jsx` (nouveau) : fenêtre non-fermable (pas de X/Échap/clic extérieur) à chaque connexion réussie (y compris reload avec token existant). 9 boutons magasins (stores.js) + bouton large "Tous les magasins (direction)" + lien discret "Magasin TEST". Choix magasin → identité auto "Équipe <Magasin>" (réutilise STAFF_IDENTITY_STORE_MAP inversé), IdentityModal jamais affichée. "Tous les magasins" → aucun filtre + IdentityModal s'ouvre (désormais filtrée aux seuls prénoms direction via nouvelle prop `options`, les anciennes entrées "Équipe X" ne sont plus proposées nulle part — fixées uniquement par la fenêtre magasin).
- `RulesBanner.jsx` (nouveau) : bandeau permanent fond #1A1A2E sous l'en-tête, "LES 3 RÈGLES" + 3 règles, bouton "Comment faire ?" dépliant 5 cartes, état ouvert/fermé mémorisé (localStorage `admin_howto_expanded`).
- Dropdown "Magasin" du bandeau filtres masqué sur l'onglet "À appeler" uniquement (conservé sur les autres onglets).
- Header : nouveau bouton "🏪 <Magasin> · changer" (rouvre la fenêtre magasin), ajouté en plus du bouton identité existant.
- Vérifié par screenshot (pas testing_agent, scope UI isolé) : gate obligatoire à chaque login/reload, filtre + identité corrects dans les 2 branches, dropdown bien masqué/affiché selon l'onglet, 5 cartes "Comment faire", mobile 390px sans débordement (un éventuel overflow du menu mobile du header public est pré-existant, hors scope).

### S22 — Refonte frontend Admin pour consommer les endpoints S20 (fork précédent)
- `StoreGateModal`/`RulesBanner` conservés. `ToCallTab.jsx` réécrit : 3 sections (maintenant/plus_tard/a_classer) × 9 groupes, badges couleur par groupe, actions dédiées (Appel générique, "Classer Injoignable" (groupe 4), "Classer perdu" + menu motifs (groupe 6), flux Passage "Oui/Non" (groupes 7/8)). Script `backend/scripts/seed_demo_to_call.py` créé pour générer les 9 groupes sur Magasin TEST (nettoie puis recrée). Vérifié par screenshot sur Magasin TEST. **Rien publié**.

### S23 (07/10/2026) — Refonte de la ligne de demande (tous les onglets)
Frontend only, rien publié (pas de deploy) — attente feu vert utilisateur.
- **Nouveau `frontend/src/lib/statusDisplay.js`** : `STATUS_META` (libellé+couleurs par statut du pipeline S20 + legacy), `getStatusDisplay(item)` calcule le texte "prochaine action" affiché sur la ligne (ex: "À rappeler · mar. 6/10 16:15", "RDV mer. 7/10, 17h-19h30", "Passe le mar. 6/10", "Réfléchit · ven. 09/10 10:00"), `FACTURABLE_STATUSES`, `getPreviousStatusBeforeFacture(item)` (lit `status_history` pour retrouver le statut exact avant le dernier passage à `facture`).
- **`DemandCard` (AdminPage.jsx) réécrit** — grille 7 colonnes identique dans tous les onglets ET sous les lignes colorées de "À appeler" : 1) client+appareil+date+tel+email (clic = détails), 2) prix annoncé €, 3) badge statut/prochaine action, 4) case "Facturé" (visible seulement si devis_accepte/rdv_pris/pris_en_charge/facture — cocher → statut facture + ouvre le feedback équipe ; décocher → revient exactement au statut précédent via status_history), 5) nb d'appels, 6) bouton Appel, 7) corbeille.
- **Supprimés** (devenus inatteignables ou explicitement demandés) : dropdown de statut sur la ligne, icône push SMS par demande (+ sa modale, + endpoint frontend `handlePushSMSDemand`), badge `NotifBadge` coloré, modale "Client perdu" à chips (seul déclencheur était le dropdown retiré — le flux Appel/Passage couvre déjà tous les cas de perte).
- **Pastille "Taux de transfo 30 j · X% · Y/Z"** (nouveau state `transfo` + `loadTransfo()`, `GET /api/admin/transfo`) affichée à droite de la ligne des onglets, rafraîchie après chaque changement de statut/appel/passage — bouge en live au cochage/décochage de "Facturé".
- **Tabs restructurés** : seul "À appeler" visible par défaut ; bouton "Toutes les demandes" (état mémorisé `localStorage.admin_tabs_expanded`) déplie Devis/Contact-RDV/Rachat. Plus d'onglet Entreprise. `DateRangePicker` + "Exporter CSV" visibles uniquement hors "À appeler".
- **Pastilles de filtre statut** (Devis/Contact/Rachat) alignées sur le pipeline S20 : Tous · Nouveau · Pas de réponse · À rappeler · Réfléchit · Devis accepté · RDV pris · Facturé · Refus · Perdu, chacune avec son compteur `by_category_status`. Les legacy Contacté/Pris en charge n'apparaissent que si count > 0 pour la catégorie active.
- **Bouton "Rattrapage"** déplacé du header vers une nouvelle carte dans le panneau "Tester les notifications" (`NotifTestPanel`), même modale/code de sécurité.
- **Bug trouvé et corrigé pendant le dev** : `updateStatus()` ne poussait pas localement dans `status_history` (contrairement à `logCall`) → décocher "Facturé" juste après l'avoir cochée retombait sur un statut par défaut (`devis_accepte`) au lieu du vrai statut précédent. Fix : `updateStatus()` pousse maintenant `{status, at, by}` dans `status_history` local, en plus du PATCH serveur.
- Testé via testing_agent (iteration_20.json) : 100% frontend (7/7 groupes de fonctionnalités), aucune régression trouvée (3 sections/9 groupes de "À appeler" toujours fonctionnels avec le nouveau DemandCard dessous). Remarque non bloquante : `stats.total`/pastilles excluent `store=test` par design pré-existant (peut prêter à confusion visuelle sur Magasin TEST, pas un bug de cette session).
- **P0 restant / à valider avec l'utilisateur** : adapter la fenêtre de détails standard pour aussi utiliser `/relance` ; décider du moment de publication (StoreGateModal + RulesBanner + ToCallTab S22 + refonte ligne S23 — rien n'est encore déployé).

### S24 (07/10/2026) — Refonte fenêtre d'Appel + fiche de demande
Frontend + 1 endpoint backend, rien publié (pas de deploy) — attente feu vert utilisateur.
- **`CallLogPanel.jsx` réécrit entièrement** : wizard par étapes (root → joint/pas_de_reponse/numero_invalide). "Client joint" ouvre 4 réponses (Oui devis accepté → prix + Valider/Passer → "Quand vient-il ?" avec date + 3 créneaux + "Sans RDV, il passe dans la journée" ; Pas encore réfléchit → prix → "Quand le relancer ?" ; Pas dispo à rappeler → "Quand le rappeler ?" ; Refus → motifs 1-clic). "Pas de réponse" enchaîne 4 questions Oui/Non séquentielles (rappel 2e fois, message vocal, email avec lien mailto, WhatsApp avec lien wa.me) — un "Non" exige une raison obligatoire avant de continuer, avec le bon titre de constat. Numéro en très grand, **non cliquable** (aucun `tel:`), mention "À composer sur le téléphone du magasin" + ligne SMS conditionnelle. Pré-remplissage date/créneau RDV si la demande vient du formulaire Rendez-vous.
- **Bug "texte inversé" anticipé et évité** : le champ "Pourquoi ? (obligatoire)" est un `<textarea>` inline (pas un sous-composant déclaré dans le parent) — testé en frappe rapide, aucune inversion/saut de curseur.
- **Nouveau `frontend/src/lib/relanceText.js`** : partagé entre la fiche et le CallLogPanel. Bug corrigé : signature "L'équipe Repair & Co Repair&Co Lattes" (doublon) → "L'équipe Repair&Co Lattes".
- **Fiche de demande enrichie** : timeline fusionne status_history + call_attempts (détails riches) + relances + client_sms + passages, triée chronologiquement. Relance Email/WhatsApp tracent via `POST /relance`. Nouveau bouton "Corriger le numéro" (modal + code sécurité).
- **Backend `PATCH /phone`** : validation format FR + auto-requeue (client_perdu/numero_invalide → nouveau après correction).
- **Fix régression testing_agent** : `Layout.jsx` masque Navbar/Footer/CookieBanner publics sur `/admin/*` (fuite d'un `<a href="tel:">` dans le menu mobile).
- Testé : backend 7/7 pytest, frontend 14/15 + 1 régression corrigée et revérifiée. **Rien publié**.
- **P0 restant** : attendre les prochaines consignes précises de l'utilisateur.

### S28 (07/10/2026) — 4 ajustements d'affichage admin (retour maquette)
Frontend (+ 1 endpoint backend pour les libellés), rien publié (l'utilisateur publiera lui-même).
- **En-tête : une seule pastille** : la pastille identité (`👤 ... · changer`) est masquée quand l'identité correspond exactement à l'équipe du magasin choisi (`!storeFilter || !currentIdentity.startsWith('Équipe ')`). Ne reste que `🏪 {magasin} · changer` dans ce cas ; les 2 pastilles restent visibles pour "Tous les magasins" ou une identité prénom (direction).
- **Suppression de tous les tirets longs (—)** dans l'UI admin : en-tête/titre de page, `RulesBanner`, bandeaux "À appeler", fiche détail (timeline d'appels, bouton "Passer en perdu"), toasts, notifications navigateur, panneau de test. Remplacés par virgule/deux-points/parenthèses selon le contexte. Nom de lead de test backend harmonisé aussi ("TEST, ne pas traiter").
- **Libellés exacts des 9 groupes "À appeler"** (`GET /admin/to-call`, server.py) : groupes 1/2/3/4/5/6 réécrits mot pour mot (ex. "Rappel prévu à 09h11 (en retard)", "Nouvelle demande, attend depuis 24 min", "3e appel (pas de réponse le 05/10 à 16h27)", "6 appels sans réponse", "Relance du devis prévue à 17h15" (sans suffixe en retard en section plus tard), "Réfléchit toujours après 2 relances"). Groupes 7/8/9 déjà conformes, inchangés. Toujours suffixé `· {magasin}`, ligne SMS client conservée.
- **Pastille Taux de transfo** : 3 blocs séparés par des espaces (plus de points médians) : libellé gris petit à gauche, pourcentage gros/gras vert foncé au centre, détail `{facturé}/{total}` gris petit à droite.
- Testé via testing_agent (iteration_23.json) : les 4 points comportementaux validés à 100% sur Magasin TEST (seed `seed_demo_to_call.py`). 2 écarts mineurs relevés (em dash résiduel dans `<h1>`/`<SEO title>` de la page admin) → corrigés immédiatement après le rapport, vérifiés par screenshot (titre page + h1 = "Admin Repair&Co" sans tiret).
- **Rien publié/déployé** — l'utilisateur publiera lui-même.

### S27 (07/10/2026) — Politique SMS resserrée : un seul SMS, au client, à la création
Backend only, rien publié/déployé (consigne maintenue — l'utilisateur publiera lui-même).
- **Découplage des interrupteurs** : `SMS_ENABLED` ne gouverne plus QUE les SMS internes (alerte magasin, relances 15min/30min RPV, alerte direction 2h) via `send_sms()`. Le SMS client (`_send_client_sms`, via `_brevo_send_sms_sync` direct) n'a jamais dépendu de `SMS_ENABLED` — confirmé par audit de code, aucun changement nécessaire sur ce point.
- **Nouvel interrupteur `CLIENT_SMS_RDV_ENABLED`** (défaut `false`) : le check `CLIENT_SMS_ENABLED` a été retiré de `_send_client_sms` (mutualisée) et déplacé dans les 2 appelants : `_send_client_creation_sms` vérifie `CLIENT_SMS_ENABLED`, `_send_client_appt_sms` (RDV/passage) vérifie désormais `CLIENT_SMS_RDV_ENABLED` — totalement indépendant, prêt à rallumer en changeant une seule variable.
- **Emails inchangés** : `send_email_tracked`/`_notify_lead`/digest 8h/email Entreprise ne dépendent jamais de `SMS_ENABLED` — confirmé, aucune régression.
- **Valeurs finales (.env)** : `CLIENT_SMS_ENABLED=true`, `SMS_ENABLED=false`, `CLIENT_SMS_RDV_ENABLED=false`.
- **Texte définitif du SMS de création** (révisé une 2e fois à la demande utilisateur — "aujourd'hui" → "dans l'heure" en journée) :
  - Jour (lun-sam 9h-18h Paris) : "Bonjour, Repair&Co {store}. Votre demande est bien arrivée ! On vous rappelle dans l'heure depuis le {tel}. Merci de rester joignable !"
  - Hors horaires : "Bonjour, Repair&Co {store}. Votre demande est bien arrivée ! On vous rappelle dès l'ouverture à 9h depuis le {tel}. Merci de rester joignable !"
  - Règles inchangées : nom court du magasin, téléphone public lu dynamiquement dans `stores.js`, accents limités à `é è à ù`, 1 seul SMS/numéro/24h, jamais pour Entreprise, `TEST_RECIPIENT_SMS` uniquement pour `is_test`. Si >160 car., repli sur "Restez joignable !" (jamais le magasin/tél/adresse/date coupés).
- Vérifié SANS AUCUN ENVOI RÉEL cette fois (à la demande explicite de l'utilisateur) : audit de code confirmant la logique de découplage des interrupteurs inchangée depuis la vérification live de la session précédente (1 seul SMS client / aucun SMS interne / aucun SMS RDV tant que `CLIENT_SMS_RDV_ENABLED=false` — déjà prouvé par curl réel sur Magasin TEST juste avant ce changement de texte) + script `audit_sms_templates.py` (dry-run) réexécuté pour Lattes et Montpellier Nord :
  - Lattes jour : 143 car., GSM-7, 1 segment. Lattes hors horaires : 151 car., GSM-7, 1 segment.
  - Montpellier Nord jour : 153 car., GSM-7, 1 segment. Montpellier Nord hors horaires : 152 car. (formule raccourcie "Restez joignable !"), GSM-7, 1 segment.
- **Rien publié/déployé** — l'utilisateur publiera lui-même.

### S26 (fork actuel) — Refonte des 4 SMS clients (GSM-7 strict)
Backend only, rien publié/déployé (toujours attente du feu vert utilisateur).
- `_strip_accents` ne strip plus tous les accents : garde désormais `é è à ù` tels quels, replie tout le reste (`ô ê î û â ç À É` et tout autre accent) vers sa forme ASCII — toujours pour rester en GSM-7 (160 car./segment) et éviter l'UCS-2 (70 car./segment).
- Nouveau `_store_phone(store_id)` (même pattern que `_store_address`) : lit `frontend/src/data/stores.js` pour injecter le numéro public du magasin dans les 2 SMS de confirmation (pas dans RDV/passage, qui affichent l'adresse à la place).
- 4 textes exacts (validés par l'utilisateur après 3 corrections : "bien arrivée" au lieu de "reçue" (ç interdit), début par "Bonjour", suppression de la répétition "on vous attend") :
  - *Confirmation jour* : "Bonjour, Repair&Co {store}. Votre demande est bien arrivée ! On vous rappelle aujourd'hui depuis le {tel}. Merci de rester joignable !"
  - *Confirmation hors horaires* : idem avec "dès l'ouverture à 9h depuis le {tel}."
  - *RDV avec créneau* : "Bonjour, votre RDV Repair&Co est confirmé le {date} {créneau} au magasin de {store}, {adresse}. On vous attend !"
  - *Passage sans créneau* : "Bonjour, on vous attend le {date} au magasin Repair&Co de {store}, {adresse}."
- Nouveau `_finalize_client_sms(core, closing, closing_short)` : si > 160 car., raccourcit/retire UNIQUEMENT la formule finale de politesse — ne touche jamais magasin/adresse/téléphone/date. Vérifié en pratique : seul "Montpellier Nord hors horaires" bascule sur la formule courte "Restez joignable !" (161→152 car.).
- `_send_client_creation_sms`/call sites (`/api/quote`, `/api/contact`, `/api/buyback`) passent désormais `store_id` au lieu de `store_name` pré-calculé.
- Nouveau script `backend/scripts/audit_sms_templates.py` (dry-run, **aucun SMS envoyé**) : génère les 4 textes × 9 magasins réels, affiche longueur/encodage GSM-7 ou UCS-2/nb de segments/avertissements. Résultat : **100% GSM-7, 1 segment partout, 0 UCS-2**, 1 seul avertissement attendu (formule raccourcie Montpellier Nord).
- Testé via testing_agent (iteration_22.json, scope volontairement limité à cette seule logique sur demande utilisateur pour préserver les crédits) : 47/47 pytest (`backend/tests/test_sms_templates_refactor.py`), aucune régression sur `/api/quote`/`/api/contact`/`/api/buyback` (store="test"). **Aucun SMS réel envoyé.**
- **Rien publié/déployé** (consigne utilisateur maintenue).

### S25 (07/10/2026) — 4 corrections admin relevées en preview
Rien publié.
- **Compteurs Magasin TEST** : `/admin/stats` excluait toujours `is_test` → corrigé pour suivre la même règle que `/admin/transfo` (si `store=test`, compte les demandes de test ; sinon les exclut toujours). Vérifié via curl : `store=test` → 9 devis, sans store → 32 (test exclu).
- **Bouton Appel en double dans "À appeler"** : le bandeau coloré de `ToCallTab.jsx` ne montre plus le bouton "Appel" générique ni le compteur d'appels (supprimés, devenus redondants avec la ligne) — ne restent que les boutons de classement propres au groupe (Injoignable groupe 4, Classer perdu groupe 6, Oui/Non groupes 7/8). Le `CallLogPanel` dédié au cas générique dans `ToCallTab.jsx` était devenu mort (la ligne `DemandCard` a son propre bouton Appel) → supprimé.
- **Retour impossible après un "Non"** dans `CallLogPanel.jsx` : ajout de 2 boutons "Retour"/"Valider" sous le champ raison (Retour annule le Non et réaffiche Oui/Non) ; le lien "Retour" du haut gère maintenant aussi la navigation question-par-question dans le flux "Pas de réponse" (au lieu de sauter direct à la racine).
- **Barre d'onglets** : "À appeler" reste la seule pastille verte mise en avant ; "Toutes les demandes" n'est plus un bouton-pilule mais un petit lien texte gris discret avec chevron, placé après les onglets, devenant "Ranger les demandes" une fois déplié.
- Vérifié manuellement (curl + screenshots) sur Magasin TEST : les 4 points de la section "✅ Vérification" du cahier des charges sont confirmés.

