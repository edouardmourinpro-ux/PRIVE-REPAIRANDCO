# Repair & Co - Product Requirements Document

## Project Overview
**Project:** repairandco.fr - Electronics Repair Business Website
**Client:** Repair & Co (Sud de France)
**Date:** March 2026
**Status:** MVP Complete

---

## Original Problem Statement
Create a complete professional website for Repair & Co, an electronics repair business with 5 locations in shopping malls across South of France (Carrefour, Intermarché, Grand Sud). 

**Goals:**
1. Brand presence and credibility
2. Local SEO optimization
3. B2C conversion (quotes/appointments)
4. B2B acquisition (enterprise fleet repairs)

---

## User Personas

### 1. Consumer (B2C)
- Location: Nîmes, Montpellier, Pérols, Béziers
- Needs: Quick phone/tablet/PC repair
- Pain points: Broken device, needs fast solution
- Goals: Get quote, book appointment, understand pricing

### 2. Enterprise (B2B)
- Role: IT Manager, Procurement
- Company: SMB with mobile device fleet
- Needs: Volume repairs, enterprise billing
- Goals: Get bulk quote, establish partnership

---

## Core Requirements (Static)

### Design System
- **Primary color:** #1A5C3A (dark green)
- **Background:** #E8F5EE (mint green)
- **Accent:** #2ECC71 (bright green)
- **Text:** #1A1A2E
- **Typography:** Plus Jakarta Sans (headings), Inter (body)

### Pages Required
1. `/` - Homepage
2. `/services` - All repair services
3. `/magasins` - 5 store locations
4. `/devis` - Multi-step quote form
5. `/rendez-vous` - Appointment booking
6. `/rachat` - Buyback & refurbished
7. `/entreprises` - B2B enterprise offer
8. `/qui-sommes-nous` - About page
9. `/faq` - FAQ with accordion
10. `/contact` - Contact form

### Key Features
- QualiRépar label prominently featured (up to €50 state aid)
- Multi-step quote form (4 steps)
- Google Maps integration for all stores
- Cookie consent banner (RGPD)
- Mobile-responsive design

---

## What's Been Implemented ✅

### March 2026 - MVP Launch

**Backend (FastAPI):**
- ✅ RESTful API with /api prefix
- ✅ Quote submission endpoint (`/api/quote`)
- ✅ Contact form endpoint (`/api/contact`)
- ✅ B2B form endpoint (`/api/b2b`)
- ✅ Buyback form endpoint (`/api/buyback`)
- ✅ Store data endpoint (`/api/stores`)
- ✅ MongoDB integration for all forms

**Frontend (React):**
- ✅ All 10 pages implemented
- ✅ Responsive navigation (desktop + mobile)
- ✅ Homepage with updated hero tagline, QualiRépar badge, CTAs
- ✅ Multi-step quote form (4 steps)
- ✅ Services page with 3 universes (Smart & Connect, Home, Mobility)
- ✅ Stores page with Clic&Repair section, postal code search, WhatsApp buttons
- ✅ FAQ with accordion
- ✅ Cookie consent banner
- ✅ Footer with all links

### March 2026 - Content Update

**Homepage:**
- ✅ Updated tagline: "Smartphones & Tablettes / Informatique / Petit Électroménager / Vélos et Trottinettes"
- ✅ Added subline: "Retrouvez-nous dans nos ateliers en proximité ou en ligne"
- ✅ QualiRépar badge with link
- ✅ CTA buttons: "Devis gratuit en ligne" + "Prendre rendez-vous"

**Services Page:**
- ✅ Reorganized into 3 universes: SMART & CONNECT, HOME, MOBILITY
- ✅ Smartphones & Tablettes grouped together
- ✅ Vélos/Trottinettes with store availability notice
- ✅ Compact layout with visible CTAs
- ✅ Mention: "*Sous réserve de la disponibilité de la pièce détachée"
- ✅ QualiRépar bonus mention (15 to 80€)

**Stores Page:**
- ✅ Title: "Nos magasins — Près de chez vous"
- ✅ Section 1: "Faire réparer en atelier"
- ✅ Section 2: "Faire réparer en ligne — Clic&Repair"
- ✅ Postal code search field
- ✅ WhatsApp buttons for each store
- ✅ Store testimonials linked to correct stores
- ✅ QualiRépar link

**Quote Page:**
- ✅ Title: "Devis gratuit"
- ✅ Subtitle: "Précisez-nous votre appareil et votre problème. Nous vous rappelons sous 15 minutes."

**About Page:**
- ✅ Updated intro with eco-responsibility focus
- ✅ ESS section (Économie Sociale et Solidaire)
- ✅ Team section with 3 blocks (engagée, qualifiés, proches)
- ✅ Mission statement quote

**Enterprise Page:**
- ✅ Title: "Une offre, des gains multiples pour vous et vos employés"
- ✅ Programme RSE REPAIR section
- ✅ "Des réponses adaptées à vos besoins" section
- ✅ Download brochure button (placeholder)

---

## Prioritized Backlog

### P0 (Critical) - Next Phase
- [ ] Email notifications for form submissions (Resend/SendGrid)
- [ ] Google Analytics GA4 integration (ID to be provided)

### P1 (High Priority)
- [ ] Schema.org structured data (LocalBusiness, FAQPage)
- [ ] Real customer reviews integration
- [ ] Team photos for About page
- [ ] Complete legal pages content

### P2 (Nice to Have)
- [ ] Online booking system for all stores
- [ ] Live chat support
- [ ] Customer dashboard for repair tracking
- [ ] Multi-language support

---

## Technical Architecture

```
Frontend (React)
├── Components (Shadcn UI + Custom)
├── Pages (10 routes)
├── Data (static stores, services, FAQ)
└── API calls to backend

Backend (FastAPI)
├── API Router (/api prefix)
├── MongoDB Motor client
├── Form validation (Pydantic)
└── CORS enabled

Database (MongoDB)
├── quotes collection
├── contacts collection
├── b2b_requests collection
└── buybacks collection
```

---

## Placeholders to Configure

- [ ] `edouardmourinpro@gmail.com` - Email for form notifications
- [ ] Google Analytics GA4 ID
- [ ] Complete store info for Béziers
- [ ] Real customer review data
- [ ] Team photos

---

## Next Tasks

1. Configure email sending for form submissions
2. Add Google Analytics when ID is provided
3. Complete legal pages (mentions légales, CGV, RGPD)
4. Add Schema.org structured data
5. Replace placeholder team photos
