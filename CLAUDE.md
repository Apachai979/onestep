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

Deployment is PM2-based via [ecosystem.config.js](ecosystem.config.js) (`pm2 deploy production`). Docker artifacts were removed — сервер держит один инстанс Next.js под PM2, база SQLite и файлы вложений живут на локальном диске сервера. Если понадобится контейнер — восстановить Dockerfile из истории git.

## Architecture

### Routing (App Router)

- **Сайт и CRM разделены route group'ами.** Публичный сайт живёт в [app/(site)/](app/%28site%29/), CRM — в [app/crm/](app/crm/). Скобки в имени `(site)` не попадают в URL: `app/(site)/about/page.jsx` — это `/about`. Новый раздел кладите в `(site)` только если ему нужны шапка и подвал сайта.
- [app/layout.js](app/layout.js) — корневой layout, держит только каркас документа: `<html>`/`<body>`, шрифты, `globals.css` и `<Providers>` (NextAuth `SessionProvider`). Шапки/подвала здесь нет.
- [app/(site)/layout.jsx](app/%28site%29/layout.jsx) рендерит `TheHeader` / `TheFooter` и принимает `children` + слот `modal`. [app/crm/layout.jsx](app/crm/layout.jsx) проверяет сессию и роль (`MANAGER`/`ADMIN`) и оборачивает всё в `CrmShell`. `/maintenance` лежит вне обеих групп и рендерится без обвязки.
- **Parallel route `@modal`** ([app/(site)/@modal/](app/%28site%29/@modal/)) — слот модалок сайта, подключён к layout группы `(site)`. [default.jsx](app/%28site%29/@modal/default.jsx) возвращает `null`, поэтому на большинстве роутов слот пуст.
- **Intercepting route** [app/(site)/@modal/(.)feedbackform/page.jsx](app/%28site%29/@modal/%28.%29feedbackform/page.jsx) перехватывает переход на `/feedbackform` и показывает форму модалкой поверх текущей страницы; прямой заход по URL отдаёт полную страницу из [app/(site)/feedbackform/](app/%28site%29/feedbackform/). Такая же пара есть в [app/(site)/partners/doctors/](app/%28site%29/partners/doctors/). Токен `(.)` резолвится относительно уровня внутри группы — при переносе роутов слот и его цель должны ехать вместе.
- Catalog detail pages use `generateStaticParams` driven by the local JSON dataset (see below), not the database.
- **Публичный сайт сейчас скрыт.** [middleware.ts](middleware.ts) редиректит всё, кроме `/crm`, `/authorize`, `/register`, `/api/*` и статики, на заглушку [app/maintenance/page.jsx](app/maintenance/page.jsx). Страницы сайта остаются в коде и билдятся. Чтобы вернуть сайт — задать `SITE_HIDDEN=false` в окружении (или снять флаг в middleware).

### Data layers — two parallel sources

This codebase has **two distinct data sources** that are used for different parts of the site. Don't confuse them:

1. **Static JSON catalog** — [components/Data/data.json](components/Data/data.json) (NeoSet products) and [components/Data/dataAcademy.json](components/Data/dataAcademy.json). The catalog pages under [app/catalogs/[title]/](app/catalogs/[title]/) read directly from `data.json` via `import parsedData from "@/components/Data/data.json"`. This is the source of truth for the public product catalog.
2. **Prisma + SQLite** — [prisma/schema.prisma](prisma/schema.prisma), DB file at `prisma/dev.db`. Models: `Neoset`, `Images`, `Code`, `Consist`, `ConsistOf`, `Category`, `Section`, `Post`. Services live in [services/categories.js](services/categories.js) and use the Prisma singleton from [lib/client.js](lib/client.js) (global instance in dev, fresh in prod — standard Next.js pattern). The DB schema mirrors the JSON catalog conceptually but is not currently the source for `/catalogs` pages.

The `/api/neosets` route ([app/api/neosets/route.js](app/api/neosets/route.js)) also returns a hardcoded array, not DB data.

### Auth

NextAuth with only the **Credentials** provider (email + пароль), configured in [configs/auth.ts](configs/auth.ts) and mounted at [app/api/auth/[...nextauth]/route.js](app/api/auth/%5B...nextauth%5D/route.js). Required env vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Публичной регистрации нет — новые пользователи создаются админом через приглашения ([components/crm/InvitesSection.jsx](components/crm/InvitesSection.jsx) генерирует ссылку `/register?invite=<token>`, которую отправляют вручную). Кнопка «Войти» в шапке ([components/AuthComponent.jsx](components/AuthComponent.jsx)) ведёт на `/authorize?callbackUrl=/crm`.

### CRM external integrations

