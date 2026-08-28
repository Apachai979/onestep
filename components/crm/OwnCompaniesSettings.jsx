"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { LuBuilding2, LuPlus, LuStar, LuX } from "react-icons/lu"
import { Badge, Button, useConfirm, useToast } from "@/components/crm/ui"
import { COUNTERPARTY_TYPE_LABELS } from "@/lib/crm/counterparty"
import SearchableSelect from "./SearchableSelect"

// Справочник наших юрлиц. Карточки остаются обычными контрагентами (обычно в
// списке дистрибьюторов) — здесь администратор только помечает, какие из них
// наши, и какое юрлицо подставлять в сделки по умолчанию.
export default function OwnCompaniesSettings() {
    const toast = useToast()
    const confirm = useConfirm()

    const [items, setItems] = useState(null)
    const [candidates, setCandidates] = useState([])
    const [pickId, setPickId] = useState("")
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        fetch("/api/crm/own-companies")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setItems(d.items || []))
            .catch(() => toast.error("Не удалось загрузить список наших компаний"))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Кандидаты — все контрагенты: наше юрлицо чаще всего заведено
    // дистрибьютором, но встречается и карточка другого типа.
    useEffect(() => {
        fetch("/api/crm/counterparties")
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d => setCandidates(d.items || []))
            .catch(() => {})
    }, [])

    async function request(url, options) {
        setBusy(true)
        try {
            const r = await fetch(url, options)
            const d = await r.json().catch(() => ({}))
            if (!r.ok) {
                toast.error(d?.error || "Не удалось выполнить действие")
                return null
            }
            setItems(d.items || [])
            return d
        } catch (err) {
            toast.error(err?.message || "Сбой сети")
            return null
        } finally {
            setBusy(false)
        }
    }

    async function handleAdd() {
        if (!pickId) return
        const d = await request("/api/crm/own-companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ counterpartyId: pickId }),
        })
        if (d) {
            setPickId("")
            toast.success("Юрлицо отмечено как наше")
        }
    }

    async function handleDefault(item) {
        const d = await request(`/api/crm/own-companies/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDefault: true }),
        })
        if (d) toast.success(`«${item.name}» — компания по умолчанию`)
    }

    async function handleRemove(item) {
        const ok = await confirm({
            title: "Убрать из наших компаний?",
            description: `«${item.name}» останется обычным контрагентом со всей историей — снимется только пометка «наша компания».`,
            confirmText: "Убрать",
            variant: "danger",
        })
        if (!ok) return
        const d = await request(`/api/crm/own-companies/${item.id}`, { method: "DELETE" })
        if (d) toast.success("Пометка снята")
    }

    const chosen = new Set((items || []).map(i => i.id))
    const options = candidates
        .filter(c => !chosen.has(c.id))
        .map(c => ({
            id: c.id,
            label: c.name,
            sublabel: [COUNTERPARTY_TYPE_LABELS[c.type], c.inn && `ИНН ${c.inn}`]
                .filter(Boolean)
                .join(" · "),
            search: `${c.name} ${c.inn || ""}`,
        }))

    return (
        <section className='rounded-2xl border border-line bg-white p-6 shadow-sm'>
            <h2 className='text-sm font-semibold text-neutral-900'>Наши компании</h2>
            <p className='mt-1 text-sm text-neutral-500'>
                Собственные юрлица, от имени которых мы продаём. Карточки остаются в
                списке контрагентов со своей историей — здесь только пометка. Компания
                по умолчанию будет подставляться в сделки.
            </p>

            <div className='mt-4 space-y-2'>
                {items === null && <p className='text-sm text-neutral-400'>Загрузка...</p>}
                {items !== null && items.length === 0 && (
                    <p className='rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-neutral-400'>
                        Наши юрлица ещё не отмечены
                    </p>
                )}
                {(items || []).map(item => (
                    <div
                        key={item.id}
                        className='flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface_muted/40 px-3 py-2.5'
                    >
                        <LuBuilding2 className='h-4 w-4 shrink-0 text-neutral-400' />
                        <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Link
                                    href={`/crm/counterparties/${item.id}`}
                                    className='truncate text-sm font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {item.name}
                                </Link>
                                {item.isDefault && (
                                    <Badge tone='brand' size='sm'>
                                        по умолчанию
                                    </Badge>
                                )}
                            </div>
                            <p className='mt-0.5 text-xs text-neutral-500'>
                                {[
                                    COUNTERPARTY_TYPE_LABELS[item.type],
                                    item.inn && `ИНН ${item.inn}`,
                                    item.region,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                        </div>
                        {!item.isDefault && (
                            <Button
                                variant='ghost'
                                size='sm'
                                disabled={busy}
                                onClick={() => handleDefault(item)}
                            >
                                <LuStar className='h-3.5 w-3.5' />
                                Сделать основной
                            </Button>
                        )}
                        <Button
                            variant='ghost'
                            size='sm'
                            disabled={busy}
                            onClick={() => handleRemove(item)}
                        >
                            <LuX className='h-3.5 w-3.5' />
                            Убрать
                        </Button>
                    </div>
                ))}
            </div>

            <div className='mt-4 flex flex-wrap items-end gap-2'>
                <div className='min-w-[260px] flex-1'>
                    <label className='mb-1.5 block text-xs font-medium text-neutral-500'>
                        Добавить юрлицо
                    </label>
                    <SearchableSelect
                        value={pickId}
                        onChange={setPickId}
                        options={options}
                        placeholder='— Выберите контрагента —'
                        disabled={busy || items === null}
                    />
                </div>
                <Button onClick={handleAdd} disabled={!pickId || busy} loading={busy}>
                    <LuPlus className='h-4 w-4' />
                    Добавить
                </Button>
            </div>
        </section>
    )
}
