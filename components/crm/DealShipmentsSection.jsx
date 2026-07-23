"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    SHIPMENT_STATUS_COLORS,
    SHIPMENT_STATUS_LABELS,
    calculateDealShipmentProgress,
    calculateOrderWeightVolume,
    calculateShipmentWeightVolume,
    formatVolumeM3,
    formatWeightKg,
    hasShipmentRecipient,
    isShipmentOverdue,
} from "@/lib/crm/shipment"
import { formatMoney } from "@/lib/crm/format"
import { useConfirm, useToast } from "@/components/crm/ui"
import PhoneLink from "@/components/crm/PhoneLink"
import ShipmentRecipient from "@/components/crm/ShipmentRecipient"

function num(v) {
    if (v === null || v === undefined || v === "") return 0
    const s = typeof v === "object" && v.toString ? v.toString() : String(v)
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : 0
}

function fmtQty(v) {
    const n = num(v)
    return (Math.round(n * 1000) / 1000).toString().replace(".", ",")
}

function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ru-RU")
}

function fmtDateTime(d) {
    if (!d) return "—"
    return new Date(d).toLocaleString("ru-RU")
}

function contactName(c) {
    if (!c) return ""
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || ""
}

function dateForInput(d) {
    if (!d) return ""
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ""
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, "0")
    const day = String(dt.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

const EMPTY_FORM = {
    status: "DRAFT",
    plannedDate: "",
    deliveryAddress: "",
    carrier: "",
    trackingNumber: "",
    recipientMode: "contact", // "contact" | "manual"
    recipientContactId: "",
    recipientName: "",
    recipientPhone: "",
    recipientEmail: "",
    docNumber: "",
    note: "",
}

// readOnly — сделка заморожена (см. lib/crm/access.js): отгрузки только
// смотрим, создавать и менять их нельзя.
export default function DealShipmentsSection({
    dealId,
    dealItems,
    dealDiscount = null,
    counterpartyId,
    initialDeliveryAddress,
    readOnly = false,
}) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()
    const [shipments, setShipments] = useState([])
    const [contacts, setContacts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [items, setItems] = useState([])
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await fetch(`/api/crm/shipments?dealId=${dealId}`)
            const d = await r.json()
            setShipments(d.items || [])
        } catch {
            setShipments([])
        }
        setLoading(false)
    }, [dealId])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (!counterpartyId) return
        fetch(`/api/crm/counterparties/${counterpartyId}`)
            .then(r => r.json())
            .then(d => setContacts(d.item?.contacts || []))
            .catch(() => setContacts([]))
    }, [counterpartyId])

    const deal = useMemo(
        () => ({ items: dealItems, shipments, discount: dealDiscount }),
        [dealItems, shipments, dealDiscount],
    )

    const progress = useMemo(() => calculateDealShipmentProgress(deal), [deal])
    const totalWV = useMemo(
        () => calculateOrderWeightVolume(dealItems),
        [dealItems],
    )

    function resetForm(prefill = {}) {
        setForm({
            ...EMPTY_FORM,
            deliveryAddress: initialDeliveryAddress || "",
            ...prefill,
        })
        setItems([])
        setError("")
    }

    function startAdd() {
        setEditingId(null)
        resetForm()
        const remainingItems = dealItems
            .filter(di => {
                const row = progress.byItem[di.id]
                return row && row.remaining > 0
            })
            .map(di => ({
                dealItemId: di.id,
                quantity: String(progress.byItem[di.id]?.remaining ?? 0),
                note: "",
            }))
        setItems(remainingItems)
        setShowForm(true)
    }

    function startEdit(sh) {
        setEditingId(sh.id)
        const hasManual = sh.recipientName || sh.recipientPhone || sh.recipientEmail
        setForm({
            status: sh.status,
            plannedDate: dateForInput(sh.plannedDate),
            deliveryAddress: sh.deliveryAddress || "",
            carrier: sh.carrier || "",
            trackingNumber: sh.trackingNumber || "",
            recipientMode: sh.recipientContactId || !hasManual ? "contact" : "manual",
            recipientContactId: sh.recipientContactId || "",
            recipientName: sh.recipientName || "",
            recipientPhone: sh.recipientPhone || "",
            recipientEmail: sh.recipientEmail || "",
            docNumber: sh.docNumber || "",
            note: sh.note || "",
        })
        setItems(
            (sh.items || []).map(it => ({
                dealItemId: it.dealItemId,
                quantity: typeof it.quantity === "string" ? it.quantity : String(it.quantity),
                note: it.note || "",
            })),
        )
        setError("")
        setShowForm(true)
    }

    function cancel() {
        setShowForm(false)
        setEditingId(null)
        setError("")
    }

    function updateField(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    function addItemRow() {
        const used = new Set(items.map(i => i.dealItemId))
        const candidate = dealItems.find(di => !used.has(di.id))
        if (!candidate) return
        const remaining =
            progress.byItem[candidate.id]?.remaining ??
            num(candidate.quantity)
        setItems(prev => [
            ...prev,
            {
                dealItemId: candidate.id,
                quantity: String(remaining || 0),
                note: "",
            },
        ])
    }

    function removeItemRow(idx) {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    function updateItem(idx, field, value) {
        setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setSaving(true)

        const useContact = form.recipientMode === "contact"
        const { recipientMode: _ignored, ...rest } = form
        const payload = {
            ...rest,
            plannedDate: form.plannedDate || null,
            recipientContactId: useContact ? form.recipientContactId || null : null,
            recipientName: useContact ? null : form.recipientName || null,
            recipientPhone: useContact ? null : form.recipientPhone || null,
            recipientEmail: useContact ? null : form.recipientEmail || null,
            items: items
                .filter(i => i.dealItemId && Number(i.quantity) > 0)
                .map(i => ({
                    dealItemId: i.dealItemId,
                    quantity: i.quantity,
                    note: i.note || null,
                })),
        }
        if (!editingId) payload.dealId = dealId

        const url = editingId ? `/api/crm/shipments/${editingId}` : "/api/crm/shipments"
        const method = editingId ? "PATCH" : "POST"
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось сохранить отгрузку")
            setSaving(false)
            return
        }
        await load()
        cancel()
        setSaving(false)
        router.refresh()
    }

    async function setStatus(id, status) {
        const res = await fetch(`/api/crm/shipments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось изменить статус")
            return
        }
        toast.success("Статус отгрузки обновлён")
        await load()
        router.refresh()
    }

    async function remove(id) {
        const sh = shipments.find(s => s.id === id)
        const ok = await confirm({
            title: "Удалить отгрузку?",
            description: sh?.number ? `Номер: ${sh.number}` : undefined,
            confirmText: "Удалить",
            variant: "danger",
        })
        if (!ok) return
        const res = await fetch(`/api/crm/shipments/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || "Не удалось удалить")
            return
        }
        toast.success("Отгрузка удалена")
        await load()
        router.refresh()
    }

    const usedDealItemIds = new Set(items.map(i => i.dealItemId))
    const hasMoreToAdd = dealItems.some(di => !usedDealItemIds.has(di.id))
    const fullyShippedBanner = progress.isFullyShipped

    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h2 className='text-sm font-semibold text-neutral-900'>
                    Отгрузки
                </h2>
                {!readOnly && !showForm && dealItems.length > 0 && (
                    <button
                        type='button'
                        onClick={startAdd}
                        className='rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                    >
                        + Новая отгрузка
                    </button>
                )}
            </div>

            {dealItems.length === 0 ? (
                <p className='text-sm text-neutral-400'>
                    Сначала добавьте товарные позиции в сделку.
                </p>
            ) : (
                <>
                    <ProgressBlock
                        progress={progress}
                        dealItems={dealItems}
                        totalWV={totalWV}
                    />

                    {fullyShippedBanner && (
                        <div className='mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                            Все позиции отгружены полностью.
                        </div>
                    )}

                    {showForm && !readOnly && (
                        <form
                            onSubmit={handleSubmit}
                            className='mt-4 space-y-4 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'
                        >
                            <h3 className='text-sm font-semibold text-neutral-900'>
                                {editingId ? "Изменить отгрузку" : "Новая отгрузка"}
                            </h3>

                            <div className='grid gap-3 sm:grid-cols-2'>
                                <Field label='Статус'>
                                    <select
                                        value={form.status}
                                        onChange={updateField("status")}
                                        className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                    >
                                        <option value='DRAFT'>Черновик</option>
                                        <option value='SHIPPED'>Отгружена</option>
                                    </select>
                                </Field>
                                <Field label='Плановая дата'>
                                    <input
                                        type='date'
                                        value={form.plannedDate}
                                        onChange={updateField("plannedDate")}
                                        className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                    />
                                </Field>
                            </div>

                            <Field label='Адрес доставки'>
                                <input
                                    value={form.deliveryAddress}
                                    onChange={updateField("deliveryAddress")}
                                    placeholder='По умолчанию — адрес из сделки или контрагента'
                                    className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                />
                            </Field>

                            <div className='rounded-lg border border-line bg-surface_muted p-3'>
                                <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                        Получатель
                                    </p>
                                    <div className='inline-flex rounded-md border border-line bg-white p-0.5 text-xs'>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                setForm(p => ({
                                                    ...p,
                                                    recipientMode: "contact",
                                                }))
                                            }
                                            className={`rounded-lg px-2 py-1 transition-colors ${
                                                form.recipientMode === "contact"
                                                    ? "bg-brand_main text-white"
                                                    : "text-neutral-500 hover:bg-surface_muted"
                                            }`}
                                        >
                                            Из контактов клиента
                                        </button>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                setForm(p => ({
                                                    ...p,
                                                    recipientMode: "manual",
                                                }))
                                            }
                                            className={`rounded-lg px-2 py-1 transition-colors ${
                                                form.recipientMode === "manual"
                                                    ? "bg-brand_main text-white"
                                                    : "text-neutral-500 hover:bg-surface_muted"
                                            }`}
                                        >
                                            Свободный ввод
                                        </button>
                                    </div>
                                </div>

                                {form.recipientMode === "contact" ? (
                                    <>
                                        <select
                                            value={form.recipientContactId}
                                            onChange={updateField("recipientContactId")}
                                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                        >
                                            <option value=''>— Не выбран —</option>
                                            {contacts.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {contactName(c)}
                                                </option>
                                            ))}
                                        </select>
                                        {(() => {
                                            const c = contacts.find(
                                                x => x.id === form.recipientContactId,
                                            )
                                            if (!c) return null
                                            return c.phone || c.email ? (
                                                <p className='mt-1.5 text-xs text-neutral-500'>
                                                    <PhoneLink phone={c.phone} />
                                                    {c.phone && c.email && " · "}
                                                    {c.email}
                                                </p>
                                            ) : (
                                                <p className='mt-1.5 text-xs italic text-neutral-400'>
                                                    У контакта не указаны телефон/email
                                                </p>
                                            )
                                        })()}
                                    </>
                                ) : (
                                    <div className='grid gap-2 sm:grid-cols-3'>
                                        <input
                                            value={form.recipientName}
                                            onChange={updateField("recipientName")}
                                            placeholder='Имя'
                                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                        />
                                        <input
                                            value={form.recipientPhone}
                                            onChange={updateField("recipientPhone")}
                                            placeholder='Телефон'
                                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                        />
                                        <input
                                            value={form.recipientEmail}
                                            onChange={updateField("recipientEmail")}
                                            placeholder='Email'
                                            className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                        />
                                    </div>
                                )}
                            </div>

                            <div className='grid gap-3 sm:grid-cols-3'>
                                <Field label='Перевозчик'>
                                    <input
                                        value={form.carrier}
                                        onChange={updateField("carrier")}
                                        className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                    />
                                </Field>
                                <Field label='Трек-номер'>
                                    <input
                                        value={form.trackingNumber}
                                        onChange={updateField("trackingNumber")}
                                        className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                    />
                                </Field>
                                <Field label='№ ТТН / документа'>
                                    <input
                                        value={form.docNumber}
                                        onChange={updateField("docNumber")}
                                        className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                    />
                                </Field>
                            </div>

                            <Field label='Комментарий'>
                                <textarea
                                    rows={2}
                                    value={form.note}
                                    onChange={updateField("note")}
                                    className='w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                />
                            </Field>

                            <div>
                                <div className='mb-2 flex items-center justify-between'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                                        Позиции отгрузки
                                    </p>
                                    {hasMoreToAdd && (
                                        <button
                                            type='button'
                                            onClick={addItemRow}
                                            className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                                        >
                                            + Добавить позицию
                                        </button>
                                    )}
                                </div>
                                {items.length === 0 && (
                                    <p className='text-xs text-neutral-400'>
                                        Добавьте хотя бы одну позицию.
                                    </p>
                                )}
                                {items.map((row, idx) => {
                                    const di = dealItems.find(d => d.id === row.dealItemId)
                                    const remainingBase = di
                                        ? progress.byItem[di.id]?.remaining ?? 0
                                        : 0
                                    let max = remainingBase
                                    if (editingId) {
                                        const before = (
                                            shipments.find(s => s.id === editingId)?.items || []
                                        ).find(i => i.dealItemId === row.dealItemId)
                                        const prevQty = before ? num(before.quantity) : 0
                                        max = remainingBase + prevQty
                                    }
                                    return (
                                        <div
                                            key={idx}
                                            className='mb-2 grid items-end gap-2 rounded-md border border-line p-2 sm:grid-cols-12'
                                        >
                                            <div className='sm:col-span-6'>
                                                <label className='mb-1 block text-[10px] uppercase text-neutral-500'>
                                                    Позиция сделки
                                                </label>
                                                <select
                                                    value={row.dealItemId}
                                                    onChange={e =>
                                                        updateItem(idx, "dealItemId", e.target.value)
                                                    }
                                                    className='w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                                >
                                                    {dealItems.map(opt => (
                                                        <option
                                                            key={opt.id}
                                                            value={opt.id}
                                                            disabled={
                                                                opt.id !== row.dealItemId &&
                                                                usedDealItemIds.has(opt.id)
                                                            }
                                                        >
                                                            {opt.sku ? `${opt.sku} · ` : ""}
                                                            {opt.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className='sm:col-span-2'>
                                                <div className='mb-1 flex items-baseline justify-between gap-1'>
                                                    <label className='block text-[10px] uppercase text-neutral-500'>
                                                        Кол-во
                                                    </label>
                                                    <span className='text-[10px] text-neutral-500'>
                                                        ост. {fmtQty(max)}
                                                    </span>
                                                </div>
                                                <input
                                                    type='number'
                                                    step='0.001'
                                                    min='0'
                                                    max={max}
                                                    value={row.quantity}
                                                    onChange={e =>
                                                        updateItem(idx, "quantity", e.target.value)
                                                    }
                                                    className='w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                                />
                                            </div>
                                            <div className='sm:col-span-3'>
                                                <label className='mb-1 block text-[10px] uppercase text-neutral-500'>
                                                    Комментарий
                                                </label>
                                                <input
                                                    value={row.note}
                                                    onChange={e =>
                                                        updateItem(idx, "note", e.target.value)
                                                    }
                                                    className='w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-neutral-900 shadow-sm transition-all duration-200 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20'
                                                />
                                            </div>
                                            <div className='sm:col-span-1 text-right'>
                                                <button
                                                    type='button'
                                                    onClick={() => removeItemRow(idx)}
                                                    className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
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
                                    disabled={saving}
                                    className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:opacity-60'
                                >
                                    {saving
                                        ? "Сохраняем..."
                                        : editingId
                                          ? "Сохранить"
                                          : "Создать"}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className='mt-5 space-y-3'>
                        {loading && (
                            <p className='text-sm text-neutral-400'>Загрузка отгрузок...</p>
                        )}
                        {!loading && shipments.length === 0 && (
                            <p className='text-sm text-neutral-400'>Отгрузок ещё нет.</p>
                        )}
                        {shipments.map(sh => (
                            <ShipmentRow
                                key={sh.id}
                                shipment={sh}
                                dealItems={dealItems}
                                readOnly={readOnly}
                                onEdit={() => startEdit(sh)}
                                onShip={() => setStatus(sh.id, "SHIPPED")}
                                onReopen={() => setStatus(sh.id, "DRAFT")}
                                onDelete={() => remove(sh.id)}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}

function ProgressBlock({ progress, dealItems, totalWV }) {
    return (
        <div className='rounded-lg border border-line bg-surface_muted p-3'>
            <div className='mb-2 flex items-center justify-between text-xs'>
                <span className='font-medium text-neutral-700'>
                    Прогресс отгрузки: {progress.percent}%
                </span>
                <span className='text-neutral-500'>
                    Отгружено {fmtQty(progress.totalShipped)} из {fmtQty(progress.totalOrdered)}
                    {progress.totalRemaining > 0 && (
                        <> · остаток {fmtQty(progress.totalRemaining)}</>
                    )}
                </span>
            </div>
            {progress.amountOrderedGross > 0 && (
                <div className='mb-2 text-right text-xs text-neutral-500'>
                    Отгружено на{" "}
                    <span className='font-medium text-neutral-800'>
                        {formatMoney(progress.amountShipped)}
                    </span>{" "}
                    из {formatMoney(progress.amountOrdered)}
                    {progress.amountRemaining > 0 && (
                        <>
                            {" "}
                            · остаток{" "}
                            <span className='font-medium text-amber-700'>
                                {formatMoney(progress.amountRemaining)}
                            </span>
                        </>
                    )}
                    {progress.discountPercent > 0 && (
                        <span className='ml-1 text-neutral-400'>
                            (со скидкой {fmtQty(progress.discountPercent)} %)
                        </span>
                    )}
                </div>
            )}
            {totalWV && (totalWV.weight > 0 || totalWV.volume > 0) && (
                <div className='mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600'>
                    <span>
                        Вес заказа:{" "}
                        <span className='font-medium text-neutral-800'>
                            {formatWeightKg(totalWV.weight)}
                        </span>
                    </span>
                    <span>
                        Объём заказа:{" "}
                        <span className='font-medium text-neutral-800'>
                            {formatVolumeM3(totalWV.volume)}
                        </span>
                    </span>
                    {totalWV.incomplete && (
                        <span className='text-amber-700'>
                            (не у всех товаров задан вес/объём)
                        </span>
                    )}
                </div>
            )}
            <div className='h-2 w-full overflow-hidden rounded-full bg-neutral-200'>
                <div
                    className='h-full bg-brand_main transition-all'
                    style={{ width: `${progress.percent}%` }}
                />
            </div>
            <div className='mt-3 space-y-1.5'>
                {dealItems.map(di => {
                    const row = progress.byItem[di.id]
                    if (!row) return null
                    const pct =
                        row.ordered > 0
                            ? Math.min(100, Math.round((row.shipped / row.ordered) * 100))
                            : 0
                    return (
                        <div key={di.id} className='text-xs'>
                            <div className='mb-0.5 flex items-center justify-between gap-2'>
                                <span className='truncate text-neutral-700'>
                                    {di.sku ? `${di.sku} · ` : ""}
                                    {di.name}
                                </span>
                                <span className='shrink-0 text-neutral-500'>
                                    {fmtQty(row.shipped)} / {fmtQty(row.ordered)}
                                    {row.remaining > 0 && (
                                        <span className='ml-1 text-amber-700'>
                                            (ост. {fmtQty(row.remaining)})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className='h-1.5 w-full overflow-hidden rounded-full bg-neutral-200'>
                                <div
                                    className={`h-full transition-all ${
                                        pct === 100 ? "bg-emerald-500" : "bg-brand_main"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function ShipmentRow({ shipment, dealItems, readOnly, onEdit, onShip, onReopen, onDelete }) {
    const overdue = isShipmentOverdue(shipment)
    const itemsById = new Map(dealItems.map(di => [di.id, di]))
    const wv = calculateShipmentWeightVolume(shipment)
    return (
        <div
            className={`rounded-lg border p-3 ${
                overdue ? "border-red-300 bg-red-50/40" : "border-line"
            }`}
        >
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-mono text-sm font-semibold text-neutral-900'>
                        {shipment.number}
                    </span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_COLORS[shipment.status]}`}
                    >
                        {SHIPMENT_STATUS_LABELS[shipment.status]}
                    </span>
                    {overdue && (
                        <span className='rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700'>
                            Просрочена
                        </span>
                    )}
                </div>
                <div className='flex flex-wrap gap-1.5'>
                    <Link
                        href={`/crm/shipments/${shipment.id}`}
                        className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                    >
                        Открыть
                    </Link>
                    {!readOnly && (
                        <>
                            <button
                                type='button'
                                onClick={onEdit}
                                className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                            >
                                Изменить
                            </button>
                            {shipment.status === "DRAFT" && (
                                <button
                                    type='button'
                                    onClick={onShip}
                                    className='rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700'
                                >
                                    Отгрузить
                                </button>
                            )}
                            {shipment.status === "SHIPPED" && (
                                <button
                                    type='button'
                                    onClick={onReopen}
                                    className='rounded-md border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                                >
                                    В черновик
                                </button>
                            )}
                            <button
                                type='button'
                                onClick={onDelete}
                                className='rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
                            >
                                Удалить
                            </button>
                        </>
                    )}
                </div>
            </div>

            <dl className='mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-4'>
                <Meta label='Плановая' value={fmtDate(shipment.plannedDate)} />
                <Meta
                    label='Отгружена'
                    value={
                        shipment.shippedAt ? fmtDateTime(shipment.shippedAt) : "—"
                    }
                />
                <Meta label='Перевозчик' value={shipment.carrier || "—"} />
                <Meta label='Трек' value={shipment.trackingNumber || "—"} />
                <Meta
                    label='Вес'
                    value={`${formatWeightKg(wv.weight)}${wv.incomplete ? " *" : ""}`}
                />
                <Meta
                    label='Объём'
                    value={`${formatVolumeM3(wv.volume)}${wv.incomplete ? " *" : ""}`}
                />
                {shipment.docNumber && (
                    <Meta label='ТТН' value={shipment.docNumber} />
                )}
                {hasShipmentRecipient(shipment) && (
                    <Meta label='Получатель' value={<ShipmentRecipient shipment={shipment} />} />
                )}
                {shipment.deliveryAddress && (
                    <Meta
                        label='Адрес'
                        value={shipment.deliveryAddress}
                        className='sm:col-span-4'
                    />
                )}
            </dl>

            <div className='mt-2 rounded-md border border-line bg-white px-3 py-2 text-xs'>
                {(shipment.items || []).map(it => {
                    const di = itemsById.get(it.dealItemId)
                    const name = di
                        ? `${di.sku ? di.sku + " · " : ""}${di.name}`
                        : "—"
                    return (
                        <div
                            key={it.id}
                            className='flex items-center justify-between border-b border-dashed border-line py-1 last:border-b-0'
                        >
                            <span className='truncate pr-2 text-neutral-700'>{name}</span>
                            <span className='shrink-0 font-medium text-neutral-800'>
                                {fmtQty(it.quantity)}
                            </span>
                        </div>
                    )
                })}
            </div>

            {shipment.note && (
                <p className='mt-2 whitespace-pre-wrap text-xs text-neutral-500'>
                    {shipment.note}
                </p>
            )}
        </div>
    )
}

function Field({ label, children }) {
    return (
        <div>
            <label className='mb-1 block text-xs text-neutral-500'>{label}</label>
            {children}
        </div>
    )
}

function Meta({ label, value, className = "" }) {
    return (
        <div className={className}>
            <dt className='text-[10px] uppercase tracking-wide text-neutral-500'>{label}</dt>
            <dd className='text-neutral-800'>{value}</dd>
        </div>
    )
}
