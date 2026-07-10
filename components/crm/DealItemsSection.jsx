"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { formatMoney } from "@/lib/crm/format"
import { CardRow, MobileCard, useConfirm, useToast } from "@/components/crm/ui"

const EMPTY = { sku: "", name: "", quantity: "1", unitPrice: "", amount: "0", productId: "" }

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

function parseNum(v) {
    if (v === null || v === undefined || v === "") return NaN
    const n = Number(String(v).replace(",", "."))
    return Number.isFinite(n) ? n : NaN
}

function fmt(n) {
    if (!Number.isFinite(n)) return ""
    return (Math.round(n * 100) / 100).toString()
}

// apiBase позволяет переиспользовать секцию для других сущностей с таким же
// API позиций (например, аукционы: /api/crm/auctions/{id}).
export default function DealItemsSection({ dealId, initialItems, apiBase: apiBaseProp }) {
    const apiBase = apiBaseProp || `/api/crm/deals/${dealId}`
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()
    const [items, setItems] = useState(initialItems)
    const [products, setProducts] = useState([])
    const [form, setForm] = useState(EMPTY)
    const [editingId, setEditingId] = useState(null)
    const [showAdd, setShowAdd] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetch("/api/crm/products")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setProducts(d.items || []))
            .catch(() => setProducts([]))
    }, [])

    function startAdd() {
        setForm(EMPTY)
        setEditingId(null)
        setError("")
        setShowAdd(true)
    }

    function startEdit(item) {
        const qty = parseNum(item.quantity)
        const amt = parseNum(item.amount)
        const unit = Number.isFinite(qty) && qty > 0 ? amt / qty : NaN
        setForm({
            sku: item.sku ?? "",
            name: item.name ?? "",
            quantity: toFormValue(item.quantity),
            unitPrice: Number.isFinite(unit) ? fmt(unit) : "",
            amount: toFormValue(item.amount),
            productId: item.productId ?? "",
        })
        setEditingId(item.id)
        setError("")
        setShowAdd(false)
    }

    function cancel() {
        setShowAdd(false)
        setEditingId(null)
        setError("")
    }

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    function onQuantityChange(e) {
        // Количество — только целые числа
        const value = e.target.value.replace(/[^\d]/g, "")
        setForm(prev => {
            const qty = parseNum(value)
            const unit = parseNum(prev.unitPrice)
            const next = { ...prev, quantity: value }
            if (Number.isFinite(qty) && Number.isFinite(unit)) next.amount = fmt(qty * unit)
            return next
        })
    }

    function onUnitPriceChange(e) {
        const value = e.target.value
        setForm(prev => {
            const qty = parseNum(prev.quantity)
            const unit = parseNum(value)
            const next = { ...prev, unitPrice: value }
            if (Number.isFinite(qty) && Number.isFinite(unit)) next.amount = fmt(qty * unit)
            return next
        })
    }

    function onAmountChange(e) {
        const value = e.target.value
        setForm(prev => {
            const qty = parseNum(prev.quantity)
            const amt = parseNum(value)
            const next = { ...prev, amount: value }
            if (Number.isFinite(qty) && qty > 0 && Number.isFinite(amt)) {
                next.unitPrice = fmt(amt / qty)
            }
            return next
        })
    }

    function pickProduct(productId) {
        if (!productId) {
            setForm(prev => ({ ...prev, productId: "" }))
            return
        }
        const p = products.find(x => x.id === productId)
        if (!p) return
        const unit = parseNum(p.basePrice)
        setForm(prev => {
            const qty = parseNum(prev.quantity)
            const newQty = Number.isFinite(qty) && qty > 0 ? qty : 1
            return {
                ...prev,
                productId,
                sku: p.sku,
                name: p.category,
                quantity: String(newQty),
                unitPrice: Number.isFinite(unit) ? fmt(unit) : "",
                amount: Number.isFinite(unit) ? fmt(unit * newQty) : "",
            }
        })
    }

    async function refresh() {
        const r = await fetch(apiBase)
        if (r.ok) {
            const d = await r.json()
            setItems(d.item.items || [])
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = { ...form, productId: form.productId || null }
        const url = editingId ? `${apiBase}/items/${editingId}` : `${apiBase}/items`
        const method = editingId ? "PATCH" : "POST"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось сохранить позицию")
            setLoading(false)
            return
        }
        await refresh()
        cancel()
        setLoading(false)
        router.refresh()
    }

    async function handleDelete(id) {
        const it = items.find(x => x.id === id)
        const ok = await confirm({
            title: "Удалить позицию?",
            description: it?.name || undefined,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const res = await fetch(`${apiBase}/items/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            return
        }
        toast.success("Позиция удалена")
        await refresh()
        router.refresh()
    }

    const formOpen = showAdd || editingId !== null

    return (
        <section className='rounded-xl border border-line bg-white p-5'>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-neutral-500'>
                    Товарные позиции
                </h2>
                {!formOpen && (
                    <button
                        type='button'
                        onClick={startAdd}
                        className='rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                    >
                        Добавить позицию
                    </button>
                )}
            </div>

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items.length === 0 && (
                    <p className='rounded-lg border border-line px-3 py-4 text-center text-sm text-neutral-400'>
                        Позиций пока нет
                    </p>
                )}
                {items.map(it => (
                    <MobileCard key={it.id}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-900'>
                                {it.sku || "—"}
                            </span>
                            {it.productId && (
                                <span className='shrink-0 rounded-full bg-brand_main/10 px-2 py-0.5 text-[10px] font-medium text-neutral-900'>
                                    из справочника
                                </span>
                            )}
                        </div>
                        <p className='mt-1 text-sm text-neutral-800'>{it.name}</p>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Кол-во'>{toFormValue(it.quantity)}</CardRow>
                            <CardRow label='Сумма'>{formatMoney(it.amount)}</CardRow>
                        </div>
                        <div className='mt-3 flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={() => startEdit(it)}
                                className='rounded-md border border-line px-3 py-1.5 text-xs text-neutral-700 hover:bg-surface_muted'
                            >
                                Изменить
                            </button>
                            <button
                                type='button'
                                onClick={() => handleDelete(it.id)}
                                className='rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50'
                            >
                                Удалить
                            </button>
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden overflow-x-auto rounded-lg border border-line md:block'>
                <table className='w-full text-sm'>
                    <thead className='bg-surface_muted text-left text-xs uppercase tracking-wider text-neutral-500'>
                        <tr>
                            <th className='px-3 py-2'>Артикул</th>
                            <th className='px-3 py-2'>Наименование</th>
                            <th className='px-3 py-2 text-right'>Кол-во</th>
                            <th className='px-3 py-2 text-right'>Сумма</th>
                            <th className='px-3 py-2'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className='px-3 py-4 text-center text-neutral-400'>
                                    Позиций пока нет
                                </td>
                            </tr>
                        )}
                        {items.map(it => (
                            <tr key={it.id} className='border-t border-line'>
                                <td className='px-3 py-2 text-neutral-700'>
                                    {it.sku || "—"}
                                    {it.productId && (
                                        <span className='ml-2 rounded-full bg-brand_main/10 px-2 py-0.5 text-[10px] font-medium text-neutral-900'>
                                            из справочника
                                        </span>
                                    )}
                                </td>
                                <td className='px-3 py-2 text-neutral-800'>{it.name}</td>
                                <td className='px-3 py-2 text-right text-neutral-700'>
                                    {toFormValue(it.quantity)}
                                </td>
                                <td className='px-3 py-2 text-right text-neutral-700'>
                                    {formatMoney(it.amount)}
                                </td>
                                <td className='px-3 py-2 text-right'>
                                    <div className='flex justify-end gap-2'>
                                        <button
                                            type='button'
                                            onClick={() => startEdit(it)}
                                            className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                                        >
                                            Изменить
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() => handleDelete(it.id)}
                                            className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {formOpen && (
                <form
                    onSubmit={handleSubmit}
                    className='mt-4 space-y-3 rounded-lg border border-dashed border-brand_main/40 p-4'
                >
                    <div>
                        <label className='mb-1 block text-xs text-neutral-500'>
                            Выбрать из справочника
                        </label>
                        <select
                            value={form.productId}
                            onChange={e => pickProduct(e.target.value)}
                            className='w-full rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
                        >
                            <option value=''>— Свободный ввод —</option>
                            {products.map(p => {
                                const stock = Number(p.stockTotal) || 0
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.sku} · {p.category} · остаток: {stock.toLocaleString("ru-RU")} шт.
                                    </option>
                                )
                            })}
                        </select>
                    </div>

                    <div className='grid gap-3 sm:grid-cols-4'>
                        <Field
                            label='Артикул'
                            value={form.sku}
                            onChange={update("sku")}
                            readOnly={!!form.productId}
                            title={
                                form.productId
                                    ? "Артикул заполнен из справочника. Выберите «Свободный ввод», чтобы редактировать."
                                    : undefined
                            }
                            className={form.productId ? "opacity-70" : undefined}
                        />
                        <Field
                            label='Наименование *'
                            value={form.name}
                            onChange={update("name")}
                            required
                            className='sm:col-span-3'
                        />
                        <Field
                            label='Кол-во'
                            type='number'
                            step='1'
                            min='1'
                            inputMode='numeric'
                            value={form.quantity}
                            onChange={onQuantityChange}
                        />
                        <Field
                            label='Цена за единицу, ₽'
                            type='number'
                            step='0.01'
                            min='0'
                            inputMode='decimal'
                            value={form.unitPrice}
                            onChange={onUnitPriceChange}
                        />
                        <Field
                            label='Сумма, ₽'
                            type='number'
                            step='0.01'
                            min='0'
                            inputMode='decimal'
                            value={form.amount}
                            onChange={onAmountChange}
                            className='sm:col-span-2'
                        />
                    </div>
                    {error && <p className='text-sm text-red-600'>{error}</p>}
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={cancel}
                            className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
                        >
                            Отмена
                        </button>
                        <button
                            type='submit'
                            disabled={loading}
                            className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                        >
                            {loading ? "Сохраняем..." : editingId ? "Сохранить" : "Добавить"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    )
}

function Field({ label, className = "", ...props }) {
    return (
        <div className={className}>
            <label className='mb-1 block text-xs text-neutral-500'>{label}</label>
            <input
                {...props}
                className='w-full rounded-lg border border-line px-3 py-2 text-sm shadow-sm focus:border-brand_main focus:outline-none'
            />
        </div>
    )
}