- **DaData (party search)** — counterparty form ([components/crm/CounterpartyForm.jsx](components/crm/CounterpartyForm.jsx)) uses [components/crm/DadataSearch.jsx](components/crm/DadataSearch.jsx) which calls the server proxy [app/api/crm/dadata/find-party/route.js](app/api/crm/dadata/find-party/route.js). The proxy keeps the token server-side. Required env var: `DADATA_API_KEY`. The lib at [lib/crm/dadata.js](lib/crm/dadata.js) auto-routes between `findById/party` (when query is 10/12/13/15 digits — INN/OGRN/OKPO) and `suggest/party` (free text). If a new endpoint or field mapping is needed, change it there — the rest of the stack just passes objects through.
- **1С Erp (stock sync)** — кнопка «Обновить остатки» в [/crm/products](app/crm/products/page.jsx) дергает [POST /api/crm/stock/sync](app/api/crm/stock/sync/route.js), который через [lib/crm/onec.js](lib/crm/onec.js) идет с Basic-auth в 1С (`fetch(ONEC_STOCK_URL)`), сопоставляет `article ↔ Product.sku`, пишет `quantity * quantity_sets_in_box` в `Stock { productId, warehouse, quantity }` ([lib/crm/stock.js](lib/crm/stock.js)). Записи, которые перестали приходить из 1С для синхронизированных товаров, удаляются — так на складе с обнулённым остатком запись не «висит». Required env vars: `ONEC_STOCK_URL`, `ONEC_STOCK_USERNAME`, `ONEC_STOCK_PASSWORD`. Если 1С использует самоподписанный сертификат — добавьте корневой CA через `NODE_EXTRA_CA_CERTS` (или временно `NODE_TLS_REJECT_UNAUTHORIZED=0` для разработки).

### Скидка: цепочка наследования

Скидка живёт в четырёх местах: контрагент (`Counterparty.discount`, скидка группы `CounterpartyGroup.discount` перекрывает личную), проект (`Project.discount`), сделка (`Deal.discount`) и КП, которое считается по сделке. Значение передаётся по цепочке **контрагент/группа → проект → сделка → КП** и только как значение по умолчанию **в момент создания**: каждое звено хранит свой снимок, поэтому пересмотр скидки в карточке клиента не пересчитывает старые проекты, сделки и выставленные КП. Переопределить скидку менеджер может на любом звене.

Логика — в [lib/crm/discount.js](lib/crm/discount.js) (`counterpartyDiscountInfo`, `inheritedDealDiscount`, `discountSourceLabel`, `formatDiscount`); не дублировать её в компонентах. Хелперы возвращают не число, а источник значения — формы этим подписывают поля («из карточки клиента», «из группы компаний», «из проекта»). Подстановку выполняет сервер: если форма не прислала `discount`, его проставляет POST-роут ([проекты](app/api/crm/projects/route.js), [сделки](app/api/crm/deals/route.js)). Форма создания сделки скидку вообще не спрашивает — только показывает унаследованное значение; правится оно в карточке созданной сделки. Скидка, попавшая в проведённую отгрузку, замораживается (`discountLocked`).

### Даты и часовой пояс в CRM

Вся CRM живёт в **московском времени** — сервер под PM2 и браузеры менеджеров могут стоять в разных зонах, поэтому «сегодня» и «просрочено» нигде не считаются через локальную зону процесса. Все хелперы — в [lib/crm/datetime.js](lib/crm/datetime.js) (`crmToday`, `crmDayStart/crmDayEnd`, `crmParseDateTime`, `formatCrmDate/Time/DateTime`).

Инвариант хранения: **в базе всегда реальные UTC-моменты**. Задача «на весь день» (`Task.allDay`) — это московские сутки целиком, `00:00:00.000` … `23:59:59.999` МСК. Значения `input[type=date|datetime-local]` трактуются как московские. Логика срока задачи (`isTaskOverdue`, `isTaskToday`, `taskDueState`, `taskRangeLabel`, `taskDueRelativeLabel`) живёт только в [lib/crm/task.js](lib/crm/task.js) — не дублировать её в компонентах.

### Styling

Tailwind with an extensive custom theme in [tailwind.config.js](tailwind.config.js): brand color tokens (`night_green`, `primary_green`, `dark_green`, `light_green`, `body_bg`, etc. — note several have duplicate alias names like `mainGreen`/`primary_green`, both are in use), custom screens (`sm920`, `lg1100`, `lg1245`, `md1372`...), and named keyframes/animations (`emersion`, `apparition`, `transformer`, `shaker`, `spinner`). Prefer existing tokens over raw hex.

### Path alias

`@/*` resolves to the repo root (see [jsconfig.json](jsconfig.json)). Use `@/components/...`, `@/lib/...`, `@/services/...`, `@/configs/...`.

## Conventions

- Components are `.jsx`; mark client components with `"use client"` at the top (see [components/Navigation.jsx](components/Navigation.jsx), [components/Providers.jsx](components/Providers.jsx)).
- All visible text is Russian — match the existing tone when adding copy.
- New top-level pages live under `app/<route>/page.jsx` and typically export a `metadata` object with `title` (the root layout template applies `%s | Onestep`).
