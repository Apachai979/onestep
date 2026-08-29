/**
 * Адаптер к API Tenderland — источник закупок для раздела «Закупки» в CRM.
 *
 * Переменные окружения:
 *   TENDERLAND_API_KEY          — секретный ключ (@Профиль → Панель управления API)
 *   TENDERLAND_AUTOSEARCH_ID    — id автопоиска «CRM: воронка закупок»
 *   TENDERLAND_EXPORT_VIEW_ID   — id отчёта «CRM-импорт» (набор выгружаемых полей)
 *
 * Ключ передаём заголовком Tenderland-Api-Key, а не параметром запроса: так он не
 * попадает в логи и в журнал обращений на их стороне.
 *
 * Тарификация (важно при правках): успешный запрос списывает единицу из суточного
 * лимита запросов, а каждая полученная закупка — единицу из лимита переданных
 * данных (300 в сутки, 9000 в месяц). Данные не тратят вовсе Export/Create (он
 * только считает записи) и Entity/GetEvents — на них и построена ежедневная
 * сверка, см. lib/crm/tenders.js.
 *
 * Состав автопоиска задан в их кабинете и отфильтрован по открытому приёму
 * заявок: в выдаче держится около сотни строк вместо нескольких тысяч архива.
 * На этом построена вся загрузка — выгрузка забирается целиком, без инкремента
 * на нашей стороне.
 */

const BASE_URL = "https://tenderland.ru/Api/v1"

// HTTP-статус ответа наших роутов по коду ошибки адаптера: настройки чинит
// админ (503), всё остальное — проблема на стороне Тендерлэнда или сети (502).
export const TENDERLAND_ERROR_STATUS = {
    TENDERLAND_CONFIG_MISSING: 503,
    USER_INVALID_API_KEY: 502,
    USER_DISABLE_API_MODULE: 502,
    API_REQUEST_LIMIT: 429,
    API_TOO_MANY_REQUESTS: 429,
}

// Сколько строк выгрузки готовы забрать за один прогон. Это не рабочий режим, а
// предохранитель: отфильтрованный автопоиск отдаёт около сотни строк, и кап
// нужен на случай, если фильтр в кабинете снимут — полный архив (тысячи
// закупок) иначе выест суточный лимит переданных данных за один клик.
export const SYNC_RECORD_CAP = 500

// Размер страницы при чтении результатов. Их предел — 1000, но мелкие страницы
// дешевле переигрывать, если чтение оборвётся на середине.
const BATCH_SIZE = 50

// Сколько идентификаторов кладём в один запрос событий. Документированного
// предела нет, 35 проверены живьём — сотня оставляет запас и по длине URL.
const EVENTS_CHUNK = 100

// Добор изменившихся закупок тратит лимит данных, поэтому читаем мелкими
// пачками: оборвётся на середине — потеряем меньше.
const KEYS_CHUNK = 25

// Порядок выдачи. Выгрузку вычитываем целиком, поэтому на состав он не влияет —
// важна только стабильность: страницы Export/Get берутся по offset, и
// «плавающая» сортировка перемешала бы их между запросами.
//
// orderBy — это имя поля в их поисковом индексе, оно подставляется в сортировку
// как есть: несуществующее поле роняет запрос 400-й ошибкой. Кроме
// tender_publishDate проверено tender_endDate — пригодится, если однажды
// понадобится вытащить закупки с открытым приёмом заявок вперёд выдачи.
const DEFAULT_ORDER_BY = "tender_publishDate.asc"

