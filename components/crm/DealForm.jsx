"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { LuLock } from "react-icons/lu"
import {
    DEAL_AUCTION_CUSTOMER_REQUIRED_ERROR,
    DEAL_CREATE_STATUSES,
    DEAL_STATUSES,
    DEAL_STATUS_LABELS,
    dealDisplayTitle,
} from "@/lib/crm/deal"
import { discountSourceLabel, formatDiscount, inheritedDealDiscount } from "@/lib/crm/discount"
import { formatMoney } from "@/lib/crm/format"
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
    payerId: "",
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
// discountLocked — по сделке есть проведённая отгрузка, скидка участвует в её
// суммах (DEAL_DISCOUNT_SHIPPED_ERROR) и дальше не меняется.
//
// Форма разделена по принципу «сначала то, что уже известно, потом то, что
// нужно заполнить»: сделку почти всегда заводят из карточки проекта, и стороны,
// проект и скидка на этом шаге не редактируются — они показаны сводкой, а не
// заблокированными полями. Скидку и адрес доставки при создании не спрашиваем:
// скидка наследуется по цепочке (см. lib/crm/discount.js), адрес нужен только к
// моменту отгрузки. И то, и другое правится в карточке созданной сделки.
export default function DealForm({
    initial,
    mode = "create",
    currentUserId,
    defaultStatus,
    fromProject,
    linkedProject = null,
    defaultIsAuction = false,
    discountLocked = false,
}) {
    const router = useRouter()
    const isCreate = mode === "create"

    const [form, setForm] = useState(() => {
        if (!initial) {
            const base = {
                ...EMPTY,
                managerId: currentUserId || "",
                status: defaultStatus || "NEGOTIATION",
                isAuction: defaultIsAuction,
            }
            if (fromProject) {
                // Название не копируем: пустое поле title означает «по проекту»,
                // и сделка всегда показывает актуальное имя проекта
                // (см. dealDisplayTitle).
                base.counterpartyId = fromProject.distributorId
                base.managerId = fromProject.managerId || currentUserId || ""
                base.sourceProjectId = fromProject.id
                // Заказчик аукциона = конечный потребитель проекта. Ставим его
                // сразу, даже если галочка «аукцион» ещё не включена, — при
                // включении поле уже заполнено.
                base.auctionCustomerId = fromProject.endCustomerId || ""
            }
            return base
        }
        return {
            title: initial.title ?? "",
            counterpartyId: initial.counterpartyId ?? "",
            payerId: initial.payerId ?? "",
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
    // Карточка клиента целиком: из неё берём контакты, группу компаний
    // (её юрлица предлагаются как плательщики первыми) и скидку.
    const [client, setClient] = useState(null)
    const [customerContacts, setCustomerContacts] = useState([])
    const [projects, setProjects] = useState([])
    // Плательщика раскрываем по требованию — он нужен в единицах случаев.
    const [payerOpen, setPayerOpen] = useState(Boolean(initial?.payerId))
    const [error, setError] = useState("")
    // Заказчик обязателен только у аукциона — держим ошибку отдельно, чтобы
    // подсветить само поле, а не только общую плашку внизу формы.
    const [customerError, setCustomerError] = useState("")
    const [loading, setLoading] = useState(false)

    const clientGroup = client?.group ?? null

    // fromProject/linkedProject известны сразу, список projects догружается —
    // ищем по всем трём источникам.
    function projectById(id) {
        if (!id) return null
        if (fromProject?.id === id) return fromProject
        if (linkedProject?.id === id) return linkedProject
        return projects.find(p => p.id === id) || null
    }

    const sourceProject = projectById(form.sourceProjectId)

    // Как сделка будет называться с пустым полем «Название» — то же правило, что
    // и при выводе карточки.
    const autoDealTitle = dealDisplayTitle(
        { sourceProject },
        counterparties.find(c => c.id === form.counterpartyId)?.name,
    )

    // Проект-источник задаёт стороны сделки: пока он выбран, клиент и заказчик
    // берутся из него и показаны сводкой, а не полями.
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
            setClient(null)
            return
        }
        let cancelled = false
        fetch(`/api/crm/counterparties/${form.counterpartyId}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return
                setContacts(d.item?.contacts || [])
                setClient(d.item || null)
            })
            .catch(() => {
                if (cancelled) return
                setContacts([])
                setClient(null)
            })
        return () => {
            cancelled = true
        }
    }, [form.counterpartyId])

    // Скидка, которую унаследует сделка: своя скидка проекта, иначе — скидка
    // клиента (или его группы компаний).
    const inherited = useMemo(
        () => inheritedDealDiscount(sourceProject, client),
        [sourceProject, client],
    )

    // При создании скидку не спрашиваем — её ставит сервер по той же цепочке.
    // В режиме редактирования поле есть, и смена клиента подставляет в него
    // новое значение, пока менеджер не задал скидку вручную.
    useEffect(() => {
        if (isCreate || discountLocked || discountTouchedRef.current) return
        setForm(prev => ({ ...prev, discount: inherited.value ?? "" }))
    }, [isCreate, discountLocked, inherited])

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

    // Плательщик: сначала другие юрлица группы клиента (обычный случай —
    // «договор оформим на нашу вторую компанию»), затем вся база.
    const payerOptions = useMemo(() => {
        const groupIds = new Set(
            (clientGroup?.members || [])
                .map(m => m.id)
                .filter(id => id !== form.counterpartyId),
        )
        const decorate = c => ({
            ...c,
            sublabel: groupIds.has(c.id)
                ? `Юрлицо группы «${clientGroup.name}»${c.inn ? ` · ИНН ${c.inn}` : ""}`
                : c.sublabel,
        })
        const inGroup = []
        const rest = []
        for (const c of counterpartyOptions) {
            if (c.id === form.counterpartyId) continue
            ;(groupIds.has(c.id) ? inGroup : rest).push(decorate(c))
        }
        return [...inGroup, ...rest]
    }, [counterpartyOptions, clientGroup, form.counterpartyId])

    // Проекты «Проработано, нет потребности» в выборе не показываем: сервер
    // всё равно откажет в привязке (DEAL_PROJECT_NO_NEED_ERROR). Уже
    // привязанный проект приходит отдельно — linkedProject, — и от фильтра
    // здесь не зависит.
    const projectOptions = useMemo(
        () =>
            projects
                .filter(p => p.status !== "NO_NEED")
                .map(p => ({
                    id: p.id,
                    label: p.internalName,
                    sublabel: [p.distributor?.name, p.endCustomer?.name]
                        .filter(Boolean)
                        .join(" – "),
                    search: `${p.internalName} ${p.distributor?.name ?? ""} ${p.endCustomer?.name ?? ""}`,
                })),
        [projects],
    )

    // Имя стороны для сводки. Справочник контрагентов догружается, поэтому
    // сначала пробуем имена сторон проекта — они пришли с сервера сразу.
    function partyName(id) {
        if (!id) return null
        if (sourceProject?.distributorId === id && sourceProject.distributor?.name) {
            return sourceProject.distributor.name
        }
        if (sourceProject?.endCustomerId === id && sourceProject.endCustomer?.name) {
            return sourceProject.endCustomer.name
        }
        return counterparties.find(c => c.id === id)?.name || null
    }

    // Заказчик: у обычной сделки поле не сохраняется, но конечный потребитель
    // проекта в сводке всё равно полезен — показываем его.
    const customerId = form.auctionCustomerId || sourceProject?.endCustomerId || ""

    function selectProject(id) {
        const p = projectById(id)
        setForm(prev => ({
            ...prev,
            sourceProjectId: id,
            // Стороны подтягиваются из проекта; контакты сбрасываем, они
            // принадлежали другой компании.
            ...(p
                ? {
                      counterpartyId: p.distributorId,
                      contactId: p.distributorId === prev.counterpartyId ? prev.contactId : "",
                      auctionCustomerId: p.endCustomerId || "",
                      auctionCustomerContactId:
                          p.endCustomerId === prev.auctionCustomerId
                              ? prev.auctionCustomerContactId
                              : "",
                  }
                : {}),
        }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setCustomerError("")

        // Селект заказчика — не нативный input, браузерная проверка required
        // до него не достаёт.
        if (form.isAuction && !form.auctionCustomerId) {
            setCustomerError(DEAL_AUCTION_CUSTOMER_REQUIRED_ERROR)
            setError(DEAL_AUCTION_CUSTOMER_REQUIRED_ERROR)
            return
        }

        setLoading(true)

        const payload = {
            ...form,
            contactId: form.contactId || null,
            payerId: form.payerId || null,
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
        if (isCreate) {
            // Скидку ставит сервер по цепочке проект → клиент/группа, адрес
            // доставки на этом шаге не спрашиваем, итоги аукциона появятся
            // только после торгов.
            delete payload.discount
            delete payload.deliveryAddress
            delete payload.participantsCount
            delete payload.bidsCount
            delete payload.winner
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

    const inheritedLabel = discountSourceLabel(inherited)

    // Плательщик — редкий случай, поэтому спрятан за ссылкой и не мешает
    // основному сценарию. Место ему рядом с клиентом: это юрлицо его группы.
    const payerBlock = payerOpen ? (
        <Field label='Плательщик (на кого документы)'>
            <SearchableSelect
                value={form.payerId}
                onChange={id => setForm(prev => ({ ...prev, payerId: id }))}
                disabled={!form.counterpartyId}
                placeholder={
                    !form.counterpartyId ? "Сначала выберите клиента" : "— Тот же, что клиент —"
                }
                emptyLabel='Юрлицо не найдено'
                options={payerOptions}
            />
            <p className='mt-1 text-xs text-neutral-500'>
                Скидка и история остаются за клиентом.
            </p>
        </Field>
    ) : (
        <button
            type='button'
            onClick={() => setPayerOpen(true)}
            className='text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-brand_main'
        >
            Документы оформляем на другое юрлицо клиента
        </button>
    )

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            {sourceProject ? (
                <Card>
                    <FormSection
                        title='По проекту'
                        description={
                            isCreate && fromProject
                                ? "Берётся из проекта и на этом шаге не меняется — скидку и адрес доставки поправите в карточке сделки. Если проект не тот, вернитесь в нужный и создайте сделку оттуда."
                                : "Берётся из проекта и не редактируется."
                        }
                    >
                        <dl className='grid gap-x-6 gap-y-3 sm:grid-cols-2'>
                            <SummaryRow label='Проект'>
                                <Link
                                    href={`/crm/projects/${sourceProject.id}`}
                                    className='font-medium text-neutral-900 hover:text-brand_main'
                                >
                                    {sourceProject.internalName}
                                </Link>
                            </SummaryRow>
                            <SummaryRow label='Клиент (дистрибьютор)'>
                                <PartyLink
                                    id={form.counterpartyId}
                                    name={partyName(form.counterpartyId)}
                                />
                            </SummaryRow>
                            <SummaryRow
                                label={
                                    form.isAuction
                                        ? "Заказчик (конечный потребитель)"
                                        : "Конечный потребитель"
                                }
                            >
                                <PartyLink id={customerId} name={partyName(customerId)} />
                            </SummaryRow>
                            <SummaryRow label='Скидка'>
                                {inherited.value ? (
                                    <>
                                        {formatDiscount(inherited.value)}
                                        {inheritedLabel && (
                                            <span className='text-neutral-500'>
                                                {" "}
                                                — {inheritedLabel}
                                            </span>
                                        )}
                                    </>
                                ) : client ? (
                                    // Карточка клиента загружена, скидки нет ни у неё,
                                    // ни у проекта — значит её действительно нет.
                                    <span className='text-neutral-400'>не задана</span>
                                ) : (
                                    <span className='text-neutral-400'>…</span>
                                )}
                            </SummaryRow>
                            {sourceProject.itemsCount > 0 && (
                                <SummaryRow
                                    label='Позиции проекта'
                                    className='sm:col-span-2'
                                >
                                    {sourceProject.itemsCount} шт. на{" "}
                                    {formatMoney(sourceProject.itemsTotal)} — перенесутся в
                                    сделку при создании
                                </SummaryRow>
                            )}
                        </dl>
                        {payerBlock}
                        {!projectLocked && !fromProject && (
                            <button
                                type='button'
                                onClick={() => selectProject("")}
                                className='text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-brand_main'
                            >
                                Отвязать проект и выбрать стороны вручную
                            </button>
                        )}
                    </FormSection>
                </Card>
            ) : (
                <Card>
                    <FormSection
                        title='Стороны сделки'
                        description='Сделку обычно заводят из карточки проекта — тогда стороны подставляются сами. Здесь их нужно выбрать.'
                    >
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Field label='Клиент' required className='sm:col-span-2'>
                                <SearchableSelect
                                    value={form.counterpartyId}
                                    onChange={id =>
                                        setForm(prev => ({
                                            ...prev,
                                            counterpartyId: id,
                                            contactId: "",
                                            // Плательщик из прошлой группы к новому
                                            // клиенту отношения не имеет.
                                            payerId: id === prev.payerId ? "" : prev.payerId,
                                        }))
                                    }
                                    required
                                    placeholder='Введите название или ИНН'
                                    options={counterpartyOptions}
                                />
                            </Field>
                            <div className='sm:col-span-2'>{payerBlock}</div>
                            <Field label='Проект-источник' className='sm:col-span-2'>
                                <SearchableSelect
                                    value={form.sourceProjectId}
                                    onChange={selectProject}
                                    disabled={projectLocked}
                                    placeholder='— Без привязки —'
                                    emptyLabel='Проект не найден'
                                    options={projectOptions}
                                />
                                <p className='mt-1 text-xs text-neutral-500'>
                                    С проектом сделка получает его позиции, скидку и название.
                                </p>
                            </Field>
                            {form.isAuction && (
                                <Field
                                    label='Заказчик (конечный потребитель)'
                                    className='sm:col-span-2'
                                    required
                                    error={customerError}
                                >
                                    <SearchableSelect
                                        value={form.auctionCustomerId}
                                        onChange={id => {
                                            setCustomerError("")
                                            setForm(prev => ({
                                                ...prev,
                                                auctionCustomerId: id,
                                                auctionCustomerContactId: "",
                                            }))
                                        }}
                                        placeholder='— Выберите заказчика —'
                                        options={counterpartyOptions}
                                    />
                                </Field>
                            )}
                        </div>
                    </FormSection>
                </Card>
            )}

            <Card>
                <FormSection
                    title='Сделка'
                    description='То, что нужно заполнить сейчас.'
                >
                    {/* Тип сделки стоит первым: он определяет, появится ли блок
                        параметров закупки. */}
                    <label className='flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface_muted px-3 py-2.5'>
                        <input
                            type='checkbox'
                            checked={form.isAuction}
                            onChange={e => {
                                const on = e.target.checked
                                if (!on) setCustomerError("")
                                setForm(prev => ({
                                    ...prev,
                                    isAuction: on,
                                    // При включении у сделки с проектом заказчик —
                                    // конечный потребитель проекта.
                                    auctionCustomerId:
                                        on && !prev.auctionCustomerId && sourceProject
                                            ? sourceProject.endCustomerId || ""
                                            : prev.auctionCustomerId,
                                }))
                            }}
                            className='mt-0.5 h-4 w-4 rounded border-line text-brand_main focus:ring-brand_main/30'
                        />
                        <span>
                            <span className='block text-sm font-medium text-neutral-900'>
                                Это аукцион (госзакупка)
                            </span>
                            <span className='block text-xs text-neutral-500'>
                                Добавит блок с номером закупки, НМЦК и датами торгов.
                            </span>
                        </span>
                    </label>

                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Input
                                label='Название сделки (опц.)'
                                value={form.title}
                                onChange={update("title")}
                                placeholder={autoDealTitle}
                            />
                            {sourceProject && !form.title.trim() && (
                                <p className='mt-1.5 text-xs text-neutral-500'>
                                    Пока поле пустое, сделка называется по проекту и следует за его
                                    переименованиями.
                                </p>
                            )}
                        </div>
                        <Field label='Контактное лицо клиента'>
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
                        <Select label='Статус' value={form.status} onChange={update("status")}>
                            {/* Новую сделку заводят только в начале воронки —
                                дальше статус меняют в карточке. */}
                            {(isCreate ? DEAL_CREATE_STATUSES : DEAL_STATUSES).map(s => (
                                <option key={s} value={s}>
                                    {DEAL_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </Select>
                        {!isCreate && (
                            <Field label='Скидка, %'>
                                <Input
                                    type='number'
                                    min='0'
                                    max='100'
                                    step='0.01'
                                    inputMode='decimal'
                                    value={form.discount}
                                    disabled={discountLocked}
                                    onChange={e => {
                                        discountTouchedRef.current = true
                                        setForm(prev => ({ ...prev, discount: e.target.value }))
                                    }}
                                    hint={
                                        discountLocked
                                            ? "По сделке есть проведённая отгрузка — скидка зафиксирована: её правка пересчитала бы суммы уже отгруженного."
                                            : inheritedLabel && !discountTouchedRef.current
                                              ? `Подставлена ${inheritedLabel}. Используется в КП.`
                                              : "Используется в КП. Меняйте, если клиенту согласована особая скидка на эту сделку."
                                    }
                                />
                            </Field>
                        )}
                        {!isCreate && (
                            <Textarea
                                label='Адрес доставки'
                                containerClassName='sm:col-span-2'
                                rows={2}
                                value={form.deliveryAddress}
                                onChange={update("deliveryAddress")}
                                hint='Подставится в форму новой отгрузки. Уже созданные отгрузки не меняются.'
                            />
                        )}
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

            {form.isAuction && (
                <Card>
                    <FormSection
                        title='Параметры закупки'
                        description={
                            isCreate
                                ? "Итоги торгов (заявки, участники, победитель) заполняются потом, в карточке сделки."
                                : undefined
                        }
                    >
                        <div className='grid gap-4 sm:grid-cols-2'>
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
                            {/* Заказчика в сделке без проекта выбирают в первом
                                блоке — здесь он только у сделки с проектом,
                                где поле не редактируется. */}
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
                            {!isCreate && (
                                <>
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
                                </>
                            )}
                        </div>
                    </FormSection>
                </Card>
            )}

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

// Строка сводки «по проекту»: подпись мелкой капителью, как в карточках CRM,
// значение — обычным текстом. Замок в подписи показывает, что поле не
// редактируется, — вместо серого disabled-инпута, который читается как поломка.
function SummaryRow({ label, className = "", children }) {
    return (
        <div className={className}>
            <dt className='flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-400'>
                <LuLock className='h-2.5 w-2.5' />
                {label}
            </dt>
            <dd className='mt-0.5 text-sm text-neutral-900'>{children}</dd>
        </div>
    )
}

// Название стороны ссылкой на её карточку. Справочник контрагентов
// догружается — пока имени нет, показываем прочерк, а не пустое место.
function PartyLink({ id, name }) {
    if (!id) return <span className='text-neutral-400'>—</span>
    if (!name) return <span className='text-neutral-400'>…</span>
    return (
        <Link
            href={`/crm/counterparties/${id}`}
            className='font-medium text-neutral-900 hover:text-brand_main'
        >
            {name}
        </Link>
    )
}
