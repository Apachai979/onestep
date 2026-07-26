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
    note: "",
    deliveryAddress: "",
    discount: "",
    // Аукцион
    isAuction: false,
    purchaseNumber: "",
    auctionUrl: "",
    nmck: "",
    bidsDeadlineAt: "",
    auctionAt: "",
    resultsAt: "",
    participantsCount: "",
    bidsCount: "",
    winner: "",
    auctionCustomerId: "",
    auctionCustomerContactId: "",
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

// ISO (UTC) → значение для <input type="datetime-local"> в местном времени.
function isoToLocalInput(iso) {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const pad = n => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Местное значение datetime-local → ISO (UTC).
function localInputToIso(v) {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    return String(v)
}

// linkedProject — проект-источник у уже созданной сделки. Его наличие
// замораживает стороны сделки (см. DEAL_PARTIES_LOCKED_ERROR в lib/crm/access).
export default function DealForm({
    initial,
    mode = "create",
    currentUserId,
    defaultStatus,
    fromProject,
    linkedProject = null,
    defaultIsAuction = false,
}) {
    const router = useRouter()

    const [form, setForm] = useState(() => {
        if (!initial) {
            const base = {
                ...EMPTY,
                managerId: currentUserId || "",
                status: defaultStatus || "NEGOTIATION",
                isAuction: defaultIsAuction,
            }
            if (fromProject) {
                base.title = `По проекту: ${fromProject.internalName}`
                base.counterpartyId = fromProject.distributorId
                base.managerId = fromProject.managerId || currentUserId || ""
                base.sourceProjectId = fromProject.id
                // Аукцион: заказчик = конечный потребитель проекта.
                if (defaultIsAuction) base.auctionCustomerId = fromProject.endCustomerId || ""
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
            note: initial.note ?? "",
            deliveryAddress: initial.deliveryAddress ?? "",
            discount:
                initial.discount === null || initial.discount === undefined
                    ? ""
                    : String(initial.discount),
            isAuction: Boolean(initial.isAuction),
            purchaseNumber: initial.purchaseNumber ?? "",
            auctionUrl: initial.auctionUrl ?? "",
            nmck: toFormValue(initial.nmck) === "0" ? "" : toFormValue(initial.nmck),
            bidsDeadlineAt: isoToLocalInput(initial.bidsDeadlineAt),
            auctionAt: isoToLocalInput(initial.auctionAt),
            resultsAt: isoToLocalInput(initial.resultsAt),
            participantsCount: toFormValue(initial.participantsCount),
            bidsCount: toFormValue(initial.bidsCount),
            winner: initial.winner ?? "",
            auctionCustomerId: initial.auctionCustomerId ?? "",
            auctionCustomerContactId: initial.auctionCustomerContactId ?? "",
        }
    })
    const [counterparties, setCounterparties] = useState([])
    const [managers, setManagers] = useState([])
    const [contacts, setContacts] = useState([])
    const [customerContacts, setCustomerContacts] = useState([])
    const [projects, setProjects] = useState([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // fromProject/linkedProject известны сразу, список projects догружается —
    // ищем по всем трём источникам.
    function projectById(id) {
        if (!id) return null
        if (fromProject?.id === id) return fromProject
        if (linkedProject?.id === id) return linkedProject
        return projects.find(p => p.id === id) || null
    }

    const sourceProject = projectById(form.sourceProjectId)

    // Проект-источник задаёт стороны сделки: пока он выбран, клиент и заказчик
    // берутся из него и не редактируются.
    const partiesLocked = Boolean(form.sourceProjectId)
    // Саму привязку к проекту у созданной сделки тоже не меняют — иначе запрет
    // на смену сторон обходится отвязкой и повторной привязкой.
    const projectLocked = mode === "edit" && Boolean(initial?.sourceProjectId)

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

    // Контакты заказчика аукциона.
    useEffect(() => {
        if (!form.auctionCustomerId) {
            setCustomerContacts([])
            return
        }
        fetch(`/api/crm/counterparties/${form.auctionCustomerId}`)
            .then(r => r.json())
            .then(d => setCustomerContacts(d.item?.contacts || []))
            .catch(() => setCustomerContacts([]))
    }, [form.auctionCustomerId])

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
            // Аукцион: даты — в ISO; поля-заказчика чистим, если аукцион выключен.
            bidsDeadlineAt: form.isAuction ? localInputToIso(form.bidsDeadlineAt) : null,
            auctionAt: form.isAuction ? localInputToIso(form.auctionAt) : null,
            resultsAt: form.isAuction ? localInputToIso(form.resultsAt) : null,
            auctionCustomerId: form.isAuction ? form.auctionCustomerId || null : null,
            auctionCustomerContactId: form.isAuction
                ? form.auctionCustomerContactId || null
                : null,
        }
        // У сделки, уже привязанной к проекту, эти поля неизменны — не шлём их
        // вовсе, чтобы не спорить с сервером из-за старых записей, где клиент
        // разошёлся с дистрибьютором проекта.
        if (projectLocked) {
            delete payload.counterpartyId
            delete payload.sourceProjectId
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
                    description={
                        partiesLocked
                            ? "Сделка привязана к проекту — клиент и заказчик берутся из него и не редактируются."
                            : "Клиент, ответственный менеджер и привязка сделки."
                    }
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
                                disabled={partiesLocked}
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
                                onChange={id => {
                                    const p = projectById(id)
                                    setForm(prev => ({
                                        ...prev,
                                        sourceProjectId: id,
                                        // Стороны подтягиваются из проекта; контакты
                                        // сбрасываем, они принадлежали другой компании.
                                        ...(p
                                            ? {
                                                  counterpartyId: p.distributorId,
                                                  contactId:
                                                      p.distributorId === prev.counterpartyId
                                                          ? prev.contactId
                                                          : "",
                                                  auctionCustomerId: prev.isAuction
                                                      ? p.endCustomerId
                                                      : prev.auctionCustomerId,
                                                  auctionCustomerContactId:
                                                      prev.isAuction &&
                                                      p.endCustomerId !== prev.auctionCustomerId
                                                          ? ""
                                                          : prev.auctionCustomerContactId,
                                              }
                                            : {}),
                                    }))
                                }}
                                disabled={projectLocked}
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
                        <Field label='Скидка, %'>
                            <Input
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
                        </Field>
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

            <Card>
                <FormSection
                    title='Аукцион (госзакупка)'
                    description='Включите, если сделка идёт через аукцион. Появятся параметры закупки и заказчик.'
                >
                    <label className='flex cursor-pointer items-center gap-2 text-sm text-neutral-800'>
                        <input
                            type='checkbox'
                            checked={form.isAuction}
                            onChange={e => {
                                const on = e.target.checked
                                setForm(prev => ({
                                    ...prev,
                                    isAuction: on,
                                    // При включении у сделки с проектом заказчик —
                                    // конечный потребитель проекта, поле заблокировано.
                                    auctionCustomerId:
                                        on && !prev.auctionCustomerId && sourceProject
                                            ? sourceProject.endCustomerId || ""
                                            : prev.auctionCustomerId,
                                }))
                            }}
                            className='h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                        />
                        Это аукцион
                    </label>

                    {form.isAuction && (
                        <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                            <Input
                                label='Номер закупки'
                                value={form.purchaseNumber}
                                onChange={update("purchaseNumber")}
                                placeholder='Например: 0365200004425000012'
                            />
                            <Input
                                label='Ссылка на аукцион'
                                type='url'
                                value={form.auctionUrl}
                                onChange={update("auctionUrl")}
                                placeholder='https://zakupki.gov.ru/...'
                            />
                            <Input
                                label='НМЦК, ₽'
                                type='number'
                                step='0.01'
                                min='0'
                                inputMode='decimal'
                                value={form.nmck}
                                onChange={update("nmck")}
                            />
                            <Field label='Заказчик (конечный потребитель)'>
                                <SearchableSelect
                                    value={form.auctionCustomerId}
                                    onChange={id =>
                                        setForm(prev => ({
                                            ...prev,
                                            auctionCustomerId: id,
                                            auctionCustomerContactId: "",
                                        }))
                                    }
                                    disabled={partiesLocked}
                                    placeholder='— Не выбран —'
                                    options={counterpartyOptions}
                                />
                            </Field>
                            <Field label='Контакт заказчика'>
                                <SearchableSelect
                                    value={form.auctionCustomerContactId}
                                    onChange={id =>
                                        setForm(prev => ({
                                            ...prev,
                                            auctionCustomerContactId: id,
                                        }))
                                    }
                                    disabled={!form.auctionCustomerId}
                                    placeholder={
                                        !form.auctionCustomerId
                                            ? "Сначала выберите заказчика"
                                            : customerContacts.length === 0
                                              ? "У заказчика нет контактов"
                                              : "— Не выбран —"
                                    }
                                    options={customerContacts.map(c => ({
                                        id: c.id,
                                        label: contactName(c),
                                        search: `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`,
                                    }))}
                                />
                            </Field>
                            <Input
                                label='Окончание сбора заявок'
                                type='datetime-local'
                                value={form.bidsDeadlineAt}
                                onChange={update("bidsDeadlineAt")}
                            />
                            <Input
                                label='Проведение аукциона'
                                type='datetime-local'
                                value={form.auctionAt}
                                onChange={update("auctionAt")}
                            />
                            <Input
                                label='Подведение итогов'
                                type='datetime-local'
                                value={form.resultsAt}
                                onChange={update("resultsAt")}
                            />
                            <Input
                                label='Количество заявок'
                                type='number'
                                min='0'
                                step='1'
                                value={form.bidsCount}
                                onChange={update("bidsCount")}
                            />
                            <Input
                                label='Количество участников'
                                type='number'
                                min='0'
                                step='1'
                                value={form.participantsCount}
                                onChange={update("participantsCount")}
                            />
                            <Input
                                label='Победитель'
                                containerClassName='sm:col-span-2'
                                value={form.winner}
                                onChange={update("winner")}
                                placeholder='Название организации-победителя'
                            />
                        </div>
                    )}
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
