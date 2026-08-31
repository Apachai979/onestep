"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    LuActivity,
    LuArrowDownWideNarrow,
    LuArrowUpNarrowWide,
    LuCheck,
    LuDownload,
    LuFilePlus2,
    LuPencilLine,
    LuPlus,
    LuTrash2,
    LuUsers,
} from "react-icons/lu"
import PeriodFilter from "@/components/crm/PeriodFilter"
import {
    CHANGE_ACTION_DOTS,
    CHANGE_ACTION_LABELS,
    fieldLabel,
    formatChangeValue,
    isDiffValue,
} from "@/lib/crm/change-log"
import { crmToday, formatCrmDateTime } from "@/lib/crm/datetime"
import { formatPeriodLabel, periodPreset } from "@/lib/crm/period"
import {
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    MobileCard,
    StatCard,
} from "@/components/crm/ui"

// Активность оперативная, как задачи: годовой срез по ней читается хуже
// месячного, поэтому отчёт открывается месяцем, а не годом, как «Продажи».
const ACTIVITY_PERIOD_PRESET = "month"

const ACTION_BADGES = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
}

function SectionHeading({ icon: Icon, title, hint, count }) {
    return (
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <h2 className='flex items-center gap-2 text-sm font-semibold leading-5 text-neutral-900'>
                {Icon && <Icon className='h-4 w-4 text-brand_main' />}
                {title}
            </h2>
            {count != null && (
                <span className='text-xs leading-5 tabular-nums text-neutral-400'>{count}</span>
            )}
            {hint && <span className='text-xs leading-5 text-neutral-500'>· {hint}</span>}
        </div>
    )
}