function readConfig() {
    const apiKey = process.env.TENDERLAND_API_KEY
    const autosearchId = process.env.TENDERLAND_AUTOSEARCH_ID
    const exportViewId = process.env.TENDERLAND_EXPORT_VIEW_ID

    const missing = []
    if (!apiKey) missing.push("TENDERLAND_API_KEY")
    if (!autosearchId) missing.push("TENDERLAND_AUTOSEARCH_ID")
    if (!exportViewId) missing.push("TENDERLAND_EXPORT_VIEW_ID")
    if (missing.length) {
        const err = new Error(
            `Tenderland: не настроены переменные окружения: ${missing.join(", ")}. ` +
                `Добавьте их в .env и перезапустите сервер.`,
        )
        err.code = "TENDERLAND_CONFIG_MISSING"
        throw err
    }
    return { apiKey, autosearchId, exportViewId }
}

async function request(path, params, apiKey) {
    const url = new URL(`${BASE_URL}/${path}`)
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
    // Без этого флага в полях со ссылками на документацию приезжает наш ключ API.
    url.searchParams.set("hideSensitiveApiData", "true")
    url.searchParams.set("format", "json")

    let res
    try {
        res = await fetch(url, {
            headers: { "Tenderland-Api-Key": apiKey },
            cache: "no-store",
        })
    } catch (err) {
        const e = new Error(
            `Tenderland: не удалось подключиться (${err?.cause?.code || err.message}).`,
        )
        e.code = "TENDERLAND_NETWORK"
        e.cause = err
        throw e
    }

    let data = null
    try {
        data = await res.json()
    } catch {
        // Разбираем ниже: на ошибке тело может быть пустым или не JSON.
    }

    if (!res.ok || data?.Success === false) {
        // Их формат ошибки: { Success, Code, Description }.
        const code = data?.Code || (res.status === 403 ? "TENDERLAND_FORBIDDEN" : "TENDERLAND_HTTP")
        const e = new Error(
            data?.Description || `Tenderland ответил ${res.status} ${res.statusText}`,
        )
        e.code = code
        e.status = res.status
        throw e
    }

    return data
}

/** Списки приходят то голым массивом, то объектом со списком внутри. */
function itemsOf(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.Items)) return data.Items
    return []
}

/**
 * Шаг 1: создаём задачу на выгрузку. Возвращает { exportId, totalCount }.
 *
 * Что попадёт в выгрузку, решает автопоиск в кабинете — своих фильтров у нас
 * нет и добавить их нечем: параметров отбора по датам в API не существует.
 * Правдоподобные имена (searchAfterEndDate, endDateFrom, actualOnly и прочие)
 * молча игнорируются, TotalCount при них не меняется — это легко принять за
 * работающий фильтр, поэтому проверять такие догадки нужно счётчиком.
 */
export async function createExport({ limit = SYNC_RECORD_CAP, orderBy = DEFAULT_ORDER_BY } = {}) {
    const { apiKey, autosearchId, exportViewId } = readConfig()

    const data = await request(
        "Export/Create",
        { autosearchId, exportViewId, limit, batchSize: BATCH_SIZE, orderBy },
        apiKey,
    )

    return {
        exportId: data?.Id ?? data?.id ?? null,
        totalCount: Number(data?.TotalCount ?? data?.totalCount ?? 0),
    }
}

/**
 * Шаг 2: читаем результат постранично.
 *
 * Страницы берём строго последовательно: параллельные запросы по одной задаче
 * они отбивают ошибкой API_TOO_MANY_REQUESTS.
 *
 * Тарифный потолок («максимальное количество единиц информации за один раз»)
 * ограничивает один ответ, а не задачу целиком: чтение с offset за пределами
 * сотни работает — проверено на выгрузке в 1000 строк.
 */
export async function readExport(exportId, totalCount, apiKey) {
    const rows = []
    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
        const page = await request("Export/Get", { exportId, offset }, apiKey)
        const items = itemsOf(page)
        if (!items.length) break
        rows.push(...items)
    }
    return rows
}

/**
 * Полный цикл: создать задачу и вычитать результат целиком.
 * Возвращает { rows, totalCount, truncated } — rows это сырые элементы выгрузки.
 */
