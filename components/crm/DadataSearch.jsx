"use client"
import { useState } from "react"
import { Button } from "@/components/crm/ui"

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
                <p className='font-medium text-neutral-900'>{party.name}</p>
                <p className='mt-0.5 text-xs text-neutral-500'>
                    ИНН {party.inn || "—"}
                    {party.kpp ? ` · КПП ${party.kpp}` : ""}
                    {party.ogrn ? ` · ОГРН ${party.ogrn}` : ""}
                </p>
                {party.address && (
                    <p className='mt-0.5 text-xs text-neutral-500'>{party.address}</p>
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
                <p className='font-medium text-neutral-900'>{bank.name}</p>
                <p className='mt-0.5 text-xs text-neutral-500'>
                    БИК {bank.bik || "—"}
                    {bank.bankCorrAccount ? ` · корсчёт ${bank.bankCorrAccount}` : ""}
                </p>
                {bank.address && (
                    <p className='mt-0.5 text-xs text-neutral-500'>{bank.address}</p>
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
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <h2 className='mb-2 text-sm font-semibold text-neutral-900'>
                {cfg.title}
            </h2>
            <p className='mb-3 text-xs text-neutral-500'>{cfg.hint}</p>
            <div className='flex gap-2'>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={cfg.placeholder}
                    className='h-10 flex-1 rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                />
                <Button type='button' onClick={runSearch} loading={loading} disabled={!query.trim()}>
                    Найти
                </Button>
            </div>

            {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}

            {items && items.length === 0 && !error && (
                <p className='mt-3 text-sm text-neutral-400'>Ничего не найдено.</p>
            )}

            {items && items.length > 0 && (
                <ul className='mt-3 space-y-2'>
                    {items.map((it, idx) => (
                        <li
                            key={`${it.inn || it.bik || idx}`}
                            className='rounded-xl border border-line p-3 text-sm'
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
                                <Button type='button' size='sm' onClick={() => pick(it)}>
                                    Подставить
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
