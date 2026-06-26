"use client"
import { useState } from "react"

const STATE_LABELS = {
    ACTIVE: "Действующая",
    LIQUIDATING: "Ликвидируется",
    LIQUIDATED: "Ликвидирована",
    REORGANIZING: "Реорганизуется",
    BANKRUPT: "Банкрот",
}

const CONFIG = {
    party: {
        title: "Поиск компании в DaData",
        placeholder: "ИНН / название компании",
        hint: "Введите ИНН, ОГРН, ОКПО или название компании и нажмите «Найти». При выборе компании реквизиты автоматически подставятся в форму.",
        endpoint: "/api/crm/dadata/find-party",
        renderItem: party => (
            <>
                <p className='font-medium text-night_green'>{party.name}</p>
                <p className='mt-0.5 text-xs text-gray-600'>
                    ИНН {party.inn || "—"}
                    {party.kpp ? ` · КПП ${party.kpp}` : ""}
                    {party.ogrn ? ` · ОГРН ${party.ogrn}` : ""}
                </p>
                {party.address && (
                    <p className='mt-0.5 text-xs text-gray-600'>{party.address}</p>
                )}
            </>
        ),
    },
    bank: {
        title: "Поиск банка в DaData",
        placeholder: "БИК / название банка",
        hint: "Введите БИК (9 цифр) или название банка. Подставит название, БИК и корреспондентский счёт. Расчётный счёт компании добавляется вручную.",
        endpoint: "/api/crm/dadata/find-bank",
        renderItem: bank => (
            <>
                <p className='font-medium text-night_green'>{bank.name}</p>
                <p className='mt-0.5 text-xs text-gray-600'>
                    БИК {bank.bik || "—"}
                    {bank.bankCorrAccount ? ` · корсчёт ${bank.bankCorrAccount}` : ""}
                </p>
                {bank.address && (
                    <p className='mt-0.5 text-xs text-gray-600'>{bank.address}</p>
                )}
            </>
        ),
    },
}

export default function DadataSearch({ target = "party", onPick }) {
    const cfg = CONFIG[target] || CONFIG.party
    const [query, setQuery] = useState("")
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function runSearch() {
        if (!query.trim() || loading) return
        setError("")
        setLoading(true)
        setItems(null)
        try {
            const res = await fetch(cfg.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data.error || "Ошибка поиска")
                setItems([])
                return
            }
            setItems(data.items || [])
        } finally {
            setLoading(false)
        }
    }

    function onKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault()
            runSearch()
        }
    }

    function pick(item) {
        onPick(item)
        setItems(null)
        setQuery("")
    }

    return (
        <section className='rounded-xl border border-brand_soft/40 bg-white/70 p-5'>
            <h2 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                {cfg.title}
            </h2>
            <p className='mb-3 text-xs text-gray-500'>{cfg.hint}</p>
            <div className='flex gap-2'>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={cfg.placeholder}
                    className='flex-1 rounded-lg border border-brand_soft/60 px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                />
                <button
                    type='button'
                    onClick={runSearch}
                    disabled={loading || !query.trim()}
                    className='rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
                >
                    {loading ? "Ищем..." : "Найти"}
                </button>
            </div>

            {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}

            {items && items.length === 0 && !error && (
                <p className='mt-3 text-sm text-gray-400'>Ничего не найдено.</p>
            )}

            {items && items.length > 0 && (
                <ul className='mt-3 space-y-2'>
                    {items.map((it, idx) => (
                        <li
                            key={`${it.inn || it.bik || idx}`}
                            className='rounded-lg border border-brand_soft/30 p-3 text-sm'
                        >
                            <div className='flex flex-wrap items-start justify-between gap-2'>
                                <div className='flex-1'>
                                    {cfg.renderItem(it)}
                                    {it.state && it.state !== "ACTIVE" && (
                                        <p className='mt-1 text-xs text-red-600'>
                                            {STATE_LABELS[it.state] || it.state}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type='button'
                                    onClick={() => pick(it)}
                                    className='rounded-md bg-brand_main px-3 py-1 text-xs font-semibold text-white hover:bg-brand_main/90'
                                >
                                    Подставить
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
