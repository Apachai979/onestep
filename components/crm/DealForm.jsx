"use client"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import SearchableSelect from "./SearchableSelect"
import {
    Button,
    Card,
    Field,
    FormSection,
    Input,
    Select,
    Textarea,
} from "@/components/crm/ui"

const EMPTY = {
    title: "",
    counterpartyId: "",
    contactId: "",
    managerId: "",
    status: "NEGOTIATION",
    sourceProjectId: "",
    sourceAuctionId: "",
    note: "",
    deliveryAddress: "",
    discount: "",
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function managerName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function contactName(c) {
    const fn = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
    return fn || c.email || c.phone || "Контакт без имени"
}

export default function DealForm({
    initial,
    mode = "create",
    currentUserId,
    defaultStatus,
    fromProject,
    fromAuction,
}) {
    const router = useRouter()

    const [form, setForm] = useState(() => {
        if (!initial) {
            const base = {
                ...EMPTY,
                managerId: currentUserId || "",
                status: defaultStatus || "NEGOTIATION",
            }
            if (fromAuction) {
                // Сделка из аукциона: клиент — поставщик аукциона (дистрибьютор),
                // менеджер и контакт — из аукциона, привязка к аукциону и его
                // проекту. Позиции переносятся на сервере при создании.
                base.title = fromAuction.purchaseNumber
                    ? `По закупке № ${fromAuction.purchaseNumber}`
                    : "По аукциону"
                base.counterpartyId = fromAuction.supplierId || ""
                base.contactId = fromAuction.supplierContactId || ""
                base.managerId = fromAuction.managerId || currentUserId || ""
                base.sourceProjectId = fromAuction.projectId || ""
                base.sourceAuctionId = fromAuction.id
            } else if (fromProject) {
                base.title = `По проекту: ${fromProject.internalName}`
                base.counterpartyId = fromProject.distributorId
                base.managerId = fromProject.managerId || currentUserId || ""
                base.sourceProjectId = fromProject.id
            }
            return base
        }
        return {
            title: initial.title ?? "",
            counterpartyId: initial.counterpartyId ?? "",
            contactId: initial.contactId ?? "",
            managerId: initial.managerId ?? "",
            status: initial.status ?? "NEGOTIATION",
            sourceProjectId: initial.sourceProjectId ?? "",
            sourceAuctionId: initial.sourceAuctionId ?? "",
            note: initial.note ?? "",
            deliveryAddress: initial.deliveryAddress ?? "",
            discount:
                initial.discount === null || initial.discount === undefined
                    ? ""
                    : String(initial.discount),
        }
    })
    const [counterparties, setCounterparties] = useState([])
    const [managers, setManagers] = useState([])
    const [contacts, setContacts] = useState([])
    const [projects, setProjects] = useState([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // Трогал ли менеджер поле скидки вручную. Если да — авто-подстановка из
    // карточки клиента больше не перезаписывает значение. У существующей сделки
    // с уже заданной скидкой считаем её ручной, чтобы не затирать при смене клиента.
    const discountTouchedRef = useRef(
        Boolean(
            initial &&
                initial.discount !== null &&
                initial.discount !== undefined &&
                String(initial.discount) !== "",
        ),
    )

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties").then(r => r.json()),
            fetch("/api/crm/users").then(r => r.json()),
            fetch("/api/crm/projects").then(r => r.json()),
        ])
            .then(([c, u, p]) => {
                setCounterparties(c.items || [])
                setManagers(u.items || [])
                setProjects(p.items || [])
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!form.counterpartyId) {
            setContacts([])
            return
        }
        fetch(`/api/crm/counterparties/${form.counterpartyId}`)
            .then(r => r.json())
            .then(d => {
                setContacts(d.item?.contacts || [])
                // Скидку берём из карточки клиента, только если менеджер не задал её
                // вручную. Иначе (ручное значение) — не трогаем.
                if (discountTouchedRef.current) return
                const cpDiscount = d.item?.discount
                setForm(prev => ({
                    ...prev,
                    discount:
                        cpDiscount === null || cpDiscount === undefined
                            ? ""
                            : String(cpDiscount),
                }))
            })
            .catch(() => setContacts([]))
    }, [form.counterpartyId])

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    const counterpartyOptions = useMemo(
        () =>
            counterparties.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель"}${
                    c.inn ? ` · ИНН ${c.inn}` : ""
                }${c.region ? ` · ${c.region}` : ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [counterparties]
    )

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const payload = {
            ...form,
            contactId: form.contactId || null,
            sourceProjectId: form.sourceProjectId || null,
            sourceAuctionId: form.sourceAuctionId || null,
        }
        const url = mode === "create" ? "/api/crm/deals" : `/api/crm/deals/${initial.id}`
        const method = mode === "create" ? "POST" : "PATCH"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const text = await res.text()
            const data = text ? safeJson(text) : {}
            setError(data?.error || "Не удалось сохранить")
            setLoading(false)
            return
        }
        const data = await res.json()
        router.push(`/crm/deals/${data.item?.id || initial?.id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            <Card>
                <FormSection
                    title='Основное'
                    description='Клиент, ответственный менеджер и привязка сделки.'
                >
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Input
                            label='Название сделки (опц.)'
                            containerClassName='sm:col-span-2'
                            value={form.title}
                            onChange={update("title")}
                        />
                        <Field label='Клиент' required className='sm:col-span-2'>
                            <SearchableSelect
                                value={form.counterpartyId}
                                onChange={id =>
                                    setForm(prev => ({
                                        ...prev,
                                        counterpartyId: id,
                                        contactId: "",
                                    }))
                                }
                                required
                                placeholder='Введите название или ИНН'
                                options={counterpartyOptions}
                            />
                        </Field>
                        <Field label='Контактное лицо'>
                            <SearchableSelect
                                value={form.contactId}
                                onChange={id => setForm(prev => ({ ...prev, contactId: id }))}
                                disabled={!form.counterpartyId}
                                placeholder={
                                    !form.counterpartyId
                                        ? "Сначала выберите клиента"
                                        : contacts.length === 0
                                          ? "У клиента нет контактов"
                                          : "— Не выбран —"
                                }
                                options={contacts.map(c => ({
                                    id: c.id,
                                    label: contactName(c),
                                    search: `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`,
                                }))}
                            />
                        </Field>
                        <Field label='Ответственный менеджер' required>
                            <SearchableSelect
                                value={form.managerId}
                                onChange={id => setForm(prev => ({ ...prev, managerId: id }))}
                                required
                                options={managers.map(m => ({
                                    id: m.id,
                                    label: managerName(m),
                                    search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
                                }))}
                            />
                        </Field>
                        <Field label='Проект-источник' className='sm:col-span-2'>
                            <SearchableSelect
                                value={form.sourceProjectId}
                                onChange={id =>
                                    setForm(prev => ({ ...prev, sourceProjectId: id }))
                                }
                                placeholder='— Без привязки —'
                                emptyLabel='Проект не найден'
                                options={projects.map(p => ({
                                    id: p.id,
                                    label: p.internalName,
                                    sublabel: [p.distributor?.name, p.endCustomer?.name]
                                        .filter(Boolean)
                                        .join(" – "),
                                    search: `${p.internalName} ${p.distributor?.name ?? ""} ${p.endCustomer?.name ?? ""}`,
                                }))}
                            />
                        </Field>
                    </div>
                </FormSection>
            </Card>

            <Card>
                <FormSection title='Статус, доставка, примечание'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Select label='Статус' value={form.status} onChange={update("status")}>
                            {DEAL_STATUSES.map(s => (
                                <option key={s} value={s}>
                                    {DEAL_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </Select>
                        <Input
                            label='Скидка, %'
                            type='number'
                            min='0'
                            max='100'
                            step='0.01'
                            inputMode='decimal'
                            value={form.discount}
                            onChange={e => {
                                discountTouchedRef.current = true
                                setForm(prev => ({ ...prev, discount: e.target.value }))
                            }}
                            hint='Используется в КП. Меняйте, если клиенту согласована особая скидка на эту сделку.'
                        />
                        <Textarea
                            label='Адрес доставки'
                            containerClassName='sm:col-span-2'
                            rows={2}
                            value={form.deliveryAddress}
                            onChange={update("deliveryAddress")}
                            hint='Подставится в форму новой отгрузки. Уже созданные отгрузки не меняются.'
                        />
                        <Textarea
                            label='Примечание'
                            containerClassName='sm:col-span-2'
                            rows={3}
                            value={form.note}
                            onChange={update("note")}
                        />
                    </div>
                </FormSection>
            </Card>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <div className='flex justify-end gap-3'>
                <Button type='button' variant='secondary' onClick={() => router.back()}>
                    Отмена
                </Button>
                <Button type='submit' loading={loading}>
                    {mode === "create" ? "Создать" : "Сохранить"}
                </Button>
            </div>
        </form>
    )
}
