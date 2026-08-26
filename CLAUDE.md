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

### Почтовые уведомления о задачах

Исполнителю уходит письмо, когда ему **создали** задачу ([POST /api/crm/tasks](app/api/crm/tasks/route.js)) или **передали** её сменой `assigneeId` ([PATCH /api/crm/tasks/[id]](app/api/crm/tasks/%5Bid%5D/route.js)). Вся логика — в [lib/crm/notify-task.js](lib/crm/notify-task.js) (`notifyTaskAssigned`), отправка идёт через тот же SMTP-транспорт [lib/crm/mailer.js](lib/crm/mailer.js), что и КП.

Правила, которые легко сломать:

- **Отправка не блокирует API**: роуты вызывают `notifyTaskAssigned` без `await` (`void ...`), а сама функция ничего не бросает — ошибки уходят в лог PM2 (`[task-notify]`). Повторов нет: очереди в базе намеренно не заводили. Не добавлять `await` — упавший SMTP не должен ронять создание задачи.
- **Себе не пишем**: если `assigneeId === actorId`, письма нет.
- **Персональное отключение** живёт в `User.prefs` — JSON-строка, разбор в [lib/crm/prefs.js](lib/crm/prefs.js) (`parsePrefs`, `mergePrefsPayload`, `wantsTaskEmail`), ключ `taskEmail`, по умолчанию включено. Галочка — в профиле ([components/crm/ProfileForm.jsx](components/crm/ProfileForm.jsx)), сохраняется через PATCH `/api/crm/profile`. Наружу `prefs` отдаются объектом (`toProfileDto`), в базе — строкой.
- **Шаблон** (тема + тело с `{{плейсхолдерами}}`) правит админ в [/crm/settings](app/crm/settings/page.jsx) через общий редактор [EmailTemplateSettings](components/crm/EmailTemplateSettings.jsx); дефолты и список подстановок — в [lib/crm/settings.js](lib/crm/settings.js). Пустые подстановки (нет привязки или описания) схлопываются в `tidy`, поэтому в шаблоне их можно держать на отдельных строках.
- **Ссылка вшита в название карточки, отдельной строки с адресом нет.** `buildTaskEmail` собирает письмо в двух версиях: HTML — основная, там ссылкой становится название в `{{relation}}` («Сделка: *По проекту: АО ...*»); в plain-версии спрятать адрес в текст нельзя, поэтому он приписывается к той же строке через тире. Ведёт ссылка на карточку — `/crm/deals/<id>`, `/crm/projects/<id>` или `/crm/counterparties/<id>`: задача видна там в панели активности (`ActivityPanel` → `RelatedTasksSection`). Отдельной страницы задачи нет, поэтому у задачи **без привязки** ссылку получает `{{title}}` и ведёт на `/crm/tasks`. Базовый адрес — `CRM_BASE_URL`, иначе `NEXTAUTH_URL`; без них в письме будет относительный путь.
- HTML собирается из того же шаблона: он экранируется целиком (`escapeHtml`), и только потом в него подставляются значения с готовой разметкой — поэтому кавычки в названиях («АО "ПРОФИЛЬ"») не ломают вёрстку. Хелперы разметки — в [lib/crm/mailer.js](lib/crm/mailer.js) (`escapeHtml`, `htmlFromEscaped`, `mailLink`), `sendMail` принимает необязательный `html`.

### Скидка: цепочка наследования

Скидка живёт в четырёх местах: контрагент (`Counterparty.discount`, скидка группы `CounterpartyGroup.discount` перекрывает личную), проект (`Project.discount`), сделка (`Deal.discount`) и КП, которое считается по сделке. Значение передаётся по цепочке **контрагент/группа → проект → сделка → КП** и только как значение по умолчанию **в момент создания**: каждое звено хранит свой снимок, поэтому пересмотр скидки в карточке клиента не пересчитывает старые проекты, сделки и выставленные КП. Переопределить скидку менеджер может на любом звене.

