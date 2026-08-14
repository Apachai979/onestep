"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { replaceNavUrl } from "@/lib/crm/nav-stack"

// Вид списка и его фильтры живут в адресе, а не только в состоянии компонента:
// уход в карточку размонтирует список, и на «Назад» экран должен восстановиться
// тем же, в котором работали. Побочный плюс — ссылкой на отфильтрованный список
// можно поделиться с коллегой.
//
// Адрес переписываем нативным history.replaceState: router.replace сходил бы на
// сервер за RSC-пейлоадом страницы, а вид и фильтры на серверную разметку не
// влияют — данные всё равно тянет клиент из /api/crm/*. Нагрузки эта синхрони-
// зация не добавляет вообще.
//
// replace, а не push: перебор вкладок и правка фильтров не должны копиться в
// истории и заставлять жать «Назад» десять раз, чтобы уйти со страницы.
//
// Значения по умолчанию в адрес не пишем — чистый /crm/deals таким и остаётся.
//
// Компонент, который зовёт эти хуки, должен быть обёрнут в <Suspense> — этого
// требует useSearchParams.

// Пишем только свои ключи: вкладка и фильтры сидят в одной строке запроса и
// не должны затирать друг друга.
function writeParams(values, defaults) {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    for (const [key, fallback] of Object.entries(defaults)) {
        const value = values[key]
        if (Array.isArray(fallback)) {
            if (Array.isArray(value) && value.length) params.set(key, value.join(","))
            else params.delete(key)
        } else if (typeof fallback === "boolean") {
            if (value !== fallback) params.set(key, value ? "1" : "0")
            else params.delete(key)
        } else {
            const str = value == null ? "" : String(value).trim()
            // Сравниваем с дефолтом, а не с пустотой: у списка задач дефолт —
            // «открытые», и явно выбранное «все статусы» в адрес попасть должно.
            if (str === String(fallback ?? "")) params.delete(key)
            else params.set(key, str)
        }
    }
    const qs = params.toString()
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, "", url)
    // Кнопка «Назад» в карточках ходит не по истории браузера, а по стеку
    // CRM-навигации — его верхушку надо подтянуть к новому адресу, иначе из
    // карточки вернёмся в список без отбора.
    replaceNavUrl(url)
}

// Тип значения берём из дефолта: массив → список через запятую, булево → 1/0.
function readParams(searchParams, defaults) {
    const out = { ...defaults }
    for (const [key, fallback] of Object.entries(defaults)) {
        const raw = searchParams.get(key)
        if (raw === null) continue
        if (Array.isArray(fallback)) out[key] = raw.split(",").filter(Boolean)
        else if (typeof fallback === "boolean") out[key] = raw === "1"
        else out[key] = raw
    }
    return out
}

// Вкладка списка: useTabParam(["kanban", "list"]) → ["kanban", setTab].
export function useTabParam(keys, defaultTab = keys[0], param = "tab") {
    const searchParams = useSearchParams()
    const [tab, setTabState] = useState(() => {
        const initial = searchParams.get(param)
        return keys.includes(initial) ? initial : defaultTab
    })

    function setTab(next) {
        setTabState(next)
        writeParams({ [param]: next }, { [param]: defaultTab })
    }

    return [tab, setTab]
}

// Фильтры списка. Форма объекта задаётся дефолтами — они же определяют, что
// считать «пусто» и какой тип у значения.
//
//   const { filters, setFilters, applied, apply, reset } = useUrlFilters(EMPTY_FILTERS)
//
// filters — то, что видно в полях (меняется на каждый символ),
// applied  — то, по чему уходит запрос и что попадает в адрес (после паузы),
// apply    — применить сразу, без паузы (Enter в поиске, переход из канбана),
// reset    — вернуть дефолты.
export function useUrlFilters(defaults, { delay = 300 } = {}) {
    const searchParams = useSearchParams()
    const [filters, setFilters] = useState(() => readParams(searchParams, defaults))
    const [applied, setApplied] = useState(filters)

    // Запрос идёт не на каждый символ: ждём паузы в наборе.
    useEffect(() => {
        const t = setTimeout(() => setApplied(filters), delay)
        return () => clearTimeout(t)
    }, [filters, delay])

    // В адрес пишем применённое значение — по той же причине.
    useEffect(() => {
        writeParams(applied, defaults)
    }, [applied, defaults])

    function apply(next) {
        setFilters(next)
        setApplied(next)
    }

    return { filters, setFilters, applied, apply, reset: () => apply(defaults) }
}
