/**
 * Адаптер для синхронизации с 1С Erp.
 * Креды хранятся в переменных окружения:
 *   ONEC_STOCK_URL       — полный URL метода (например, https://1c.onestepmed.ru:3059/erp/hs/stock_api/stock)
 *   ONEC_STOCK_USERNAME  — логин
 *   ONEC_STOCK_PASSWORD  — пароль
 *
 * Если 1С использует самоподписанный сертификат — на проде стоит добавить корневой сертификат
 * через NODE_EXTRA_CA_CERTS. На время разработки можно временно выставить
 * NODE_TLS_REJECT_UNAUTHORIZED=0 (не для прод).
 */
function readConfig() {
    const url = process.env.ONEC_STOCK_URL
    const username = process.env.ONEC_STOCK_USERNAME
    const password = process.env.ONEC_STOCK_PASSWORD
    const missing = []
    if (!url) missing.push("ONEC_STOCK_URL")
    if (!username) missing.push("ONEC_STOCK_USERNAME")
    if (!password) missing.push("ONEC_STOCK_PASSWORD")
    if (missing.length) {
        const err = new Error(
            `1С: не настроены переменные окружения: ${missing.join(", ")}. ` +
                `Добавьте их в .env и перезапустите сервер.`,
        )
        err.code = "ONEC_CONFIG_MISSING"
        throw err
    }
    return { url, username, password }
}

export async function fetchStockFromOnec() {
    const { url, username, password } = readConfig()
    const credentials = Buffer.from(`${username}:${password}`).toString("base64")

    let res
    try {
        res = await fetch(url, {
            headers: { Authorization: `Basic ${credentials}` },
            cache: "no-store",
        })
    } catch (err) {
        const e = new Error(
            `1С: не удалось подключиться (${err?.cause?.code || err.message}).` +
                ` Проверьте URL и доступность сервера.`,
        )
        e.code = "ONEC_NETWORK"
        e.cause = err
        throw e
    }

    if (!res.ok) {
        const body = await res.text().catch(() => "")
        const e = new Error(
            `1С ответил ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
        )
        e.code = res.status === 401 ? "ONEC_AUTH" : "ONEC_HTTP"
        e.status = res.status
        throw e
    }

    let data
    try {
        data = await res.json()
    } catch (err) {
        const e = new Error("1С: ответ не является JSON")
        e.code = "ONEC_PARSE"
        e.cause = err
        throw e
    }

    if (!Array.isArray(data)) {
        const e = new Error("1С: ожидался массив товаров, пришло " + typeof data)
        e.code = "ONEC_SHAPE"
        throw e
    }

    return data
}