Логика — в [lib/crm/discount.js](lib/crm/discount.js) (`counterpartyDiscountInfo`, `inheritedDealDiscount`, `discountSourceLabel`, `formatDiscount`); не дублировать её в компонентах. Хелперы возвращают не число, а источник значения — формы этим подписывают поля («из карточки клиента», «из группы компаний», «из проекта»). Подстановку выполняет сервер: если форма не прислала `discount`, его проставляет POST-роут ([проекты](app/api/crm/projects/route.js), [сделки](app/api/crm/deals/route.js)). Форма создания сделки скидку вообще не спрашивает — только показывает унаследованное значение; правится оно в карточке созданной сделки. Скидка, попавшая в проведённую отгрузку, замораживается (`discountLocked`).

### Обеспечение (остатки против сделок)

Отчёт [/crm/supply](app/crm/supply/page.jsx) отвечает на вопрос «сколько продукции лежит на складах и сколько из неё уже обещано клиентам». Расчёт — в [lib/crm/supply.js](lib/crm/supply.js) (`buildSupplyReport` — чистая функция), выборка — в [lib/crm/supply-data.js](lib/crm/supply-data.js), отдаётся через [GET /api/crm/supply](app/api/crm/supply/route.js), выгрузка в Excel — [/api/crm/supply/export](app/api/crm/supply/export/route.js).

Правила, которые нельзя менять по неосторожности:

- **Потребность («к обеспечению») берётся из сделок в статусах `SUPPLY_DEAL_STATUSES` = `CONFIRMED`, `CONTRACT`, `EXECUTION`** — это стадии, где состав уже согласован с клиентом и товар фактически обещан. Раньше по воронке состава ещё нет, позже сделка закрыта и склад ей ничего не должен. Заполненность состава при переводе в `CONFIRMED` не проверяется — сделка без позиций просто не даёт потребности.
- **Отгруженное вычитается**: `к обеспечению = заказано − отгружено по SHIPPED`. Этот товар со склада уже ушёл, и в `Stock` его нет — иначе он вычелся бы дважды. Именно поэтому `EXECUTION` можно держать в отчёте: в резерве остаётся только неотгруженный хвост заказа. Черновики отгрузок ничего не списывают и не вычитаются.
- **Резерв общий по всем складам**: `свободно = сумма остатков − к обеспечению`. Колонки складов справочные — сделка к складу не привязана, распределение это задача логистики.
- **Суммы — со скидкой сделки**: `DealItem.amount` хранит сумму строки до скидки, скидка лежит на сделке и распределяется по строкам пропорционально (та же логика, что в `dealDiscountedTotal`).
- Позиции без `productId` (вписанные руками) идут в отдельный блок «Не сопоставлено»: остатка у них нет, в баланс склада они не входят, но в итог «к обеспечению» попадают.
- Разрез по контрагентам строится по **клиенту сделки**, а не по плательщику — как и оборот в [lib/crm/revenue.js](lib/crm/revenue.js). На странице он намеренно не показан отдельной таблицей (это те же строки, свёрнутые по другому ключу): клиенты видны в колонке «Ждут» и в раскрытии строки, а свод по клиентам живёт на втором листе Excel-выгрузки.

### Доска аукционов (сроки закупок)

Вкладка «Аукционы» в [/crm/deals](app/crm/deals/page.jsx) ([AuctionsBoard.jsx](components/crm/AuctionsBoard.jsx)) отвечает на вопрос «какие закупки вот-вот разыграются». Расчёт — в [lib/crm/auction-board.js](lib/crm/auction-board.js) (`buildAuctionBoard` — чистая функция), данные отдаёт [GET /api/crm/deals?view=auctions](app/api/crm/deals/route.js).

