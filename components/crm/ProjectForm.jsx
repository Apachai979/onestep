"use client"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, buildInternalName } from "@/lib/crm/project"
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

function isoDate(d) {
    if (!d) return ""
    const x = new Date(d)
    if (Number.isNaN(x.getTime())) return ""
    return x.toISOString().slice(0, 10)
}

export default function ProjectForm({ initial, mode = "create", currentUserId }) {
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

    const autoInternalName = useMemo(() => {
        const d = refs.distributors.find(x => x.id === form.distributorId)
        const c = refs.customers.find(x => x.id === form.endCustomerId)
        return buildInternalName(d?.name, c?.name)
    }, [refs, form.distributorId, form.endCustomerId])

    const distributorOptions = useMemo(
        () =>
            refs.distributors.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [refs.distributors],
    )

    const customerOptions = useMemo(
        () =>
            refs.customers.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${
                    c.inn && c.region ? " · " : ""
                }${c.region ?? ""}`,
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [refs.customers],
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
            setDuplicate(data.duplicate)
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
        if (!form.duplicateComment.trim()) {
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
                    description='Конечный потребитель, дистрибьютор и ответственный менеджер.'
                >
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Field label='Конечный потребитель' required>
                            <SearchableSelect
                                value={form.endCustomerId}
                                onChange={id =>
                                    setForm(prev => ({ ...prev, endCustomerId: id }))
                                }
                                required
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
                                refs.customers.find(c => c.id === form.endCustomerId)?.name ||
                                "Конечный потребитель"
                            }
                            selectedIds={contactIds}
                            onChange={setContactIds}
                        />
                        <ProjectContactsPicker
                            counterpartyId={form.distributorId}
                            counterpartyName={
                                refs.distributors.find(d => d.id === form.distributorId)?.name ||
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
                        <Input
                            label='Внутреннее название'
                            containerClassName='sm:col-span-2'
                            value={form.internalName}
                            onChange={update("internalName")}
                            placeholder={autoInternalName}
                        />
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
                    <p className='font-semibold text-yellow-900'>Обнаружен дубль</p>
                    <p className='mt-1 text-yellow-800'>
                        Этот конечный потребитель уже в работе у дистрибьютора{" "}
                        <strong>{duplicate.distributor?.name}</strong>, менеджер:{" "}
                        <strong>
                            {duplicate.manager
                                ? `${duplicate.manager.firstName ?? ""} ${duplicate.manager.lastName ?? ""}`.trim() ||
                                  duplicate.manager.email
                                : "—"}
                        </strong>
                        .{" "}
                        <a
                            href={`/crm/projects/${duplicate.id}`}
                            className='underline'
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            Открыть проект
                        </a>
                    </p>
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
                    <Button
                        type='button'
                        onClick={handleForceCreate}
                        loading={loading}
                        className='mt-3'
                    >
                        Всё равно создать
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

