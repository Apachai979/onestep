"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/crm/invite"

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
    ACTIVE: "bg-green-100 text-green-800",
    BLOCKED: "bg-red-100 text-red-700",
}

const ROLE_CLASS = {
    ADMIN: "bg-amber-100 text-amber-800",
    MANAGER: "bg-blue-100 text-blue-800",
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
        <section className='rounded-xl border border-gray-200 bg-white'>
            <h2 className='border-b border-gray-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500'>
                Сотрудники
            </h2>
            {error && <p className='px-5 py-2 text-sm text-red-600'>{error}</p>}
            <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
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
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Загрузка...
                                </td>
                            </tr>
                        )}
                        {items?.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-4 py-6 text-center text-gray-400'>
                                    Сотрудников ещё нет
                                </td>
                            </tr>
                        )}
                        {items?.map(u => (
                            <tr key={u.id} className='border-t border-gray-100 hover:bg-gray-50'>
                                <td className='px-4 py-3 text-gray-800'>
                                    {fullName(u)}
                                    {u.id === currentUserId && (
                                        <span className='ml-2 text-xs text-gray-400'>(вы)</span>
                                    )}
                                </td>
                                <td className='px-4 py-3 text-gray-700'>{u.email}</td>
                                <td className='px-4 py-3 text-gray-700'>{u.phone || "—"}</td>
                                <td className='px-4 py-3 text-gray-700'>{u.position || "—"}</td>
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
                                        className='rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100'
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
