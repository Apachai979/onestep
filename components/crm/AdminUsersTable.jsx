"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { LuUsers } from "react-icons/lu"
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/crm/invite"
import {
    Badge,
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    MobileCard,
} from "@/components/crm/ui"
import PhoneLink from "./PhoneLink"

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
})

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

function fmtDate(d) {
    if (!d) return "—"
    return DATE_FMT.format(new Date(d))
}

function RoleBadge({ role }) {
    return (
        <Badge tone={role === "ADMIN" ? "warning" : "info"} size='sm'>
            {USER_ROLE_LABELS[role] || role}
        </Badge>
    )
}

function StatusBadge({ status }) {
    return (
        <Badge tone={status === "ACTIVE" ? "success" : "danger"} size='sm'>
            {USER_STATUS_LABELS[status] || status}
        </Badge>
    )
}

export default function AdminUsersTable({ currentUserId }) {
    const router = useRouter()
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

    const columns = useMemo(
        () => [
            {
                key: "name",
                header: "ФИО",
                sortable: true,
                sortValue: u => fullName(u),
                render: u => (
                    <span className='inline-flex flex-wrap items-center gap-2'>
                        <Link
                            href={`/crm/users/${u.id}/edit`}
                            onClick={e => e.stopPropagation()}
                            className='font-medium text-neutral-900 hover:text-brand_main'
                        >
                            {fullName(u)}
                        </Link>
                        {u.id === currentUserId && (
                            <span className='text-xs text-neutral-400'>(вы)</span>
                        )}
                    </span>
                ),
            },
            {
                key: "email",
                header: "Email",
                sortable: true,
                sortValue: u => u.email,
                render: u => u.email,
            },
            {
                key: "phone",
                header: "Телефон",
                render: u => (u.phone ? <PhoneLink phone={u.phone} /> : "—"),
                hideable: true,
            },
            {
                key: "position",
                header: "Должность",
                render: u => u.position || "—",
                hideable: true,
            },
            {
                key: "role",
                header: "Роль",
                sortable: true,
                sortValue: u => USER_ROLE_LABELS[u.role] || u.role,
                render: u => <RoleBadge role={u.role} />,
            },
            {
                key: "status",
                header: "Статус",
                sortable: true,
                sortValue: u => USER_STATUS_LABELS[u.status] || u.status,
                render: u => <StatusBadge status={u.status} />,
            },
            {
                key: "createdAt",
                header: "Добавлен",
                sortable: true,
                sortValue: u => new Date(u.createdAt).getTime(),
                render: u => (
                    <span className='whitespace-nowrap text-neutral-500'>
                        {fmtDate(u.createdAt)}
                    </span>
                ),
                hideable: true,
            },
            {
                key: "actions",
                header: "",
                align: "right",
                render: u => (
                    <Link
                        href={`/crm/users/${u.id}/edit`}
                        onClick={e => e.stopPropagation()}
                        className='rounded-lg border border-line px-2 py-1 text-xs text-neutral-700 hover:bg-surface_muted'
                    >
                        Редактировать
                    </Link>
                ),
            },
        ],
        [currentUserId],
    )

    const emptyState = (
        <EmptyState icon={LuUsers} title='Сотрудников ещё нет' />
    )

    return (
        <section className='space-y-3'>
            <h2 className='text-sm font-semibold text-neutral-900'>Сотрудники</h2>
            {error && <p className='text-sm text-red-600'>{error}</p>}

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items === null && <CardListSkeleton rows={3} />}
                {items?.length === 0 && emptyState}
                {items?.map(u => (
                    <MobileCard
                        key={u.id}
                        onClick={() => router.push(`/crm/users/${u.id}/edit`)}
                        className={u.status === "BLOCKED" ? "opacity-60" : ""}
                    >
                        <div className='flex items-start justify-between gap-2'>
                            <span className='font-medium text-neutral-800'>
                                {fullName(u)}
                                {u.id === currentUserId && (
                                    <span className='ml-2 text-xs text-neutral-400'>(вы)</span>
                                )}
                            </span>
                            <span className='flex shrink-0 gap-1'>
                                <RoleBadge role={u.role} />
                                <StatusBadge status={u.status} />
                            </span>
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Email'>{u.email}</CardRow>
                            <CardRow label='Телефон'>
                                {u.phone ? <PhoneLink phone={u.phone} /> : "—"}
                            </CardRow>
                            <CardRow label='Должность'>{u.position || "—"}</CardRow>
                            <CardRow label='Добавлен'>{fmtDate(u.createdAt)}</CardRow>
                        </div>
                    </MobileCard>
                ))}
            </div>

            {/* Десктоп-таблица */}
            <div className='hidden md:block'>
                <DataTable
                    columns={columns}
                    rows={items || []}
                    loading={items === null}
                    getRowId={u => u.id}
                    onRowClick={u => router.push(`/crm/users/${u.id}/edit`)}
                    rowClassName={u => (u.status === "BLOCKED" ? "opacity-60" : "")}
                    searchable
                    searchPlaceholder='Поиск по имени, email, должности'
                    searchAccessor={u =>
                        `${fullName(u)} ${u.email} ${u.phone ?? ""} ${u.position ?? ""}`
                    }
                    initialSort={{ key: "name", dir: "asc" }}
                    empty={emptyState}
                />
            </div>
        </section>
    )
}