export async function fetchTenders({ maxRecords = SYNC_RECORD_CAP, orderBy = DEFAULT_ORDER_BY } = {}) {
    const { apiKey } = readConfig()
    const { exportId, totalCount } = await createExport({ limit: maxRecords, orderBy })

    if (!exportId || !totalCount) return { rows: [], totalCount: 0, truncated: false }

    const rows = await readExport(exportId, totalCount, apiKey)
    return {
        rows,
        totalCount,
        // TotalCount — это не «сколько нашлось всего», а «сколько попало в
        // выгрузку»: с limit=25 вернётся ровно 25, даже если закупок сотни.
        // Упёрлись в кап — значит автопоиск разросся, часть закупок осталась за
        // бортом, и вызывающий обязан сказать об этом вслух.
        truncated: totalCount >= maxRecords,
    }
}

/**
 * События по закупкам: дата последнего изменения на их стороне и журнал
 * («переведена на этап "Подача заявок"», «размещён документ …»).
 *
 * Ради этого метода и построена вся сверка: он не расходует лимит переданных
 * данных, только один запрос на пачку идентификаторов. Полные данные потом
 * добираем через fetchByKeys и только по тем закупкам, где дата сдвинулась.
 *
 * Возвращает Map: tenderlandId → { lastUpdateDate: Date|null, events: [...] }.
 */
export async function fetchEvents(keys) {
    const list = [...new Set(keys)].filter(Boolean)
    if (!list.length) return new Map()

    const { apiKey } = readConfig()
    const out = new Map()

    for (let i = 0; i < list.length; i += EVENTS_CHUNK) {
        const chunk = list.slice(i, i + EVENTS_CHUNK)
        const data = await request(
            "Entity/GetEvents",
            { keys: chunk.join(","), entityTypeId: 1 },
            apiKey,
        )
        for (const item of itemsOf(data)) {
            const id = String(item?.entityId || "").trim()
            if (!id) continue
            const raw = item?.lastUpdateDate || item?.createDate || null
            const parsed = raw ? new Date(raw) : null
            out.set(id, {
                lastUpdateDate: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
                events: Array.isArray(item?.events) ? item.events : [],
            })
        }
    }

    return out
}

/**
 * Актуальные данные по конкретным закупкам (Search/Get) — тем же отчётом, что и
 * выгрузка, поэтому строки разбираются общим mapTenderRow.
 *
 * Ключом служит не только идентификатор Тендерлэнда (TL…), но и
 * регистрационный номер закупки — на этом построен ручной импорт «по номеру»
 * (lib/crm/tenders.js). Поиск идёт по всей их базе, а не по нашему автопоиску,
 * поэтому забрать можно и закупку, которую автопоиск не поймал. Номер при этом
 * не уникален: у разных процедур он повторяется (проверено живьём — на один
 * номер приехали аукцион и запрос цен разных месяцев), так что вызывающий
 * обязан быть готов к нескольким закупкам в ответе.
 *
 * Тратит по единице лимита данных на закупку, поэтому в сверке вызывается
 * только для тех, у кого fetchEvents показал сдвиг lastUpdateDate.
 */
export async function fetchByKeys(keys) {
    const list = [...new Set(keys)].filter(Boolean)
    if (!list.length) return []

    const { apiKey, exportViewId } = readConfig()
    const rows = []

    for (let i = 0; i < list.length; i += KEYS_CHUNK) {
        const chunk = list.slice(i, i + KEYS_CHUNK)
        const data = await request(
            "Search/Get",
            { keys: chunk.join(","), exportViewId, strictMatch: true },
            apiKey,
        )
        rows.push(...itemsOf(data))
    }

    return rows
}

/**
 * Сколько строк ждёт в автопоиске, не забирая их. Данные не тарифицируются —
 * годится и для проверки настроек, и для оценки объёма перед выгрузкой, и
 * чтобы убедиться, что фильтр в кабинете действительно сузил выдачу.
 */
export async function countTenders() {
    const { totalCount } = await createExport({ limit: 100000 })
    return totalCount
}