- **Отдельного статуса «Аукцион» в воронке нет и не должно появиться.** Статус сделки — стадия продажи, `isAuction` — тип; это разные оси. Менеджерам нужен ответ на временной вопрос («когда торги»), его даёт дата, а не состояние. Новый статус вдобавок пришлось бы вписывать в `SUPPLY_DEAL_STATUSES`, `DEAL_OPEN_STATUSES`, аналитику и авто-архивацию.
- **Колонки вычисляются, а не хранятся**: «Без даты · Предстоящие (>3 дней) · Скоро (1–3) · Сегодня · Прошли». Поэтому **перетаскивания на доске нет** — «перенести» карточку означало бы сдвинуть срок закупки.
- **Раскладка по `bidsDeadlineAt`, запасной вариант — `auctionAt`**: на практике торги проводят сразу после окончания приёма заявок, а в старых карточках заполнено то одно поле, то другое.
- **Из колонки «Прошли» карточка уходит по факту фиксации итога, а не по таймеру.** До торгов и пока итог не известен сделка стоит в `AUCTION_PENDING_STATUSES` (`NEGOTIATION` или `CONFIRMED` — состав заявки могли согласовать заранее); такая карточка висит бессрочно и через `AUCTION_PASSED_KEEP_DAYS` краснеет. Итог зафиксирован (сделка двинулась дальше по воронке или в `CANCELLED`) — держится ещё неделю от даты торгов и исчезает. Иначе аукцион молча пропадал бы с неразобранным результатом.
- **`CLOSED` и `ARCHIVED` на доску не попадают вообще** (`AUCTION_HIDDEN_STATUSES`): исполненная закупка отработана, архив — свалка старых отказов. **`CANCELLED` без даты закупки скрыт тоже**: разбираться не с чем, а уйти по правилу «неделя от торгов» такой карточке нечем — без даты отсчитывать не от чего, и она осела бы в «Без даты» навсегда.
- **Итог прошедших торгов (`auctionOutcome`) читается по статусу, а не по полю `winner`**: при выигрыше победитель — мы сами, и своё юрлицо туда никто не вписывает; поле хранит того, кто забрал закупку при проигрыше, и идёт на карточке подписью. `CANCELLED` с причиной `AUCTION_CANCELLED` — не проигрыш, а снятая закупка: отдельный нейтральный цвет. Итог применяется только к прошедшим торгам (`auctionBoardOutcome`) — до них сделка может быть в «Договоре» по другим причинам.
- **Суммы колонок — по НМЦК**, а не по сумме сделки: до торгов сумму собственной заявки часто ещё не проставили.
- Фильтр «Заказчик» (`auctionCustomerId`) есть только на этой вкладке — второй стороны у обычных сделок нет. Заказчик участвует и в `matchesDealSearch`.

### Аналитика и отчёты

Раздел [/crm/analytics](app/crm/analytics/page.jsx) — витрина отчётов для коллег и руководства; новый отчёт добавляется карточкой в массив `REPORTS` и своей подпапкой. Общий выбор периода — [components/crm/PeriodFilter.jsx](components/crm/PeriodFilter.jsx) поверх хелперов [lib/crm/period.js](lib/crm/period.js) (`periodPreset`, `detectPeriodPreset`, `parsePeriodParams`, `previousPeriod`, `monthsBetween`); период везде — пара календарных дат `"YYYY-MM-DD"` в зоне CRM, в UTC-моменты она разворачивается только в выборке.

Первый отчёт — **«Продажи менеджеров»** ([/crm/analytics/sales](app/crm/analytics/sales/page.jsx)): расчёт в [lib/crm/sales.js](lib/crm/sales.js) (`buildSalesReport` — чистая функция), выборка в [lib/crm/sales-data.js](lib/crm/sales-data.js), API [GET /api/crm/analytics/sales](app/api/crm/analytics/sales/route.js), Excel — [/api/crm/analytics/sales/export](app/api/crm/analytics/sales/export/route.js).

Договорённости, на которых держатся цифры:

