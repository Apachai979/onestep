"use client"
import { useState } from "react"

const STATE_LABELS = {
    ACTIVE: "Действующая",
    LIQUIDATING: "Ликвидируется",
    LIQUIDATED: "Ликвидирована",
    REORGANIZING: "Реорганизуется",
    BANKRUPT: "Банкрот",
}

export default function DadataSearch({ onPick }) {
    const [query, setQuery] = useState("")
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSearch(e) {
        e.preventDefault()
        if (!query.trim()) return
        setError("")
        setLoading(true)
        setItems(null)
        try {
            const res = await fetch("/api/crm/dadata/find-party", {
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

    function pick(item) {
        onPick(item)
        setItems(null)
        setQuery("")
    }

    return (
        <section className='rounded-xl border border-gray-200 bg-white p-5'>
            <h2 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                Поиск в DaData
            </h2>
            <p className='mb-3 text-xs text-gray-500'>
                Введите ИНН, ОГРН, ОКПО или название компании и нажмите «Найти». При выборе
                компании реквизиты автоматически подставятся в форму.
            </p>
            <form onSubmit={handleSearch} className='flex gap-2'>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='ИНН / название'
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                />
                <button
                    type='submit'
                    disabled={loading || !query.trim()}
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green disabled:cursor-not-allowed disabled:opacity-60'
                >
                    {loading ? "Ищем..." : "Найти"}
                </button>
            </form>

            {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}

            {items && items.length === 0 && !error && (
                <p className='mt-3 text-sm text-gray-400'>Ничего не найдено.</p>
            )}

            {items && items.length > 0 && (
                <ul className='mt-3 space-y-2'>
                    {items.map((it, idx) => (
                        <li
                            key={`${it.inn}-${idx}`}
                            className='rounded-lg border border-gray-100 p-3 text-sm'
                        >
                            <div className='flex flex-wrap items-start justify-between gap-2'>
                                <div className='flex-1'>
                                    <p className='font-medium text-night_green'>{it.name}</p>
                                    <p className='mt-0.5 text-xs text-gray-600'>
                                        ИНН {it.inn || "—"}
                                        {it.kpp ? ` · КПП ${it.kpp}` : ""}
                                        {it.ogrn ? ` · ОГРН ${it.ogrn}` : ""}
                                    </p>
                                    {it.address && (
                                        <p className='mt-0.5 text-xs text-gray-600'>
                                            {it.address}
                                        </p>
                                    )}
                                    {it.state && it.state !== "ACTIVE" && (
                                        <p className='mt-1 text-xs text-red-600'>
                                            {STATE_LABELS[it.state] || it.state}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type='button'
                                    onClick={() => pick(it)}
                                    className='rounded-md bg-primary_green px-3 py-1 text-xs font-semibold text-white hover:bg-contrast_green'
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
