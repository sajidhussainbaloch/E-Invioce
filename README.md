# E-Invioce — Invoice Bank

A self-hosted, free invoicing and FBR-compliant billing system for small and medium businesses in Pakistan. Currently an evolving codebase: authentication, business setup, branding (logo/watermark), sample invoice generation (PDF + PNG), in-browser invoice OCR, and a dashboard — with customers, products, invoices, and direct FBR DI-API filing planned next.

| | |
|---|---|
| Status | Active development (Phase 2 complete) |
| License | Open source — free to use, self-hosted |
| Stack | Fastify 5 · React 19 · PostgreSQL 15+ |
| Cost to run | Rs. 0 — runs entirely on your own machine/server |

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Environment](#environment)
  - [Database setup](#database-setup)
  - [Run the app](#run-the-app)
- [Scripts](#scripts)
- [API overview](#api-overview)
- [Roadmap](#roadmap)
- [Security notes](#security-notes)

---

## Features

**Implemented (Phase 1–2)**

- Registration, login, logout, session management (7-day sessions, server-side)
- Passwords hashed with **Argon2id** — industry-standard KDF
- Business profile: NTN, tax registration, address, phone, email
- Branding: logo upload (PNG/JPEG/WebP), DRAFT watermark on generated PDFs
- Sample invoice rendering engine — a pixel-accurate PDF generated with **PDFKit**
- Same invoice exported as PNG straight from the browser
- Invoice scanner: OCR runs **entirely in the browser** with Tesseract.js (no image upload to any server)
- Dashboard with business stats and FBR connection status
- Role-aware structure ready for multi-user businesses (owner/team)

**Planned**

- Customers, products, and invoices CRUD with sequential invoice numbers
- Sales reports
- FBR Digital Invoicing (DI) API integration: online/offline invoice submission, sandbox testing, production filing
- Printed-invoice compliance: FBR invoice number format and QR code

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 8 |
| Backend | Fastify 5, TypeScript |
| ORM / DB | Drizzle ORM, PostgreSQL |
| Validation | Zod (shared schemas between frontend and backend) |
| Auth | @node-rs/argon2 (Argon2id), DB-backed sessions, HttpOnly cookies |
| PDF | PDFKit |
| OCR | Tesseract.js (client-side) |
| Tooling | npm workspaces, tsx (watch/dev), oxlint |

---

## Repository structure

```
invoice-bank/            # npm workspaces monorepo
├── apps/
│   ├── api/             # Fastify backend (REST, auth, business, PDFs, dashboard)
│   │   ├── drizzle/     # Generated SQL migrations
│   │   └── src/
│   │       ├── modules/ # auth · business · pdf · dashboard
│   │       └── routes/  # health / version / test-db
│   └── web/             # React frontend (Vite)
│       └── src/
│           ├── auth/    # Session/context provider
│           ├── pages/   # Login, Register, Dashboard, Settings, …
│           └── lib/     # API client + types
├── packages/
│   └── validation/      # Shared Zod schemas + inferred types
├── scripts/dev.mjs      # Runs API + web together
└── .env.example
```

---

## Getting started

### Prerequisites

- **Node.js ≥ 22** and npm (bundled with Node)
- **PostgreSQL ≥ 15** running locally (default port 5432)
- Git (for cloning)

### Install

```bash
git clone https://github.com/sajidhussainbaloch/E-Invioce.git
cd E-Invioce
npm install
```

### Environment

The API reads its configuration from a root `.env` file (gitignored; never committed).

```bash
cp .env.example .env
```

Edit `.env` and set the PostgreSQL credentials for your machine:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=4000
DATABASE_URL=postgres://postgres:CHANGE_ME@localhost:5432/invoice_bank
```

### Database setup

Create the database, then apply schema migrations:

```bash
# one time: create the database
psql -U postgres -c "CREATE DATABASE invoice_bank;"

# apply migrations (from the api workspace)
npm run db:migrate -w @invoice-bank/api
```

> Need to regenerate migrations after schema changes? Use `npm run db:generate -w @invoice-bank/api`.

### Run the app

You'll have two processes: the API (default `http://localhost:4000`) and the web app (default `http://localhost:5173`).

```bash
# both together (recommended for quick start)
npm run dev

# or each in its own terminal
npm run dev:api
npm run dev:web
```

Open `http://localhost:5173`, register an account, and set up your business. That's it — a fresh signup starts empty; there is no seeded demo data.

---

## Scripts

> Run workspace scripts with `-w @invoice-bank/api` or `-w @invoice-bank/web`.

| Command | Description |
|---|---|
| `npm run dev` | Start API + web with hot reload |
| `npm run dev:api` | Start only the Fastify API (tsx watch) |
| `npm run dev:web` | Start only the Vite web app |
| `npm run build` | Type-check + compile the API (`apps/api/dist`) |
| `npm run typecheck` | TypeScript no-emit check for the API |
| `npm run build -w @invoice-bank/web` | Production build of the web app |
| `npm run db:generate -w @invoice-bank/api` | Generate a new SQL migration from the schema |
| `npm run db:migrate -w @invoice-bank/api` | Apply pending migrations |
| `npm run db:studio -w @invoice-bank/api` | Open Drizzle Studio (DB explorer) |
| `npm run lint -w @invoice-bank/web` | Lint the web app (oxlint) |

---

## API overview

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create account + start session | – |
| POST | `/api/auth/login` | Sign in | – |
| POST | `/api/auth/logout` | End session | session |
| GET | `/api/auth/me` | Current user + business | session |
| PATCH | `/api/auth/password` | Change password | session |
| POST | `/api/business` | Create business profile | session |
| GET | `/api/business` | Read business + settings | business |
| PATCH | `/api/business` | Update business profile | business |
| GET/PATCH | `/api/business/settings` | Invoice settings (watermark, prefix, FBR env) | business |
| POST | `/api/business/logo` | Upload business logo | business |
| GET | `/api/sample/invoice.pdf` | Sample invoice (watermark toggle via `?watermark=0`) | business |
| GET | `/api/dashboard` | Business stats | business |
| GET | `/health` · `/api/version` · `/api/test-db` | Operability checks | – |

Non-existent business → `403 Business not setup`; invalid or expired session → `401 Unauthorized`; schema errors → `400` with field-level messages.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Monorepo, API scaffold, DB, health checks | Complete |
| 2 | Auth + business + settings, logo, sample invoice, OCR, dashboard | Complete |
| 3 | Customers, products, invoices, sequential numbering, reports | Planned |
| 4 | FBR DI API integration (sandbox → production), QR code, offline queue | Planned |

FBR integration plan highlights (from planning research): DI API v1.12 at `gw.fbr.gov.pk`, Bearer-token auth via PRAL, mandatory IP whitelisting, sandbox scenario tests before the production token, offline invoices re-submitted within 24 hours, printed invoices carrying the FBR invoice number and a compliant QR code.

---

## Security notes

- Passwords stored using Argon2id (memory-hard KDF) — never plaintext
- Session tickets are stored as SHA-256 hashes; the raw cookie is the only secret
- Auth cookies are `HttpOnly` + `SameSite=Lax` (Secure in production)
- All money math (tax, totals, FBR amounts) is performed on the backend — the browser never decides numbers
- `.env`, `uploads/` (business assets), and build artifacts are gitignored — secrets never reach the repository
- Dependency pins follow upstream security advisories (e.g. `@fastify/static`, `drizzle-orm`)

---

## License

Open source. This project is intended to stay free and self-hostable for Pakistani businesses.