- **Продажа = проведённая отгрузка** (`Shipment.status === "SHIPPED"`). Отдельного учёта денег в CRM нет, поэтому деньги считаются пришедшими, когда товар ушёл. Черновики не в счёт — та же граница, что в «Обеспечении».
- **Дата продажи — `Shipment.shippedAt`** (фактическая). Её проставляет сам переход в `SHIPPED`, а возврат в черновик очищает. Отгрузку без даты отчёт не раскидывает «куда-нибудь», а пропускает и показывает счётчиком `undatedCount` — иначе деньги молча исчезают.
- **Продажа принадлежит менеджеру сделки** (`Deal.managerId`), а не автору документа: отгрузку может завести логист или коллега на подмене. Расхождение видно в расшифровке (`createdByOther`).
- **Сделки в `CANCELLED` и `ARCHIVED` исключены** (`SALES_EXCLUDED_DEAL_STATUSES`). Побочный эффект принят осознанно: смена статуса сделки задним числом меняет цифру прошлого периода.
- **Суммы — со скидкой сделки**, разнесённой по строкам пропорционально: та же формула, что в [supply.js](lib/crm/supply.js), иначе «к обеспечению» и «продано» считались бы в разных деньгах.
- Клиент разреза — **контрагент сделки**, а не плательщик (как в [revenue.js](lib/crm/revenue.js) и «Обеспечении»).
- **Цифры не скрыты по ролям**: менеджеры видят продажи друг друга, роутам достаточно `requireCrmSession`.
- Сетка месяцев строится **от периода, а не от данных** — месяц без отгрузок должен быть виден нулём.

Второй отчёт — **«Задачи менеджеров»** ([/crm/analytics/tasks](app/crm/analytics/tasks/page.jsx)): расчёт в [lib/crm/tasks-report.js](lib/crm/tasks-report.js) (`buildTasksReport` — чистая функция), выборка в [lib/crm/tasks-report-data.js](lib/crm/tasks-report-data.js), API [GET /api/crm/analytics/tasks](app/api/crm/analytics/tasks/route.js), Excel — [/api/crm/analytics/tasks/export](app/api/crm/analytics/tasks/export/route.js).

- **У отчёта две оси времени, и путать их нельзя.** «Сделано» — задачи, закрытые внутри периода (`closedAt`); «запланировано» — задачи, у которых на период приходится срок (`endAt`). Открытые и просроченные видны только по второй оси (по первой их ещё нет), а работа, доделанная за прошлый месяц, — только по первой. Одна выборка тянет задачи, попавшие в период по `closedAt`, `endAt` **или** `createdAt` (`OR`), а раскладывает их по осям уже расчёт — тремя запросами это было бы то же самое, только со склейкой.
- **Задача принадлежит исполнителю** (`assigneeId`), а не постановщику: это отчёт о работе менеджера. Кто раздавал поручения — отдельный разрез `creators` по `createdAt` в периоде (поставил другим / себе); тот, кто только ставил задачи, попадает в таблицу строкой без «сделано» и в `totals.managersCount` не считается.
- **«В срок» — `closedAt <= endAt`, и считается только по выполненным** (`DONE`): у `FAILED` опоздание смысла не несёт. У задачи `allDay` `endAt` — конец московских суток, поэтому закрытие в тот же день опозданием не считается.
- **«Просрочено» вычисляется на момент запроса** (открытая задача с прошедшим сроком), поэтому цифра в отчёте за прошлый период со временем растёт — это состояние, а не факт периода.
- **Закрытая задача без `closedAt`** (закрытия до появления поля) в ось «сделано» не попадает, а показывается счётчиком `undatedClosed` — молча приписать её к периоду нельзя.
- Период сравнивается **календарными днями в зоне CRM** (`crmYmd`), а не моментами; дефолтный пресет здесь — месяц, а не год: задачи оперативные.
- История в раскрытии строки обрезана до `TASKS_REPORT_HISTORY_LIMIT` (500) — иначе JSON за год неподъёмный. Excel-выгрузка снимает лимит через `historyLimit: Infinity`, и обрезка в UI подписана.

