"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/crm/invite"
import { CardListSkeleton, CardRow, MobileCard } from "@/components/crm/ui"

function fullName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

const STATUS_CLASS = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    BLOCKED: "bg-red-50 text-red-700",
}

const ROLE_CLASS = {
    ADMIN: "bg-amber-50 text-amber-700",
    MANAGER: "bg-blue-50 text-blue-700",
}

export default function AdminUsersTable({ currentUserId }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")

    async function load() {
        setError("")
        const r = await fetch("/api/crm/admin/users")
        const text = await r.text()
        const data = text ? safeJson(text) : {}
        if (!r.ok) {
            setError(data?.error || `Ошибка ${r.status}`)
            setItems([])
            return
        }
        setItems(data.items || [])
    }

    useEffect(() => {
        load()
    }, [])

    return (
        <section className='overflow-hidden rounded-2xl border border-line bg-white shadow-sm'>
            <h2 className='border-b border-line px-6 py-3.5 text-sm font-semibold text-neutral-900'>
                Сотрудники
            </h2>
            {error && <p className='px-5 py-2 text-sm text-red-600'>{error}</p>}

            {/* Мобильные карточки */}
            <div className='space-y-3 p-4 md:hidden'>
                {items === null && <CardListSkeleton rows={3} />}
                {items?.length === 0 && (
                    <p className='py-4 text-center text-sm text-neutral-400'>
                        Сотрудников ещё нет
                    </p>
                )}
                {items?.map(u => (
                    <MobileCard key={u.id}>
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-800'>
                                {fullName(u)}
                                {u.id === currentUserId && (
                                    <span className='ml-2 text-xs text-neutral-400'>(вы)</span>
                                )}
                            </span>
                            <span className='flex shrink-0 gap-1'>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLASS[u.role] || ""}`}
                                >
                                    {USER_ROLE_LABELS[u.role] || u.role}
                                </span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[u.status] || ""}`}
                                >
                                    {USER_STATUS_LABELS[u.status] || u.status}
                                </span>
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Email'>{u.email}</CardRow>
                            <CardRow label='Телефон'>{u.phone || "—"}</CardRow>
                            <CardRow label='Должность'>{u.position || "—"}</CardRow>
                        </div>
                        <div className='mt-3 text-right'>
                            <Link
                                href={`/crm/users/${u.id}/edit`}
                                className='rounded-md border border-line px-3 py-1.5 text-xs text-neutral-700 hover:bg-surface_muted'
                            >
                                Редактировать
                            </Link>
                        </div>
                    </MobileCard>
                ))}
            </div>

            <div className='hidden overflow-x-auto md:block'>
                <table className='w-full text-sm'>
                    <thead className='bg-surface_muted text-left text-xs font-medium uppercase tracking-wide text-neutral-500'>
                        <tr>
                            <th className='px-4 py-3'>ФИО</th>
                            <th className='px-4 py-3'>Email</th>
                            <th className='px-4 py-3'>Телефон</th>
                            <th className='px-4 py-3'>Должность</th>
                            <th className='px-4 py-3'>Роль</th>
                            <th className='px-4 py-3'>Статус</th>
                            <th className='px-4 py-3'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items === null && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-neutral-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-neutral-400'>
                                    Сотрудников ещё нет
                                </td>
                            </tr>
                        )}
                        {items?.map(u => (
                            <tr key={u.id} className='border-t border-line hover:bg-surface_muted'>
                                <td className='px-4 py-3 text-neutral-800'>
                                    {fullName(u)}
                                    {u.id === currentUserId && (
                                        <span className='ml-2 text-xs text-neutral-400'>(вы)</span>
                                    )}
                                </td>
                                <td className='px-4 py-3 text-neutral-700'>{u.email}</td>
                                <td className='px-4 py-3 text-neutral-700'>{u.phone || "—"}</td>
                                <td className='px-4 py-3 text-neutral-700'>{u.position || "—"}</td>
                                <td className='px-4 py-3'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLASS[u.role] || ""}`}
                                    >
                                        {USER_ROLE_LABELS[u.role] || u.role}
                                    </span>
                                </td>
                                <td className='px-4 py-3'>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[u.status] || ""}`}
                                    >
                                        {USER_STATUS_LABELS[u.status] || u.status}
                                    </span>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                    <Link
                                        href={`/crm/users/${u.id}/edit`}
                                        className='rounded-lg border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                                    >
                                        Редактировать
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
