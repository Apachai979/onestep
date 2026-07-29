"use client"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
    PROJECT_STATUSES,
    PROJECT_STATUS_LABELS,
    buildInternalName,
    isAutoInternalName,
    projectManagerLabel as managerLabel,
} from "@/lib/crm/project"
import ProjectContactsPicker from "./ProjectContactsPicker"
import SearchableSelect from "./SearchableSelect"
import {
    Button,
    Card,
    Field,
    FormSection,
    Input,
    Select,
} from "@/components/crm/ui"

const EMPTY = {
    internalName: "",
    distributorId: "",
    endCustomerId: "",
    managerId: "",
    status: "IN_PROGRESS",
    duplicateComment: "",
}

function toFormValue(v) {
    if (v === null || v === undefined) return ""
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (typeof v === "object" && typeof v.toString === "function") return v.toString()
    return String(v)
}

// Стороны проекта грузятся списками по типу контрагента. Если сторона проекта
// успела сменить тип (конечный потребитель ↔ дистрибьютор), её не будет в
// списке — подмешиваем её вручную, чтобы поле не выглядело пустым.
function withCurrentParty(list, party) {
    if (!party || list.some(x => x.id === party.id)) return list
    return [party, ...list]
}

function isoDate(d) {
    if (!d) return ""
    const x = new Date(d)
    if (Number.isNaN(x.getTime())) return ""
    return x.toISOString().slice(0, 10)
}

