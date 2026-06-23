"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { formatMoney } from "@/lib/crm/format"

export default function ProductsList() {
    const [items, setItems] = useState(null)
    const [categories, setCategories] = useState([])
    const [q, setQ] = useState("")
    const [category, setCategory] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams()
        if (q.trim()) params.set("q", q.trim())
        if (category) params.set("category", category)

        setError("")
        fetch(`/api/crm/products?${params.toString()}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(d => {
                setItems(d.items)
                setCategories(d.categories || [])
            })
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setItems([])
            })

        return () => controller.abort()
    }, [q, category])

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3'>
                <div className='flex-1 min-w-[220px]'>
                    <label className='mb-1 block text-xs text-gray-600'>Поиск</label>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Артикул, категория'
                        className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    />
                </div>
                <div className='min-w-[260px]'>
                    <label className='mb-1 block text-xs text-gray-600'>Категория</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary_green focus:outline-none'
                    >
                        <option value=''>Все</option>
                        {categories.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <Link
                    href='/crm/products/new'
                    className='rounded-lg bg-primary_green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-contrast_green'
                >
                    Добавить
                </Link>
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                        <tr>
                            <th className='px-4 py-3'>Артикул</th>
                            <th className='px-4 py-3'>Категория</th>
                            <th className='px-4 py-3 text-right'>Цена за шт.</th>
                            <th className='px-4 py-3 text-right'>Цена упак.</th>
                            <th className='px-4 py-3 text-right'>В упак., шт.</th>
                            <th className='px-4 py-3 text-right'>Реком. цена ЛПУ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && (
                            <tr>
                                <td colSpan={6} className='px-4 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={6} className='px-4 py-6 text-center text-gray-400'>
                                    Товаров не найдено
                                </td>
                            </tr>
                        )}
                        {items?.map(p => (
                            <tr key={p.id} className='border-t border-gray-100 hover:bg-gray-50'>
                                <td className='px-4 py-3'>
                                    <Link
                                        href={`/crm/products/${p.id}`}
                                        className='font-medium text-night_green hover:text-primary_green'
                                    >
                                        {p.sku}
                                    </Link>
                                </td>
                                <td className='px-4 py-3 text-gray-700'>{p.category}</td>
                                <td className='px-4 py-3 text-right text-gray-700'>
                                    {formatMoney(p.basePrice)}
                                </td>
                                <td className='px-4 py-3 text-right text-gray-700'>
                                    {formatMoney(p.packagePrice)}
                                </td>
                                <td className='px-4 py-3 text-right text-gray-700'>
                                    {p.transportPackQty}
                                </td>
                                <td className='px-4 py-3 text-right text-gray-700'>
                                    {p.recommendedLpuPrice
                                        ? formatMoney(p.recommendedLpuPrice)
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
