"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LuCrown, LuLink2, LuPencil, LuPlus, LuUnlink } from "react-icons/lu"
import { useConfirm, useToast } from "@/components/crm/ui"
import { formatMoney, formatPercent } from "@/lib/crm/format"
import { groupTotalRevenue } from "@/lib/crm/counterparty-group"
import SearchableSelect from "./SearchableSelect"

const INPUT_CLASS =
    "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-neutral-900 shadow-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand_main focus:outline-none focus:ring-2 focus:ring-brand_main/20"

export default function CounterpartyGroupSection({
    counterpartyId,
    counterpartyName,
    counterpartyType,
    initialGroup,
}) {
    const router = useRouter()
    const toast = useToast()
    const confirm = useConfirm()

    const [group, setGroup] = useState(initialGroup)
    // idle | create | join | add | edit
    const [mode, setMode] = useState("idle")
    const [busy, setBusy] = useState(false)
    const [name, setName] = useState("")
    const [discount, setDiscount] = useState("")
    const [pickId, setPickId] = useState("")
    const [candidates, setCandidates] = useState(null)
    const [groups, setGroups] = useState(null)

    function closeForm() {
        setMode("idle")
        setPickId("")
    }

    function apply(nextGroup) {
        setGroup(nextGroup)
        closeForm()
        router.refresh()
    }

    async function request(url, options) {
        setBusy(true)
        const res = await fetch(url, options)
        const data = await res.json().catch(() => ({}))
        setBusy(false)
        if (!res.ok) {
            toast.error(data.error || "Не удалось выполнить действие")
            return null
        }
        return data
    }

    async function startCreate() {
        setName(counterpartyName || "")
        setMode("create")
    }

    async function startJoin() {
        setMode("join")
        setPickId("")
        setGroups(null)
        const r = await fetch("/api/crm/counterparty-groups")
        const d = r.ok ? await r.json() : { items: [] }
        setGroups(d.items || [])
    }

    // Кандидаты на привязку — юрлица, ещё не состоящие ни в одной группе.
    async function startAdd() {
        setMode("add")
        setPickId("")
        setCandidates(null)
        const r = await fetch("/api/crm/counterparties")
        const d = r.ok ? await r.json() : { items: [] }
        setCandidates(
            (d.items || []).filter(c => !c.groupId && c.id !== counterpartyId),
        )
    }

    function startEdit() {
        setName(group?.name || "")
        setDiscount(group?.discount != null ? String(group.discount) : "")
        setMode("edit")
    }

    async function handleCreate(e) {
        e.preventDefault()
        const data = await request("/api/crm/counterparty-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, memberIds: [counterpartyId] }),
        })
        if (data) {
            toast.success("Группа создана")
            apply(data.item)
        }
    }

    async function handleJoin() {
        if (!pickId) return
        const data = await request(`/api/crm/counterparty-groups/${pickId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ counterpartyId }),
        })
        if (data) {
            toast.success("Юрлицо добавлено в группу")
            apply(data.item)
        }
    }

    async function handleAdd() {
        if (!pickId || !group) return
        const data = await request(`/api/crm/counterparty-groups/${group.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ counterpartyId: pickId }),
        })
        if (data) {
            toast.success("Юрлицо добавлено в группу")
            apply(data.item)
        }
    }

    async function handleEdit(e) {
        e.preventDefault()
        if (!group) return
        const data = await request(`/api/crm/counterparty-groups/${group.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, discount }),
        })
        if (data) {
            toast.success("Группа обновлена")
            apply(data.item)
        }
    }

    async function handlePrimary(memberId) {
        if (!group) return
        const data = await request(`/api/crm/counterparty-groups/${group.id}/members`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ counterpartyId: memberId }),
        })
        if (data) apply(data.item)
    }

    async function handleDetach(member) {
        if (!group) return
        const ok = await confirm({
            title: "Отвязать юрлицо от группы?",
            description:
                member.id === counterpartyId
                    ? `«${member.name}» перестанет быть связан с остальными юрлицами группы. Сделки и документы останутся как есть.`
                    : `«${member.name}» перестанет быть связан с «${counterpartyName}». Сделки и документы останутся как есть.`,
            confirmText: "Отвязать",
            variant: "danger",
        })
        if (!ok) return
        const data = await request(
            `/api/crm/counterparty-groups/${group.id}/members?counterpartyId=${member.id}`,
            { method: "DELETE" },
        )
        if (data) {
            toast.success("Юрлицо отвязано")
            // Последний участник — группа удалена на сервере.
            if (member.id === counterpartyId || data.item === null) apply(null)
            else apply(data.item)
        }
    }

    const members = group?.members || []
    const newHref =
        counterpartyType === "DISTRIBUTOR" ? "/crm/distributors/new" : "/crm/customers/new"

    return (
        <section className='rounded-xl border border-line bg-white p-4'>
            <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                    <h2 className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Группа компаний
                        {group ? ` · ${members.length}` : ""}
                    </h2>
                    {group && (
                        <p className='mt-1 flex flex-wrap items-center gap-x-3 text-sm text-neutral-900'>
                            <span className='font-medium'>{group.name}</span>
                            <span className='text-xs text-neutral-500'>
                                Бюджет группы {formatMoney(groupTotalRevenue(members))}
                            </span>
                            {group.discount != null && (
                                <span className='rounded-full bg-brand_main/10 px-2 py-0.5 text-[11px] font-medium text-brand_main'>
                                    Скидка группы {formatPercent(group.discount)}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                {mode === "idle" && (
                    <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
                        {group ? (
                            <>
                                <button
                                    type='button'
                                    onClick={startEdit}
                                    className='inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-surface_muted'
                                >
                                    <LuPencil className='h-3.5 w-3.5' />
                                    Название и скидка
                                </button>
                                <button
                                    type='button'
                                    onClick={startAdd}
                                    className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                                >
                                    <LuPlus className='h-3.5 w-3.5' />
                                    Добавить юрлицо
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type='button'
                                    onClick={startJoin}
                                    className='inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-surface_muted'
                                >
                                    <LuLink2 className='h-3.5 w-3.5' />
                                    Присоединить к группе
                                </button>
                                <button
                                    type='button'
                                    onClick={startCreate}
                                    className='inline-flex items-center gap-1.5 rounded-lg bg-brand_main px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand_main/90'
                                >
                                    <LuPlus className='h-3.5 w-3.5' />
                                    Создать группу
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {!group && mode === "idle" && (
                <p className='text-sm text-neutral-400'>
                    Юрлицо не связано с другими. Если клиент оформляет договоры на несколько
                    своих компаний — объедините их в группу, чтобы видеть общий бюджет и не
                    путаться в реквизитах.
                </p>
            )}

            {mode === "create" && (
                <form
                    onSubmit={handleCreate}
                    className='space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'
                >
                    <div>
                        <label className='mb-1 block text-xs font-medium text-neutral-500'>
                            Название группы
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder='ГК Ромашка'
                            required
                            className={INPUT_CLASS}
                        />
                    </div>
                    <FormActions
                        busy={busy}
                        onCancel={closeForm}
                        submitLabel='Создать'
                        type='submit'
                    />
                </form>
            )}

            {mode === "edit" && (
                <form
                    onSubmit={handleEdit}
                    className='space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'
                >
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <div>
                            <label className='mb-1 block text-xs font-medium text-neutral-500'>
                                Название группы
                            </label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className={INPUT_CLASS}
                            />
                        </div>
                        <div>
                            <label className='mb-1 block text-xs font-medium text-neutral-500'>
                                Скидка группы, %
                            </label>
                            <input
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                placeholder='не задана'
                                className={INPUT_CLASS}
                            />
                            <p className='mt-1 text-[11px] text-neutral-400'>
                                Перекрывает личную скидку каждого юрлица группы.
                            </p>
                        </div>
                    </div>
                    <FormActions
                        busy={busy}
                        onCancel={closeForm}
                        submitLabel='Сохранить'
                        type='submit'
                    />
                </form>
            )}

            {mode === "join" && (
                <div className='space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Присоединить к существующей группе
                    </p>
                    {groups === null ? (
                        <p className='text-sm text-neutral-400'>Загрузка...</p>
                    ) : groups.length === 0 ? (
                        <p className='text-sm text-neutral-400'>
                            Групп пока нет — создайте первую.
                        </p>
                    ) : (
                        <SearchableSelect
                            value={pickId}
                            onChange={setPickId}
                            placeholder='Выберите группу'
                            emptyLabel='Группа не найдена'
                            options={groups.map(g => ({
                                id: g.id,
                                label: g.name,
                                sublabel: g.members
                                    .map(m => m.name)
                                    .slice(0, 3)
                                    .join(", "),
                                search: `${g.name} ${g.members.map(m => `${m.name} ${m.inn ?? ""}`).join(" ")}`,
                            }))}
                        />
                    )}
                    <FormActions
                        busy={busy}
                        disabled={!pickId}
                        onCancel={closeForm}
                        onSubmit={handleJoin}
                        submitLabel='Присоединить'
                    />
                </div>
            )}

            {mode === "add" && (
                <div className='space-y-3 rounded-lg border border-dashed border-brand_main/40 bg-surface_muted p-4'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-neutral-500'>
                        Добавить юрлицо в группу
                    </p>
                    {candidates === null ? (
                        <p className='text-sm text-neutral-400'>Загрузка...</p>
                    ) : candidates.length === 0 ? (
                        <p className='text-sm text-neutral-400'>
                            Свободных контрагентов нет — все уже состоят в группах.
                        </p>
                    ) : (
                        <SearchableSelect
                            value={pickId}
                            onChange={setPickId}
                            placeholder='Найдите юрлицо по названию или ИНН'
                            emptyLabel='Контрагент не найден'
                            options={candidates.map(c => ({
                                id: c.id,
                                label: c.name,
                                sublabel: [c.inn && `ИНН ${c.inn}`, c.region]
                                    .filter(Boolean)
                                    .join(" · "),
                                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
                            }))}
                        />
                    )}
                    <p className='text-[11px] text-neutral-400'>
                        Нужного юрлица нет в базе?{" "}
                        <Link
                            href={`${newHref}?group=${group?.id ?? ""}`}
                            className='text-brand_main hover:underline'
                        >
                            Создайте карточку по ИНН
                        </Link>{" "}
                        — оно сразу попадёт в эту группу.
                    </p>
                    <FormActions
                        busy={busy}
                        disabled={!pickId}
                        onCancel={closeForm}
                        onSubmit={handleAdd}
                        submitLabel='Добавить'
                    />
                </div>
            )}

            {group && members.length > 0 && (
                <ul className='mt-3 space-y-2'>
                    {members.map(m => {
                        const isCurrent = m.id === counterpartyId
                        return (
                            <li
                                key={m.id}
                                className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                                    isCurrent
                                        ? "border-brand_main/40 bg-brand_main/5"
                                        : "border-line"
                                }`}
                            >
                                <div className='min-w-0 flex-1'>
                                    <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                                        {isCurrent ? (
                                            <span className='font-medium text-neutral-900'>
                                                {m.name}
                                            </span>
                                        ) : (
                                            <Link
                                                href={`/crm/counterparties/${m.id}`}
                                                className='font-medium text-neutral-900 hover:text-brand_main'
                                            >
                                                {m.name}
                                            </Link>
                                        )}
                                        {m.isGroupPrimary && (
                                            <span className='rounded-full bg-brand_main/10 px-1.5 py-0.5 text-[10px] font-medium text-brand_main'>
                                                Головное
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className='text-[10px] uppercase tracking-wider text-neutral-400'>
                                                эта карточка
                                            </span>
                                        )}
                                    </div>
                                    <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500'>
                                        {m.inn && <span>ИНН {m.inn}</span>}
                                        {m.kpp && <span>КПП {m.kpp}</span>}
                                        {m.region && <span>{m.region}</span>}
                                        <span>{formatMoney(m.totalRevenue)}</span>
                                    </div>
                                </div>
                                <div className='flex shrink-0 gap-1 self-center'>
                                    {!m.isGroupPrimary && (
                                        <button
                                            type='button'
                                            onClick={() => handlePrimary(m.id)}
                                            disabled={busy}
                                            title='Сделать головным'
                                            aria-label='Сделать головным юрлицом группы'
                                            className='rounded-md border border-line p-1.5 text-neutral-500 transition hover:bg-surface_muted hover:text-neutral-900'
                                        >
                                            <LuCrown className='h-3.5 w-3.5' />
                                        </button>
                                    )}
                                    <button
                                        type='button'
                                        onClick={() => handleDetach(m)}
                                        disabled={busy}
                                        title='Отвязать от группы'
                                        aria-label='Отвязать от группы'
                                        className='rounded-md border border-red-200 p-1.5 text-red-500 transition hover:bg-red-50'
                                    >
                                        <LuUnlink className='h-3.5 w-3.5' />
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

function FormActions({ busy, disabled, onCancel, onSubmit, submitLabel, type = "button" }) {
    return (
        <div className='flex justify-end gap-2'>
            <button
                type='button'
                onClick={onCancel}
                className='rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface_muted'
            >
                Отмена
            </button>
            <button
                type={type}
                onClick={type === "submit" ? undefined : onSubmit}
                disabled={busy || disabled}
                className='rounded-lg bg-brand_main px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand_main/90 disabled:cursor-not-allowed disabled:opacity-60'
            >
                {busy ? "Сохраняем..." : submitLabel}
            </button>
        </div>
    )
}