// partiesLocked — по проекту уже есть сделка, стороны менять нельзя
// (см. PROJECT_PARTIES_LOCKED_ERROR в lib/crm/access).
export default function ProjectForm({
    initial,
    mode = "create",
    currentUserId,
    partiesLocked = false,
}) {
    const router = useRouter()

    const [form, setForm] = useState(() => {
        if (!initial) return { ...EMPTY, managerId: currentUserId || "" }
        return {
            ...EMPTY,
            internalName: initial.internalName ?? "",
            distributorId: initial.distributorId ?? "",
            endCustomerId: initial.endCustomerId ?? "",
            managerId: initial.managerId ?? "",
            status: initial.status ?? "IN_PROGRESS",
            duplicateComment: initial.duplicateComment ?? "",
        }
    })

    const [contactIds, setContactIds] = useState(() =>
        (initial?.contacts || []).map(c => c.id),
    )
    const [refs, setRefs] = useState({ distributors: [], customers: [], managers: [] })
    const [error, setError] = useState("")
    const [duplicate, setDuplicate] = useState(null)
    const [loading, setLoading] = useState(false)

    // Все найденные проекты уже закрыты как «нет потребности» — это не дубль,
    // а просто напоминание об истории работы с потребителем.
    const allDuplicatesClosed = Boolean(
        duplicate?.items?.length && duplicate.items.every(p => p.status === "NO_NEED"),
    )

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties?type=DISTRIBUTOR").then(r => r.json()),
            fetch("/api/crm/counterparties?type=END_CUSTOMER").then(r => r.json()),
            fetch("/api/crm/users").then(r => r.json()),
        ]).then(([d, c, u]) =>
            setRefs({
                distributors: d.items || [],
                customers: c.items || [],
                managers: u.items || [],
            }),
        )
    }, [])

    const distributors = useMemo(
        () => withCurrentParty(refs.distributors, initial?.distributor),
        [refs.distributors, initial?.distributor],
    )
    const customers = useMemo(
        () => withCurrentParty(refs.customers, initial?.endCustomer),
        [refs.customers, initial?.endCustomer],
    )

    // Стороны выбраны и уже найдены в подгруженных справочниках — только тогда
    // авто-название собрано из настоящих имён, а не из прочерков.
    const autoNameReady = useMemo(
        () =>
            Boolean(
                form.distributorId &&
                    form.endCustomerId &&
                    distributors.some(x => x.id === form.distributorId) &&
                    customers.some(x => x.id === form.endCustomerId),
            ),
        [distributors, customers, form.distributorId, form.endCustomerId],
    )

    const autoInternalName = useMemo(() => {
        const d = distributors.find(x => x.id === form.distributorId)
        const c = customers.find(x => x.id === form.endCustomerId)
        return buildInternalName(d?.name, c?.name)
    }, [distributors, customers, form.distributorId, form.endCustomerId])

    // Название, заданное менеджером вручную, автоподстановка не перезаписывает.
    // У существующего проекта таким считаем название, не совпадающее с
    // авто-именем его текущих сторон.
    const nameTouchedRef = useRef(
        Boolean(
            initial?.internalName &&
                !isAutoInternalName(
                    initial.internalName,
                    initial.distributor?.name,
                    initial.endCustomer?.name,
                ),
        ),
    )

    // Смена стороны тянет за собой авто-название — иначе в карточке остаётся
    // имя с прежним контрагентом, а сделки по проекту ссылаются на него же.
    useEffect(() => {
        if (nameTouchedRef.current || !autoNameReady) return
        setForm(prev =>
            prev.internalName === autoInternalName
                ? prev
                : { ...prev, internalName: autoInternalName },
        )
    }, [autoNameReady, autoInternalName])

    const nameIsCustom =
        autoNameReady &&
        Boolean(form.internalName.trim()) &&
        form.internalName.trim() !== autoInternalName

    const nameWillChange =
        mode === "edit" &&
        !nameTouchedRef.current &&
        autoNameReady &&
        Boolean(initial?.internalName) &&
        initial.internalName !== autoInternalName

    const distributorOptions = useMemo(
        () =>
            distributors.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [distributors],
    )

    const customerOptions = useMemo(
        () =>
            customers.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [customers],
    )

    const managerOptions = useMemo(
        () =>
            refs.managers.map(m => ({
                id: m.id,
                label: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email,
                search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
            })),
        [refs.managers],
    )

    function update(field) {
        return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

    function updateInternalName(e) {
        nameTouchedRef.current = true
        const { value } = e.target
        setForm(prev => ({ ...prev, internalName: value }))
    }

    async function send(payload) {
        const url = mode === "create" ? "/api/crm/projects" : `/api/crm/projects/${initial.id}`
        const method = mode === "create" ? "POST" : "PATCH"

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (res.status === 409) {
            const data = await res.json().catch(() => ({}))
            setDuplicate({
                items: data.duplicates || [],
                requiresComment: data.requiresComment === true,
            })
            return { dup: true }
        }

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            return { error: data.error || "Не удалось сохранить" }
        }

        const data = await res.json()
        return { id: data.item?.id || initial?.id }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setDuplicate(null)
        setLoading(true)

        const payload = {
            ...form,
            internalName: form.internalName.trim() || null,
            contactIds,
        }
        if (partiesLocked) {
            delete payload.distributorId
            delete payload.endCustomerId
        }

        const res = await send(payload)
        setLoading(false)

        if (res.dup) return
        if (res.error) {
            setError(res.error)
            return
        }
        router.push(`/crm/projects/${res.id}`)
        router.refresh()
    }

    async function handleForceCreate() {
        // Комментарий обязателен только для «чужого» дистрибьютора.
        if (duplicate?.requiresComment && !form.duplicateComment.trim()) {
            setError("Укажите комментарий о дубликате")
            return
        }
        setLoading(true)
        setError("")
        const res = await send({
            ...form,
            internalName: form.internalName.trim() || null,
            contactIds,
            forceCreate: true,
        })
        setLoading(false)

        if (res.dup) return
        if (res.error) {
            setError(res.error)
            return
        }
        router.push(`/crm/projects/${res.id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            <Card>
                <FormSection
                    title='Участники'
                    description={
                        partiesLocked
                            ? "По проекту уже создана сделка — конечного потребителя и дистрибьютора изменить нельзя."
                            : "Конечный потребитель, дистрибьютор и ответственный менеджер."
                    }
                >
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Field label='Конечный потребитель' required>
                            <SearchableSelect
                                value={form.endCustomerId}
                                onChange={id =>
                                    setForm(prev => ({ ...prev, endCustomerId: id }))
                                }
                                required
                                disabled={partiesLocked}
                                placeholder='Введите название или ИНН'
                                options={customerOptions}
                            />
                        </Field>
                        <Field label='Дистрибьютор' required>
                            <SearchableSelect
                                value={form.distributorId}
                                onChange={id =>
                                    setForm(prev => ({ ...prev, distributorId: id }))
                                }
                                required
                                disabled={partiesLocked}
                                placeholder='Введите название или ИНН'
                                options={distributorOptions}
                            />
                        </Field>
                        <Field label='Ответственный менеджер' required className='sm:col-span-2'>
                            <SearchableSelect
                                value={form.managerId}
                                onChange={id => setForm(prev => ({ ...prev, managerId: id }))}
                                required
                                options={managerOptions}
                            />
                        </Field>
                    </div>
                </FormSection>
            </Card>

            <Card>
                <FormSection title='Контактные лица'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <ProjectContactsPicker
                            counterpartyId={form.endCustomerId}
                            counterpartyName={
                                customers.find(c => c.id === form.endCustomerId)?.name ||
                                "Конечный потребитель"
                            }
                            selectedIds={contactIds}
                            onChange={setContactIds}
                        />
                        <ProjectContactsPicker
                            counterpartyId={form.distributorId}
                            counterpartyName={
                                distributors.find(d => d.id === form.distributorId)?.name ||
                                "Дистрибьютор"
                            }
                            selectedIds={contactIds}
                            onChange={setContactIds}
                        />
                    </div>
                </FormSection>
            </Card>

            <Card>
                <FormSection title='Название и статус'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Input
                                label='Внутреннее название'
                                value={form.internalName}
                                onChange={updateInternalName}
                                placeholder={autoInternalName}
                            />
                            {nameWillChange ? (
                                <p className='mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900'>
                                    Стороны проекта изменились — название будет обновлено:{" "}
                                    <span className='line-through'>{initial.internalName}</span> →{" "}
                                    <strong>{autoInternalName}</strong>. Сделки по проекту
                                    подхватят новое название. Чтобы оставить прежнее, отредактируйте
                                    поле вручную.
                                </p>
                            ) : nameIsCustom ? (
                                <p className='mt-1.5 text-xs text-neutral-500'>
                                    Название задано вручную — при смене сторон проекта оно
                                    останется прежним.
                                </p>
                            ) : (
                                <p className='mt-1.5 text-xs text-neutral-500'>
                                    Собирается автоматически из дистрибьютора и конечного
                                    потребителя и меняется вместе с ними. Отредактируйте поле,
                                    чтобы задать своё название.
                                </p>
                            )}
                        </div>
                        <Select label='Статус' value={form.status} onChange={update("status")}>
                            {PROJECT_STATUSES.map(s => (
                                <option key={s} value={s}>
                                    {PROJECT_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </Select>
                    </div>
                </FormSection>
            </Card>

            {duplicate && (
                <div className='rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm'>
                    <p className='font-semibold text-yellow-900'>
                        {duplicate.requiresComment
                            ? "Обнаружен дубль"
                            : "По этому конечному потребителю уже есть проекты"}
                    </p>
                    <p className='mt-1 text-yellow-800'>
                        {duplicate.requiresComment
                            ? "Этот конечный потребитель уже в работе у другого дистрибьютора:"
                            : allDuplicatesClosed
                              ? "Потребность по ним закрыта — создать новый проект можно, но сначала проверьте:"
                              : "Проверьте, не дублирует ли новый проект существующие:"}
                    </p>
                    <ul className='mt-2 space-y-1.5'>
                        {duplicate.items.map(p => (
                            <li key={p.id} className='text-yellow-800'>
                                <a
                                    href={`/crm/projects/${p.id}`}
                                    className='font-medium underline'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    {p.internalName || "Без названия"}
                                </a>{" "}
                                — дистрибьютор <strong>{p.distributor?.name ?? "—"}</strong>,
                                менеджер <strong>{managerLabel(p.manager)}</strong>, статус{" "}
                                <strong>
                                    {PROJECT_STATUS_LABELS[p.status] ?? p.status ?? "—"}
                                </strong>
                            </li>
                        ))}
                    </ul>
                    {duplicate.requiresComment && (
                        <div className='mt-3'>
                            <label className='mb-1 block text-sm text-yellow-900'>
                                Комментарий о дубликате *
                            </label>
                            <textarea
                                rows={2}
                                value={form.duplicateComment}
                                onChange={update("duplicateComment")}
                                className='w-full rounded-lg border border-yellow-400 px-3 py-2 text-sm shadow-sm focus:border-yellow-600 focus:outline-none'
                            />
                        </div>
                    )}
                    <Button
                        type='button'
                        onClick={handleForceCreate}
                        loading={loading}
                        className='mt-3'
                    >
                        {allDuplicatesClosed
                            ? mode === "create"
                                ? "Создать проект"
                                : "Сохранить"
                            : mode === "create"
                              ? "Всё равно создать"
                              : "Всё равно сохранить"}
                    </Button>
                </div>
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