// Одно событие ленты. Служебное — время, действие, объект, карточка — идёт
// строкой-шапкой, под ней список изменённых полей: тот же порядок чтения, что
// в истории карточки, чтобы лента везде выглядела одинаково.
function ActivityRow({ entry, isLast }) {
    const changes =
        entry.changes && typeof entry.changes === "object" && !Array.isArray(entry.changes)
            ? entry.changes
            : null

    return (
        <div className={`relative pl-6 ${isLast ? "" : "pb-4"}`}>
            {!isLast && <span aria-hidden className='absolute left-[3px] top-4 h-full w-px bg-line' />}
            <span
                aria-hidden
                className={`absolute left-0 top-[7px] h-[7px] w-[7px] rounded-full ${
                    CHANGE_ACTION_DOTS[entry.action] || "bg-neutral-300"
                }`}
            />

            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500'>
                <span className='whitespace-nowrap'>{formatCrmDateTime(entry.at)}</span>
                <span
                    className={`rounded-full px-1.5 py-px text-[10px] font-medium ${
                        ACTION_BADGES[entry.action] || "bg-neutral-100 text-neutral-600"
                    }`}
                >
                    {CHANGE_ACTION_LABELS[entry.action] || entry.action}
                </span>
                <span className='rounded-full bg-neutral-100 px-1.5 py-px text-[10px] font-medium text-neutral-700'>
                    {entry.entityLabel}
                </span>
                {entry.target && (
                    <>
                        <span className='text-neutral-300'>·</span>
                        {entry.target.href ? (
                            <Link
                                href={entry.target.href}
                                title={`${entry.target.label}: ${entry.target.name}`}
                                className='min-w-0 truncate font-medium text-neutral-700 hover:text-brand_main'
                            >
                                <span className='font-normal text-neutral-400'>
                                    {entry.target.label}:{" "}
                                </span>
                                {entry.target.name}
                            </Link>
                        ) : (
                            <span className='min-w-0 truncate font-medium text-neutral-700'>
                                {entry.target.name}
                            </span>
                        )}
                    </>
                )}
            </div>

            {changes && (
                <ul className='mt-1 space-y-0.5 text-xs leading-snug'>
                    {Object.entries(changes).map(([field, value]) => {
                        if (isDiffValue(value)) {
                            return (
                                <li key={field}>
                                    <span className='text-neutral-500'>
                                        {fieldLabel(entry.entityType, field)}:
                                    </span>{" "}
                                    <span className='text-neutral-400 line-through'>
                                        {formatChangeValue(value.from)}
                                    </span>{" "}
                                    <span className='text-neutral-400'>→</span>{" "}
                                    <span className='font-medium text-neutral-800'>
                                        {formatChangeValue(value.to)}
                                    </span>
                                </li>
                            )
                        }
                        // В снимке «Создано» пустые значения не показываем —
                        // выключенный флаг так же пуст, как незаполненное поле.
                        if (value === null || value === undefined || value === "" || value === false)
                            return null
                        return (
                            <li key={field}>
                                <span className='text-neutral-500'>
                                    {fieldLabel(entry.entityType, field)}:
                                </span>{" "}
                                <span className='font-medium text-neutral-800'>
                                    {formatChangeValue(value)}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

// Расшифровка строки сотрудника — его лента за период.
//
// Объекты включаются и выключаются независимо: выбор ровно одного вида (как
// было сначала) отвечал на другой вопрос — «покажи только сделки» вместо
// «убери из ленты мелочь».
//
// Открывается лента ТОЛЬКО СДЕЛКАМИ (ACTIVITY_DEFAULT_ENTITIES): это главный
// объект CRM, а позиции, файлы и заметки в ленте активного менеджера забивают
// всё остальное — с ними первый экран нечитаем. Остальное менеджер включает
// сам. Если сделок сотрудник за период не касался, включаем всё, что у него
// есть: строка, раскрывшаяся в пустоту, выглядит сломанной.
//
// В состоянии держим включённые виды: набор объектов меняется вместе с
// периодом, а умолчание должно оставаться умолчанием и после смены — при
// хранении выключенных новый вид молча оказывался бы показанным.
const ACTIVITY_DEFAULT_ENTITIES = ["Deal"]

function defaultEntityKeys(entities) {
    const keys = entities.map(e => e.key)
    const picked = keys.filter(key => ACTIVITY_DEFAULT_ENTITIES.includes(key))
    return new Set(picked.length ? picked : keys)
}

function UserDetails({ user }) {
    const [included, setIncluded] = useState(() => defaultEntityKeys(user.entities))
    const [asc, setAsc] = useState(false)

    const rows = useMemo(() => {
        const filtered = user.entries.filter(e => included.has(e.entityType))
        return [...filtered].sort((a, b) => {
            const diff = new Date(a.at) - new Date(b.at)
            return asc ? diff : -diff
        })
    }, [user.entries, included, asc])

    function toggle(key) {
        setIncluded(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const allOn = included.size >= user.entities.length
    const allOff = included.size === 0

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-1'>
                {/* «Все» — не такой же фильтр, а переключатель всего разом:
                    включает всё, повторным нажатием снимает всё. Снять и
                    добрать пару видов быстрее, чем гасить их по одному. */}
                <button
                    type='button'
                    aria-pressed={allOn}
                    onClick={() =>
                        setIncluded(allOn ? new Set() : new Set(user.entities.map(e => e.key)))
                    }
                    title={allOn ? "Снять все объекты" : "Показать все объекты"}
                    className={`h-7 rounded-lg px-2.5 text-xs transition-colors ${
                        allOn
                            ? "bg-brand_main/10 font-medium text-neutral-900"
                            : "text-brand_main hover:bg-brand_main/10"
                    }`}
                >
                    Все
                    <span className='ml-1 tabular-nums text-neutral-400'>{user.entriesCount}</span>
                </button>
                {user.entities.map(e => {
                    const on = included.has(e.key)
                    return (
                        <button
                            key={e.key}
                            type='button'
                            aria-pressed={on}
                            onClick={() => toggle(e.key)}
                            title={on ? `Убрать «${e.label}» из ленты` : `Вернуть «${e.label}» в ленту`}
                            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs transition-colors ${
                                on
                                    ? "bg-brand_main/10 font-medium text-neutral-900"
                                    : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                            }`}
                        >
                            {on ? (
                                <LuCheck className='h-3 w-3 text-brand_main' />
                            ) : (
                                <LuPlus className='h-3 w-3' />
                            )}
                            {e.label}
                            <span className='tabular-nums text-neutral-400'>{e.total}</span>
                        </button>
                    )
                })}
                {rows.length > 0 && (
                    <button
                        type='button'
                        onClick={() => setAsc(v => !v)}
                        title='Изменить порядок сортировки по дате'
                        className='ml-auto inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
                    >
                        {asc ? (
                            <LuArrowUpNarrowWide className='h-3.5 w-3.5' />
                        ) : (
                            <LuArrowDownWideNarrow className='h-3.5 w-3.5' />
                        )}
                        {asc ? "Сначала старые" : "Сначала новые"}
                    </button>
                )}
            </div>

            {rows.length ? (
                <>
                    <div className='pt-1'>
                        {rows.map((entry, i) => (
                            <ActivityRow
                                key={entry.id}
                                entry={entry}
                                isLast={i === rows.length - 1}
                            />
                        ))}
                    </div>
                    {/* Длинную ленту режем на сервере — молчать об этом нельзя,
                        иначе список выглядит полным. Лимит считается до фильтра:
                        он про то, сколько событий вообще приехало. */}
                    {user.entriesTruncated && (
                        <p className='text-xs text-neutral-400'>
                            Показаны последние {user.entries.length} из {user.entriesCount} событий
                            за период — полная лента в Excel-выгрузке.
                        </p>
                    )}
                </>
            ) : (
                <p className='text-sm text-neutral-500'>
                    {allOff
                        ? "Выключены все объекты — включите хотя бы один."
                        : "Событий в этом разрезе нет."}
                </p>
            )}
        </div>
    )
}

export default function ActivityReport() {
    const [period, setPeriod] = useState(() => periodPreset(ACTIVITY_PERIOD_PRESET, crmToday()))
    const [data, setData] = useState(null)
    const [error, setError] = useState("")

    const query = `from=${period.from}&to=${period.to}`

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        setData(null)
        fetch(`/api/crm/analytics/activity?${query}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(setData)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setData({ users: [], totals: {} })
            })
        return () => controller.abort()
    }, [query])

    const loading = data === null
    const users = data?.users || []
    const totals = data?.totals || {}

    const columns = useMemo(
        () => [
            {
                key: "user",
                header: "Сотрудник",
                sortable: true,
                sortValue: u => u.name,
                render: u => (
                    <div className='min-w-0'>
                        <span
                            className={`font-medium ${
                                u.isSystem ? "text-neutral-500" : "text-neutral-900"
                            }`}
                        >
                            {u.name}
                        </span>
                        {u.position && (
                            <span className='block truncate text-xs text-neutral-500'>
                                {u.position}
                            </span>
                        )}
                        {u.isSystem && (
                            <span className='block text-xs text-neutral-400'>
                                синхронизация и импорт
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "total",
                header: "Действий",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: u => u.total,
                render: u => (
                    <span className='font-semibold tabular-nums text-neutral-900'>{u.total}</span>
                ),
            },
            {
                key: "create",
                header: "Создано",
                align: "right",
                sortable: true,
                sortValue: u => u.create,
                render: u => <span className='tabular-nums text-neutral-700'>{u.create || "—"}</span>,
            },
            {
                key: "update",
                header: "Изменено",
                align: "right",
                sortable: true,
                sortValue: u => u.update,
                render: u => <span className='tabular-nums text-neutral-700'>{u.update || "—"}</span>,
            },
            {
                key: "delete",
                header: "Удалено",
                align: "right",
                sortable: true,
                sortValue: u => u.delete,
                render: u => (
                    <span
                        className={`tabular-nums ${
                            u.delete ? "text-red-600" : "text-neutral-400"
                        }`}
                    >
                        {u.delete || "—"}
                    </span>
                ),
            },
            {
                key: "days",
                header: "Дней в работе",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: u => u.activeDays,
                render: u => (
                    <span
                        className='tabular-nums text-neutral-700'
                        title='Дни периода, в которые сотрудник что-то делал в CRM'
                    >
                        {u.activeDays}
                        <span className='block text-[11px] text-neutral-400'>
                            {u.perDay} в день
                        </span>
                    </span>
                ),
            },
            {
                key: "last",
                header: "Последнее",
                align: "right",
                sortable: true,
                hideable: true,
                sortValue: u => (u.lastAt ? new Date(u.lastAt).getTime() : 0),
                render: u => (
                    <span className='whitespace-nowrap text-xs text-neutral-500'>
                        {u.lastAt ? formatCrmDateTime(u.lastAt) : "—"}
                    </span>
                ),
            },
        ],
        [],
    )

    return (
        <div className='space-y-5'>
            <FilterBar
                actions={
                    // Обычная ссылка, а не Link: файл должен скачиваться, а не
                    // перехватываться клиентской навигацией.
                    <a
                        href={`/api/crm/analytics/activity/export?${query}`}
                        title='Выгрузить отчёт в Excel: свод, объекты, динамика и вся лента событий'
                        className='inline-flex h-8 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-surface_muted'
                    >
                        <LuDownload className='h-4 w-4 text-brand_main' />
                        Excel
                    </a>
                }
            >
                <PeriodFilter value={period} onChange={setPeriod} />
            </FilterBar>

            <div className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4'>
                <StatCard
                    size='sm'
                    label='Действий за период'
                    value={loading ? "…" : totals.total || 0}
                    hint={
                        loading
                            ? undefined
                            : `${totals.usersCount || 0} сотрудников · ${totals.perActiveDay || 0} в среднем за рабочий день · ${formatPeriodLabel(period)}`
                    }
                    icon={LuActivity}
                    tone='brand'
                />
                <StatCard
                    size='sm'
                    label='Создано'
                    value={loading ? "…" : totals.create || 0}
                    hint={loading ? undefined : "новые карточки, задачи, позиции и файлы"}
                    icon={LuFilePlus2}
                    tone='success'
                />
                <StatCard
                    size='sm'
                    label='Изменено'
                    value={loading ? "…" : totals.update || 0}
                    hint={loading ? undefined : "правки в уже заведённых записях"}
                    icon={LuPencilLine}
                    tone='neutral'
                />
                <StatCard
                    size='sm'
                    label='Удалено'
                    value={loading ? "…" : totals.delete || 0}
                    hint={loading ? undefined : "удалённые записи — по ним видно, что именно снесли"}
                    icon={LuTrash2}
                    tone={totals.delete > 0 ? "warn" : "neutral"}
                />
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            <section className='space-y-3'>
                <SectionHeading
                    icon={LuUsers}
                    title='Кто работал в CRM'
                    count={loading ? null : users.length}
                    hint='строка раскрывается — лента событий сотрудника'
                />

                <div className='space-y-3 md:hidden'>
                    {loading && <CardListSkeleton />}
                    {users.map(u => (
                        <MobileCard key={u.id || u.name}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{u.name}</span>
                                <span className='shrink-0 text-sm font-semibold tabular-nums text-neutral-900'>
                                    {u.total}
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Создано'>{u.create}</CardRow>
                                <CardRow label='Изменено'>{u.update}</CardRow>
                                <CardRow label='Удалено'>{u.delete}</CardRow>
                                <CardRow label='Дней в работе'>{u.activeDays}</CardRow>
                            </div>
                        </MobileCard>
                    ))}
                </div>

                <div className='hidden md:block'>
                    <DataTable
                        columns={columns}
                        rows={users}
                        loading={loading}
                        getRowId={u => u.id || u.name}
                        initialSort={{ key: "total", dir: "desc" }}
                        pageSize={50}
                        expandable={{
                            render: u => <UserDetails user={u} />,
                            isExpandable: u => u.entriesCount > 0,
                        }}
                        empty={
                            <EmptyState
                                icon={LuActivity}
                                title='За период записей нет'
                                hint='В выбранном периоде в CRM ничего не меняли. Измените период.'
                            />
                        }
                    />
                </div>
            </section>
        </div>
    )
}
