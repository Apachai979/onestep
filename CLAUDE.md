# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marketing/catalog site for **OneStep** — Russian manufacturer of medical disposable dressing materials and sterile procedure sets (NeoSet). All user-facing copy is in Russian. Next.js 14 App Router, mostly JavaScript (`.jsx`), with one TypeScript config file (`configs/auth.ts`).

## Commands

```bash
npm run dev                # prisma generate && next dev (port 3000)
npm run build              # prisma generate && next build
npm start                  # next start
npm run lint               # next lint
npm run migration:create   # prisma migrate dev --create-only (edit SQL before applying)
npm run migrate            # prisma migrate deploy (production)
```

`dev` and `build` always run `prisma generate` first — no need to invoke it manually after schema edits.

Deployment is PM2-based via [ecosystem.config.js](ecosystem.config.js) (`pm2 deploy production`); a Dockerfile exists but `output: "standalone"` is currently commented out in [next.config.mjs](next.config.mjs), so the Docker image won't build as-is.

## Architecture

### Routing (App Router)

- [app/layout.js](app/layout.js) wraps everything in `<Providers>` (NextAuth `SessionProvider`) and renders `TheHeader` / `TheFooter`. It accepts both `children` and a `modal` slot.
- **Parallel route `@modal`** ([app/@modal/](app/@modal/)) is the modal slot. [app/@modal/default.jsx](app/@modal/default.jsx) returns `null` so the slot is empty on most routes.
- **Intercepting route** [app/@modal/(.)feedbackform/page.jsx](app/@modal/(.)feedbackform/page.jsx) intercepts navigation to `/feedbackform` and renders it as a modal over the current page, while a direct visit to [app/feedbackform/](app/feedbackform/) renders the full page.
- Catalog detail pages use `generateStaticParams` driven by the local JSON dataset (see below), not the database.

### Data layers — two parallel sources

This codebase has **two distinct data sources** that are used for different parts of the site. Don't confuse them:

1. **Static JSON catalog** — [components/Data/data.json](components/Data/data.json) (NeoSet products) and [components/Data/dataAcademy.json](components/Data/dataAcademy.json). The catalog pages under [app/catalogs/[title]/](app/catalogs/[title]/) read directly from `data.json` via `import parsedData from "@/components/Data/data.json"`. This is the source of truth for the public product catalog.
2. **Prisma + SQLite** — [prisma/schema.prisma](prisma/schema.prisma), DB file at `prisma/dev.db`. Models: `Neoset`, `Images`, `Code`, `Consist`, `ConsistOf`, `Category`, `Section`, `Post`. Services live in [services/categories.js](services/categories.js) and use the Prisma singleton from [lib/client.js](lib/client.js) (global instance in dev, fresh in prod — standard Next.js pattern). The DB schema mirrors the JSON catalog conceptually but is not currently the source for `/catalogs` pages.

The `/api/neosets` route ([app/api/neosets/route.js](app/api/neosets/route.js)) also returns a hardcoded array, not DB data.

### Auth

NextAuth with GitHub, Google, and Mail.ru providers, configured in [configs/auth.ts](configs/auth.ts) and mounted at [app/api/auth/[...nextauth]/route.js](app/api/auth/%5B...nextauth%5D/route.js). Required env vars: `GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_SECRET`, `MAILRU_CLIENT_ID`, `MAILRU_CLIENT_SECRET`, plus `NEXTAUTH_URL` / `NEXTAUTH_SECRET`. Remote images from `avatars.githubusercontent.com` and `lh3.googleusercontent.com` are allowlisted in [next.config.mjs](next.config.mjs) — add any new auth provider avatar host there.

### Styling

Tailwind with an extensive custom theme in [tailwind.config.js](tailwind.config.js): brand color tokens (`night_green`, `primary_green`, `dark_green`, `light_green`, `body_bg`, etc. — note several have duplicate alias names like `mainGreen`/`primary_green`, both are in use), custom screens (`sm920`, `lg1100`, `lg1245`, `md1372`...), and named keyframes/animations (`emersion`, `apparition`, `transformer`, `shaker`, `spinner`). Prefer existing tokens over raw hex.

### Path alias

`@/*` resolves to the repo root (see [jsconfig.json](jsconfig.json)). Use `@/components/...`, `@/lib/...`, `@/services/...`, `@/configs/...`.

## Conventions

- Components are `.jsx`; mark client components with `"use client"` at the top (see [components/Navigation.jsx](components/Navigation.jsx), [components/Providers.jsx](components/Providers.jsx)).
- All visible text is Russian — match the existing tone when adding copy.
- New top-level pages live under `app/<route>/page.jsx` and typically export a `metadata` object with `title` (the root layout template applies `%s | Onestep`).
