"use client"
import { useEffect, useMemo, useState } from "react"
import { LuUsers } from "react-icons/lu"
import {
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    MobileCard,
} from "@/components/crm/ui"
import PhoneLink from "./PhoneLink"

// Справочник коллег для менеджера: только контакты, без ролей, статусов и
// редактирования. Свою карточку сотрудник правит на /crm/profile.
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

function TelegramLink({ handle }) {
    if (!handle) return "—"
    return (
        <a
            href={`https://t.me/${handle.replace(/^@/, "")}`}
            target='_blank'
            rel='noreferrer'
            onClick={e => e.stopPropagation()}
            className='text-brand_main hover:underline'
        >
            {handle}
        </a>
    )
}

export default function UsersDirectory({ currentUserId }) {
    const [items, setItems] = useState(null)
    const [error, setError] = useState("")

    useEffect(() => {
        let cancelled = false
        async function load() {
            const r = await fetch("/api/crm/users")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (cancelled) return
            if (!r.ok) {
                setError(data?.error || `Ошибка ${r.status}`)
                setItems([])
                return
            }
            setItems(data.items || [])
        }
        load()
        return () => {
            cancelled = true
        }
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
                        <span className='font-medium text-neutral-900'>{fullName(u)}</span>
                        {u.id === currentUserId && (
                            <span className='text-xs text-neutral-400'>(вы)</span>
                        )}
                    </span>
                ),
            },
            {
                key: "position",
                header: "Должность",
                sortable: true,
                sortValue: u => u.position || "",
                render: u => u.position || "—",
            },
            {
                key: "phone",
                header: "Телефон",
                render: u => (u.phone ? <PhoneLink phone={u.phone} /> : "—"),
            },
            {
                key: "telegram",
                header: "Телеграм",
                render: u => <TelegramLink handle={u.telegram} />,
                hideable: true,
            },
            {
                key: "email",
                header: "Email",
                sortable: true,
                sortValue: u => u.email,
                render: u => (
                    <a
                        href={`mailto:${u.email}`}
                        onClick={e => e.stopPropagation()}
                        className='text-brand_main hover:underline'
                    >
                        {u.email}
                    </a>
                ),
            },
        ],
        [currentUserId],
    )

    const emptyState = <EmptyState icon={LuUsers} title='Сотрудников ещё нет' />

    return (
        <section className='space-y-3'>
            {error && <p className='text-sm text-red-600'>{error}</p>}

            {/* Мобильные карточки */}
            <div className='space-y-3 md:hidden'>
                {items === null && <CardListSkeleton rows={3} />}
                {items?.length === 0 && emptyState}
                {items?.map(u => (
                    <MobileCard key={u.id}>
                        <div className='font-medium text-neutral-800'>
                            {fullName(u)}
                            {u.id === currentUserId && (
                                <span className='ml-2 text-xs text-neutral-400'>(вы)</span>
                            )}
                        </div>
                        <div className='mt-2 space-y-1'>
                            <CardRow label='Должность'>{u.position || "—"}</CardRow>
                            <CardRow label='Телефон'>
                                {u.phone ? <PhoneLink phone={u.phone} /> : "—"}
                            </CardRow>
                            <CardRow label='Телеграм'>
                                <TelegramLink handle={u.telegram} />
                            </CardRow>
                            <CardRow label='Email'>{u.email}</CardRow>
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
                    searchable
                    searchPlaceholder='Поиск по имени, должности, телефону'
                    searchAccessor={u =>
                        `${fullName(u)} ${u.email} ${u.phone ?? ""} ${u.position ?? ""} ${u.telegram ?? ""}`
                    }
                    initialSort={{ key: "name", dir: "asc" }}
                    empty={emptyState}
                />
            </div>
        </section>
    )
}
