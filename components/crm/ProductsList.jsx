"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LuPackage, LuPlus, LuSearch } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import { EmptyState, TableSkeleton } from "@/components/crm/ui"

export default function ProductsList() {
    const router = useRouter()
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
            <div className='flex flex-wrap items-end gap-3 rounded-xl border border-brand_soft/40 bg-white/70 p-4'>
                <div className='flex-1 min-w-[220px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Поиск</label>
                    <div className='relative'>
                        <LuSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night_green/40' />
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder='Артикул, категория'
                            className='w-full rounded-lg border border-brand_soft/60 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        />
                    </div>
                </div>
                <div className='min-w-[260px]'>
                    <label className='mb-1 block text-xs text-night_green/65'>Категория</label>
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className='w-full rounded-lg border border-brand_soft/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
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
                    className='inline-flex items-center gap-2 rounded-lg bg-brand_main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                >
                    <LuPlus className='h-4 w-4' />
                    Добавить
                </Link>
            </div>

            {error && (
                <p className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='overflow-x-auto rounded-xl border border-brand_soft/40 bg-white/70'>
                <table className='w-full text-sm'>
                    <thead className='sticky top-0 z-10 bg-brand_soft/30 text-left text-xs uppercase tracking-wider text-night_green/70 backdrop-blur'>
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
                        {items === null && <TableSkeleton rows={5} cols={6} />}
                        {items?.length === 0 && (
                            <EmptyState
                                colSpan={6}
                                icon={LuPackage}
                                title='Товаров не найдено'
                                hint='Попробуйте другой запрос или добавьте новую позицию справочника.'
                            />
                        )}
                        {items?.map(p => (
                            <tr
                                key={p.id}
                                onClick={() => router.push(`/crm/products/${p.id}`)}
                                className='cursor-pointer border-t border-brand_soft/30 transition hover:bg-brand_soft/15'
                            >
                                <td className='px-4 py-3'>
                                    <Link
                                        href={`/crm/products/${p.id}`}
                                        className='font-medium text-night_green hover:text-brand_main'
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
