"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuPackage, LuPlus, LuRefreshCw, LuSearch } from "react-icons/lu"
import { formatMoney } from "@/lib/crm/format"
import {
    Button,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    Field,
    Input,
    MobileCard,
    Select,
    useToast,
} from "@/components/crm/ui"

function stockBadgeClass(stock) {
    return stock === 0
        ? "bg-red-50 text-red-700"
        : stock < 50
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
}

export default function ProductsList() {
    const router = useRouter()
    const toast = useToast()
    const [items, setItems] = useState(null)
    const [categories, setCategories] = useState([])
    const [q, setQ] = useState("")
    const [category, setCategory] = useState("")
    const [error, setError] = useState("")
    const [syncing, setSyncing] = useState(false)
    const [refreshTick, setRefreshTick] = useState(0)

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
    }, [q, category, refreshTick])

    async function syncStock() {
        setSyncing(true)
        try {
            const res = await fetch("/api/crm/stock/sync", { method: "POST" })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data?.error || "Не удалось обновить остатки", {
                    title: "Ошибка 1С",
                })
                return
            }
            const parts = []
            parts.push(`Обновлено: ${data.updated}`)
            if (data.missingCount > 0) parts.push(`не найдены в CRM: ${data.missingCount}`)
            if (data.removed > 0) parts.push(`удалено устаревших: ${data.removed}`)
            toast.success(parts.join(" · "), {
                title: "Остатки обновлены",
            })
            setRefreshTick(x => x + 1)
        } catch (err) {
            toast.error(err.message || "Сбой сети")
        } finally {
            setSyncing(false)
        }
    }

    const columns = useMemo(
        () => [
            {
                key: "sku",
                header: "Артикул",
                sortable: true,
                sortValue: p => p.sku,
                render: p => (
                    <Link
                        href={`/crm/products/${p.id}`}
                        onClick={e => e.stopPropagation()}
                        className='font-medium text-neutral-900 hover:text-brand_main'
                    >
                        {p.sku}
                    </Link>
                ),
            },
            {
                key: "category",
                header: "Наименование",
                sortable: true,
                sortValue: p => p.category,
                render: p => <span className='text-neutral-700'>{p.category}</span>,
            },
            {
                key: "stock",
                header: "Остаток, шт.",
                align: "right",
                sortable: true,
                sortValue: p => Number(p.stockTotal) || 0,
                render: p => {
                    const stock = Number(p.stockTotal) || 0
                    return (
                        <span
                            className={`inline-flex min-w-[3rem] justify-end rounded-full px-2 py-0.5 text-xs font-semibold ${stockBadgeClass(stock)}`}
                        >
                            {stock.toLocaleString("ru-RU")}
                        </span>
                    )
                },
            },
            {
                key: "basePrice",
                header: "Цена за шт.",
                align: "right",
                sortable: true,
                sortValue: p => Number(p.basePrice) || 0,
                render: p => formatMoney(p.basePrice),
            },
            {
                key: "transportPackQty",
                header: "В упак., шт.",
                align: "right",
                render: p => p.transportPackQty,
                hideable: true,
            },
            {
                key: "recommendedLpuPrice",
                header: "Реком. цена ЛПУ",
                align: "right",
                render: p =>
                    p.recommendedLpuPrice ? formatMoney(p.recommendedLpuPrice) : "—",
                hideable: true,
            },
        ],
        [],
    )

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm'>
                <Field label='Поиск' className='flex-1 min-w-[220px]'>
                    <Input
                        icon={LuSearch}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder='Артикул, наименование'
                    />
                </Field>
                <Field label='Наименование' className='min-w-[260px]'>
                    <Select value={category} onChange={e => setCategory(e.target.value)}>
                        <option value=''>Все</option>
                        {categories.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Button
                    type='button'
                    variant='secondary'
                    onClick={syncStock}
                    loading={syncing}
                    title='Загрузить остатки из 1С'
                >
                    <LuRefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    Обновить остатки
                </Button>
                <Button href='/crm/products/new'>
                    <LuPlus className='h-4 w-4' />
                    Добавить
                </Button>
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items === null && <CardListSkeleton />}
                {items?.length === 0 && (
                    <EmptyState
                        icon={LuPackage}
                        title='Товаров не найдено'
                        hint='Попробуйте другой запрос или добавьте новую позицию справочника.'
                    />
                )}
                {items?.map(p => {
                    const stock = Number(p.stockTotal) || 0
                    return (
                        <MobileCard
                            key={p.id}
                            onClick={() => router.push(`/crm/products/${p.id}`)}
                        >
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{p.sku}</span>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${stockBadgeClass(stock)}`}
                                >
                                    {stock.toLocaleString("ru-RU")} шт.
                                </span>
                            </div>
                            <p className='mt-1 text-sm text-neutral-700'>{p.category}</p>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Цена за шт.'>{formatMoney(p.basePrice)}</CardRow>
                                <CardRow label='В упак., шт.'>{p.transportPackQty}</CardRow>
                                <CardRow label='Реком. цена ЛПУ'>
                                    {p.recommendedLpuPrice
                                        ? formatMoney(p.recommendedLpuPrice)
                                        : "—"}
                                </CardRow>
                            </div>
                        </MobileCard>
                    )
                })}
            </div>

            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={p => p.id}
                    onRowClick={p => router.push(`/crm/products/${p.id}`)}
                    initialSort={{ key: "sku", dir: "asc" }}
                    empty={
                        <EmptyState
                            icon={LuPackage}
                            title='Товаров не найдено'
                            hint='Попробуйте другой запрос или добавьте новую позицию справочника.'
                        />
                    }
                />
            </div>
        </div>
    )
}