### Даты и часовой пояс в CRM

Вся CRM живёт в **московском времени** — сервер под PM2 и браузеры менеджеров могут стоять в разных зонах, поэтому «сегодня» и «просрочено» нигде не считаются через локальную зону процесса. Все хелперы — в [lib/crm/datetime.js](lib/crm/datetime.js) (`crmToday`, `crmDayStart/crmDayEnd`, `crmParseDateTime`, `formatCrmDate/Time/DateTime`).

Инвариант хранения: **в базе всегда реальные UTC-моменты**. Задача «на весь день» (`Task.allDay`) — это московские сутки целиком, `00:00:00.000` … `23:59:59.999` МСК. Значения `input[type=date|datetime-local]` трактуются как московские. Логика срока задачи (`isTaskOverdue`, `isTaskToday`, `taskDueState`, `taskRangeLabel`, `taskDueRelativeLabel`) живёт только в [lib/crm/task.js](lib/crm/task.js) — не дублировать её в компонентах.

### Вид и фильтры списков живут в адресе

Выбранная вкладка и фильтры списков CRM хранятся в query string (`/crm/deals?tab=list&managerId=…`), а не только в состоянии компонента: уход в карточку размонтирует список, и на «Назад» менеджер должен вернуться в тот же вид с тем же отбором. Хелперы — в [lib/crm/url-state.js](lib/crm/url-state.js): `useTabParam(keys)` для вкладки и `useUrlFilters(defaults)` для фильтров (внутри же живёт debounce — `filters` для полей, `applied` для запроса и адреса, `apply` для мгновенного применения, `reset` для сброса).

- **Адрес переписывается нативным `window.history.replaceState`**, а не `router.replace`: последний сходил бы на сервер за RSC-пейлоадом, хотя ни вид, ни фильтры на серверную разметку не влияют — данные тянет клиент из `/api/crm/*`. Нагрузки синхронизация не добавляет.
- **`replace`, а не `push`** — перебор вкладок и правка фильтров не должны копиться в истории.
- **Дефолты в адрес не пишутся**, поэтому чистый `/crm/deals` таким и остаётся. Сравнение идёт именно с дефолтом, а не с пустотой: у списка задач дефолт «открытые», и явно выбранное «все статусы» в адрес попасть должно.
- **Тип значения выводится из дефолта**: массив → список через запятую (`status=CONFIRMED,CONTRACT`), булево → `1`/`0`, остальное → строка.
- **Ключи общие на страницу**: вкладки одной страницы делят строку запроса, и одноимённый фильтр (`assigneeId` в списке и канбане задач) специально переживает переключение вида. Новый фильтр с тем же именем, но другим смыслом на соседней вкладке заводить нельзя.
- Компонент с этими хуками обязан быть обёрнут в `<Suspense>` — требование `useSearchParams`.

### Styling

Tailwind with an extensive custom theme in [tailwind.config.js](tailwind.config.js): brand color tokens (`night_green`, `primary_green`, `dark_green`, `light_green`, `body_bg`, etc. — note several have duplicate alias names like `mainGreen`/`primary_green`, both are in use), custom screens (`sm920`, `lg1100`, `lg1245`, `md1372`...), and named keyframes/animations (`emersion`, `apparition`, `transformer`, `shaker`, `spinner`). Prefer existing tokens over raw hex.

### Path alias

`@/*` resolves to the repo root (see [jsconfig.json](jsconfig.json)). Use `@/components/...`, `@/lib/...`, `@/services/...`, `@/configs/...`.

## Conventions

- Components are `.jsx`; mark client components with `"use client"` at the top (see [components/Navigation.jsx](components/Navigation.jsx), [components/Providers.jsx](components/Providers.jsx)).
- All visible text is Russian — match the existing tone when adding copy.
- New top-level pages live under `app/<route>/page.jsx` and typically export a `metadata` object with `title` (the root layout template applies `%s | Onestep`).
