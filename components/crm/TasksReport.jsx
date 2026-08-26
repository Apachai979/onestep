"use client"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    LuAlertTriangle,
    LuArrowDownWideNarrow,
    LuArrowUpNarrowWide,
    LuCheckCheck,
    LuClipboardList,
    LuDownload,
    LuLink2,
    LuListChecks,
    LuTimer,
    LuUserPlus,
    LuXCircle,
} from "react-icons/lu"
import PeriodFilter from "@/components/crm/PeriodFilter"
import { TaskTypeBadge } from "@/components/crm/TaskTypeIcon"
import { crmToday, formatCrmDate, formatCrmDateTime } from "@/lib/crm/datetime"
import { DEFAULT_PERIOD_PRESET, formatPeriodLabel, periodPreset } from "@/lib/crm/period"
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_TYPE_MAP } from "@/lib/crm/task"
import {
    CardListSkeleton,
    CardRow,
    DataTable,
    EmptyState,
    FilterBar,
    MobileCard,
    StatCard,
} from "@/components/crm/ui"

// У задач своя единица измерения — штуки, а не рубли, поэтому отчёт начинается
// не с года, как «Продажи», а с месяца: задачи оперативные, и годовой срез по
// ним читается хуже, чем месячный.
const TASKS_PERIOD_PRESET = "month"

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

// Полоска «выполнено / не выполнено» вместо графика: доля читается с одного
// взгляда, а библиотеку ради неё не тянем (как в отчёте продаж).
function DoneBar({ done, failed }) {
    const total = done + failed
    if (!total) return <span className='block h-1.5 w-full rounded-full bg-neutral-100' />
    const donePct = (done / total) * 100
    return (
        <span className='flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-100'>
            <span className='block h-full bg-emerald-500/70' style={{ width: `${donePct}%` }} />
            <span className='block h-full bg-red-400/70' style={{ width: `${100 - donePct}%` }} />
        </span>
    )
}

function StatusBadge({ task }) {
    // Открытая задача с прошедшим сроком — это не «открыта», а «просрочена»:
    // в истории именно это и хотят увидеть.
    if (task.status === "OPEN" && task.overdue) {
        return (
            <span className='inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700'>
                Просрочена
            </span>
        )
    }
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                TASK_STATUS_COLORS[task.status] || "bg-neutral-100 text-neutral-600"
            }`}
        >
            {TASK_STATUS_LABELS[task.status] || task.status}
        </span>
    )
}

// Строка истории задачи. Главное в задаче — три текста подряд: тема, что нужно
// было сделать и чем кончилось. Колонками они не читаются (глаз прыгает по
// таблице), поэтому текст идёт вертикальной иерархией во всю ширину.
//
// Служебное — дата, статус, привязка — собрано в одну мелкую строку-шапку над
// темой: сбоку оно отъедало ширину у текста и читалось хуже, а сверху строка
// работает как подпись к записи и не мешает читать её сверху вниз.
//
// Описание и итог показываем целиком: обрезанная середина комментария о
// результате бесполезна, а ради полного текста в отчёт и заходят.
// Точка на ленте цветом статуса: по ней колонка задач читается ещё до того,
// как глаз дошёл до текста — видно, где полоса выполненных, а где срывы.
const TIMELINE_DOTS = {
    DONE: "bg-emerald-500",
    FAILED: "bg-red-500",
    OPEN: "bg-blue-400",
    OVERDUE: "bg-red-400",
}

function TaskHistoryRow({ task, scope, isLast, hideRelation = false }) {
    const dueLabel = task.allDay ? formatCrmDate(task.endAt) : formatCrmDateTime(task.endAt)
    // В разрезе «Запланировано» дата строки — это срок, в «Сделано» — дата
    // закрытия: иначе цифра в таблице не сходится с тем, что видно в списке.
    const showDue = scope === "due" || !task.closedAt
    const dot =
        task.status === "OPEN" && task.overdue
            ? TIMELINE_DOTS.OVERDUE
            : TIMELINE_DOTS[task.status] || TIMELINE_DOTS.OPEN

    return (
        <div className={`relative pl-6 ${isLast ? "" : "pb-5"}`}>
            {/* Линия ленты не рисуется у последней записи — иначе она повисает
                хвостом в пустоте. */}
            {!isLast && (
                <span
                    aria-hidden
                    className='absolute left-[3px] top-4 h-full w-px bg-line'
                />
            )}
            <span
                aria-hidden
                className={`absolute left-0 top-[7px] h-[7px] w-[7px] rounded-full ${dot}`}
            />

            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500'>
                {showDue ? (
                    <span className={`whitespace-nowrap ${task.overdue ? "text-red-600" : ""}`}>
                        {scope === "due" ? "срок " : ""}
                        {dueLabel}
                    </span>
                ) : (
                    <span className='whitespace-nowrap'>
                        {formatCrmDateTime(task.closedAt)}
                        {/* Опоздание подписываем только у даты закрытия — рядом
                            со сроком оно ничего не значит. */}
                        {task.late && (
                            <span className='ml-1 text-amber-600' title={`Срок: ${dueLabel}`}>
                                · с опозданием
                            </span>
                        )}
                    </span>
                )}
                <StatusBadge task={task} />
                {task.relation && !hideRelation && (
                    <>
                        <span className='text-neutral-300'>·</span>
                        <Link
                            href={task.relation.href}
                            title={`${task.relation.label}: ${task.relation.name}`}
                            className='min-w-0 truncate text-neutral-500 hover:text-brand_main'
                        >
                            <span className='text-neutral-400'>{task.relation.label}: </span>
                            {task.relation.name}
                        </Link>
                    </>
                )}
                {task.createdByOther && (
                    <>
                        <span className='text-neutral-300'>·</span>
                        <span className='text-neutral-400'>поставил {task.createdByName}</span>
                    </>
                )}
            </div>

            <div className='mt-1 flex flex-wrap items-start gap-x-2 gap-y-1'>
                <TaskTypeBadge type={task.type} />
                <span className='min-w-0 font-medium text-neutral-900'>{task.title}</span>
            </div>

            {task.description && (
                // whitespace-pre-line — менеджеры пишут описания списками, и без
                // переносов они склеиваются в кашу.
                <p className='mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-600'>
                    {task.description}
                </p>
            )}

            {/* Итог помечаем словом, а не полоской слева: вертикальную линию
                здесь уже держит сама лента, и вторая рядом читается как шум. */}
            {task.result && (
                <p className='mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-600'>
                    <span
                        className={`mr-1.5 text-xs uppercase tracking-wide ${
                            task.status === "FAILED" ? "text-red-400" : "text-emerald-600/70"
                        }`}
                    >
                        Итог
                    </span>
                    {task.result}
                </p>
            )}
        </div>
    )
}

const HISTORY_SCOPES = [
    { key: "closed", label: "Сделано за период", hint: "закрыты внутри периода" },
    { key: "due", label: "Запланировано", hint: "задачи, срок которых пришёлся на период" },
    { key: "all", label: "Все", hint: "" },
]

// Дата, по которой строится лента. В разрезе «Запланировано» это срок, иначе —
// дата закрытия: сортировка должна идти по той же дате, что стоит в строке,
// иначе лента выглядит перемешанной.
function historyDate(task, scope) {
    return new Date(scope === "due" ? task.endAt : task.closedAt || task.endAt).getTime()
}

// Группировка ленты по привязке: задачи одной карточки идут подряд под общим
// заголовком, и из строк привязка убирается — иначе название клиента
// повторяется в каждой записи и забивает шапку.
//
// Внутри групп порядок остаётся датным (тем же, что выбран кнопкой), а сами
// группы идут по алфавиту: их ищут глазами по названию клиента. «Без привязки»
// всегда последней — это остаток, а не карточка.
function groupByRelation(rows) {
    const groups = new Map()
    for (const task of rows) {
        const key = task.relation?.href || "—"
        let group = groups.get(key)
        if (!group) {
            group = { key, relation: task.relation || null, tasks: [] }
            groups.set(key, group)
        }
        group.tasks.push(task)
    }
    return Array.from(groups.values()).sort((a, b) => {
        if (!a.relation) return 1
        if (!b.relation) return -1
        return a.relation.name.localeCompare(b.relation.name, "ru")
    })
}

// Расшифровка строки менеджера: сама история задач и разрез по типам.
// Переключатель осей стоит прямо здесь — «сделано» и «запланировано» это два
// разных списка, и без явного выбора цифры в таблице не сходятся со списком.
function ManagerDetails({ manager }) {
    const [scope, setScope] = useState("closed")
    const [showTypes, setShowTypes] = useState(false)
    const [asc, setAsc] = useState(false)
    const [byRelation, setByRelation] = useState(false)

    const rows = useMemo(() => {
        const filtered =
            scope === "closed"
                ? manager.tasks.filter(t => t.inClosed)
                : scope === "due"
                  ? manager.tasks.filter(t => t.inDue)
                  : manager.tasks
        // Копия перед сортировкой: manager.tasks приходит из состояния отчёта,
        // и его порядок ломать нельзя.
        return [...filtered].sort((a, b) => {
            const diff = historyDate(a, scope) - historyDate(b, scope)
            return asc ? diff : -diff
        })
    }, [manager.tasks, scope, asc])

    const groups = useMemo(
        () => (byRelation ? groupByRelation(rows) : null),
        [rows, byRelation],
    )

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-1'>
                {HISTORY_SCOPES.map(s => {
                    const count =
                        s.key === "closed"
                            ? manager.closed.total
                            : s.key === "due"
                              ? manager.planned.total
                              : manager.tasksCount
                    return (
                        <button
                            key={s.key}
                            type='button'
                            title={s.hint}
                            onClick={() => {
                                setScope(s.key)
                                setShowTypes(false)
                            }}
                            className={`h-7 rounded-lg px-2.5 text-xs transition-colors ${
                                !showTypes && scope === s.key
                                    ? "bg-brand_main/10 font-medium text-neutral-900"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                            {s.label}
                            <span className='ml-1 tabular-nums text-neutral-400'>{count}</span>
                        </button>
                    )
                })}
                <button
                    type='button'
                    onClick={() => setShowTypes(true)}
                    className={`h-7 rounded-lg px-2.5 text-xs transition-colors ${
                        showTypes
                            ? "bg-brand_main/10 font-medium text-neutral-900"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                >
                    По типам
                    <span className='ml-1 tabular-nums text-neutral-400'>
                        {manager.types.length}
                    </span>
                </button>

                {/* Порядок ленты. По умолчанию новые сверху — обычно смотрят
                    «чем человек занимался последнее время»; обратный порядок
                    нужен, когда историю периода читают с начала. Группировка по
                    связи отвечает на другой вопрос — «что делали по этому
                    клиенту», и дату не отменяет: внутри группы она сохраняется. */}
                {/* Кнопки живут при любом непустом списке: раньше они прятались
                    на списке из одной задачи, и включённая группировка оставалась
                    без своего переключателя. */}
                {!showTypes && rows.length > 0 && (
                    <span className='ml-auto flex items-center gap-1'>
                        <button
                            type='button'
                            onClick={() => setByRelation(v => !v)}
                            title='Сгруппировать задачи по сделке, проекту или контрагенту'
                            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs transition-colors ${
                                byRelation
                                    ? "bg-brand_main/10 font-medium text-neutral-900"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                            <LuLink2 className='h-3.5 w-3.5' />
                            По связи
                        </button>
                        <button
                            type='button'
                            onClick={() => setAsc(v => !v)}
                            title='Изменить порядок сортировки по дате'
                            className='inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
                        >
                            {asc ? (
                                <LuArrowUpNarrowWide className='h-3.5 w-3.5' />
                            ) : (
                                <LuArrowDownWideNarrow className='h-3.5 w-3.5' />
                            )}
                            {asc ? "Сначала старые" : "Сначала новые"}
                        </button>
                    </span>
                )}
            </div>

            {showTypes ? (
                manager.types.length ? (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead className='text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400'>
                                <tr>
                                    <th className='py-1.5 pr-3 font-medium'>Тип задачи</th>
                                    <th className='w-[30%] py-1.5 pr-3 font-medium'>Доля</th>
                                    <th className='w-[10%] py-1.5 pr-3 text-right font-medium'>
                                        Выполнено
                                    </th>
                                    <th className='w-[10%] py-1.5 pr-3 text-right font-medium'>
                                        Не выполнено
                                    </th>
                                    <th className='w-[10%] py-1.5 text-right font-medium'>
                                        Закрыто
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {manager.types.map(t => (
                                    <tr key={t.key} className='border-t border-line/70'>
                                        <td className='py-2 pr-3'>
                                            <TaskTypeBadge type={t.key} />
                                        </td>
                                        <td className='py-2 pr-3'>
                                            <DoneBar done={t.done} failed={t.failed} />
                                        </td>
                                        <td className='py-2 pr-3 text-right tabular-nums text-emerald-700'>
                                            {t.done}
                                        </td>
                                        <td className='py-2 pr-3 text-right tabular-nums text-neutral-500'>
                                            {t.failed || "—"}
                                        </td>
                                        <td className='py-2 text-right font-semibold tabular-nums text-neutral-900'>
                                            {t.closed}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className='text-sm text-neutral-500'>За период закрытых задач нет.</p>
                )
            ) : rows.length ? (
                <>
                    <div className='pt-1'>
                        {groups
                            ? groups.map(group => (
                                  // Группа — в языке остальной CRM: тонкая линия
                                  // сверху и приглушённая строка-заголовок, как в
                                  // SectionHeading и истории изменений. Подложек,
                                  // рамок и теней здесь нет намеренно — раскрытая
                                  // строка уже лежит в белой карточке таблицы, и
                                  // карточка внутри карточки этому стилю чужда:
                                  // структуру держат линия и отступы.
                                  <div
                                      key={group.key}
                                      className='mt-4 border-t border-line pt-3 first:mt-0 first:border-t-0 first:pt-0'
                                  >
                                      <div className='mb-1.5 flex items-center gap-x-2'>
                                          {/* Фирменный цвет, как у иконок в
                                              заголовках секций: бледно-серая
                                              иконка терялась и заголовок группы
                                              не цеплял взгляд. */}
                                          <LuLink2 className='h-3.5 w-3.5 shrink-0 text-brand_main' />
                                          {group.relation ? (
                                              <Link
                                                  href={group.relation.href}
                                                  className='min-w-0 truncate text-sm font-medium text-neutral-900 hover:text-brand_main'
                                              >
                                                  <span className='text-xs uppercase tracking-wide text-neutral-400'>
                                                      {group.relation.label}{" "}
                                                  </span>
                                                  {group.relation.name}
                                              </Link>
                                          ) : (
                                              <span className='text-sm font-medium text-neutral-500'>
                                                  Без привязки
                                              </span>
                                          )}
                                          {/* Счётчик прижат к правому краю: так
                                              они выстраиваются в столбик и группы
                                              видно, не читая названий. */}
                                          <span className='ml-auto shrink-0 rounded-full bg-surface_muted px-2 py-0.5 text-xs tabular-nums text-neutral-500'>
                                              {group.tasks.length}
                                          </span>
                                      </div>
                                      {group.tasks.map((task, i) => (
                                          <TaskHistoryRow
                                              key={task.id}
                                              task={task}
                                              scope={scope}
                                              isLast={i === group.tasks.length - 1}
                                              hideRelation
                                          />
                                      ))}
                                  </div>
                              ))
                            : rows.map((task, i) => (
                                  <TaskHistoryRow
                                      key={task.id}
                                      task={task}
                                      scope={scope}
                                      isLast={i === rows.length - 1}
                                  />
                              ))}
                    </div>
                    {/* Длинную историю режем на сервере — молчать об этом нельзя,
                        иначе список выглядит полным. */}
                    {manager.tasksTruncated && (
                        <p className='text-xs text-neutral-400'>
                            Показаны последние {manager.tasks.length} из {manager.tasksCount} задач
                            за период — полный список в Excel-выгрузке.
                        </p>
                    )}
                </>
            ) : (
                <p className='text-sm text-neutral-500'>Задач в этом разрезе нет.</p>
            )}
        </div>
    )
}

export default function TasksReport() {
    const [period, setPeriod] = useState(() => periodPreset(TASKS_PERIOD_PRESET, crmToday()))
    const [data, setData] = useState(null)
    const [error, setError] = useState("")

    const query = `from=${period.from}&to=${period.to}`

    useEffect(() => {
        const controller = new AbortController()
        setError("")
        setData(null)
        fetch(`/api/crm/analytics/tasks?${query}`, { signal: controller.signal })
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || "Ошибка загрузки")
                return r.json()
            })
            .then(setData)
            .catch(err => {
                if (err.name === "AbortError") return
                setError(err.message)
                setData({ managers: [], creators: [], types: [], totals: {} })
            })
        return () => controller.abort()
    }, [query])

    const loading = data === null
    const managers = data?.managers || []
    const creators = data?.creators || []
    const totals = data?.totals || {}
    const closed = totals.closed || {}
    const planned = totals.planned || {}
    const created = totals.created || {}

    const columns = useMemo(
        () => [
            {
                key: "manager",
                header: "Менеджер",
                sortable: true,
                sortValue: m => m.name,
                render: m => (
                    <div className='min-w-0'>
                        <span className='font-medium text-neutral-900'>{m.name}</span>
                        {m.position && (
                            <span className='block truncate text-xs text-neutral-500'>
                                {m.position}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "done",
                header: "Выполнено",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.closed.done,
                render: m => (
                    <span className='font-semibold tabular-nums text-neutral-900'>
                        {m.closed.done}
                    </span>
                ),
            },
            {
                key: "failed",
                header: "Не выполнено",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.closed.failed,
                render: m => (
                    <span
                        className={`tabular-nums ${
                            m.closed.failed ? "text-red-600" : "text-neutral-400"
                        }`}
                    >
                        {m.closed.failed || "—"}
                    </span>
                ),
            },
            {
                key: "doneRate",
                header: "Выполнение",
                sortable: true,
                hideable: true,
                // По умолчанию скрыта: доля выполненных от закрытых почти всегда
                // близка к 100 % и ничего не различает — числа «выполнено» и
                // «не выполнено» рядом информативнее.
                defaultHidden: true,
                sortValue: m => m.doneRate,
                render: m => (
                    <div className='flex min-w-[7rem] items-center gap-2'>
                        <DoneBar done={m.closed.done} failed={m.closed.failed} />
                        <span className='w-11 shrink-0 text-right text-xs tabular-nums text-neutral-500'>
                            {m.closed.total ? `${m.doneRate} %` : "—"}
                        </span>
                    </div>
                ),
            },
            {
                key: "onTime",
                header: "В срок",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.onTimeRate,
                render: m =>
                    m.closed.done ? (
                        <span className='tabular-nums text-neutral-700' title='Из выполненных задач'>
                            {m.onTimeRate} %
                            {m.closed.doneLate > 0 && (
                                <span className='block text-[11px] text-amber-600'>
                                    {m.closed.doneLate} с опозданием
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className='text-neutral-400'>—</span>
                    ),
            },
            {
                key: "planned",
                header: "Запланировано",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.planned.total,
                render: m => (
                    <span
                        className='tabular-nums text-neutral-700'
                        title='Задачи, срок которых пришёлся на период'
                    >
                        {m.planned.total}
                    </span>
                ),
            },
            {
                key: "open",
                header: "Ещё открыто",
                align: "right",
                sortable: true,
                headerClassName: "whitespace-nowrap",
                sortValue: m => m.planned.open,
                render: m => (
                    <span className='tabular-nums text-neutral-700'>
                        {m.planned.open || "—"}
                        {m.planned.overdue > 0 && (
                            <span className='block text-[11px] text-red-600'>
                                {m.planned.overdue} просроч.
                            </span>
                        )}
                    </span>
                ),
            },
            {
                key: "created",
                header: "Поставил",
                align: "right",
                sortable: true,
                hideable: true,
                // По умолчанию скрыта: это не работа менеджера, а раздача
                // поручений — для неё внизу есть своя таблица.
                defaultHidden: true,
                sortValue: m => m.created.total,
                render: m => (
                    <span
                        className='tabular-nums text-neutral-500'
                        title='Задачи, заведённые этим сотрудником за период'
                    >
                        {m.created.total || "—"}
                        {m.created.forOthers > 0 && (
                            <span className='block text-[11px] text-neutral-400'>
                                {m.created.forOthers} другим
                            </span>
                        )}
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
                        href={`/api/crm/analytics/tasks/export?${query}`}
                        title='Выгрузить отчёт в Excel: свод, типы, постановщики и вся история задач'
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
                    label='Выполнено за период'
                    value={loading ? "…" : closed.done || 0}
                    hint={
                        loading
                            ? undefined
                            : `${totals.doneRate || 0} % от ${closed.total || 0} закрытых · ${formatPeriodLabel(period)}`
                    }
                    icon={LuCheckCheck}
                    tone='success'
                />
                <StatCard
                    size='sm'
                    label='Не выполнено'
                    value={loading ? "…" : closed.failed || 0}
                    hint={loading ? undefined : "закрыты со статусом «Не выполнена»"}
                    icon={LuXCircle}
                    tone={closed.failed > 0 ? "danger" : "neutral"}
                />
                <StatCard
                    size='sm'
                    label='Выполнено в срок'
                    value={loading ? "…" : closed.done ? `${totals.onTimeRate} %` : "—"}
                    hint={
                        loading
                            ? undefined
                            : `${closed.doneOnTime || 0} из ${closed.done || 0} · ${closed.doneLate || 0} с опозданием`
                    }
                    icon={LuTimer}
                    tone={totals.onTimeRate >= 80 ? "brand" : "warn"}
                />
                <StatCard
                    size='sm'
                    label='Просрочено сейчас'
                    value={loading ? "…" : planned.overdue || 0}
                    hint={
                        loading
                            ? undefined
                            : `из ${planned.open || 0} открытых со сроком в периоде · всего в плане ${planned.total || 0}`
                    }
                    icon={LuAlertTriangle}
                    tone={planned.overdue > 0 ? "danger" : "neutral"}
                />
            </div>

            {error && (
                <p className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                    {error}
                </p>
            )}

            {/* Закрытая задача без даты закрытия в «сделано» не попадает — это
                записи, закрытые до появления поля; молчать о них нельзя. */}
            {!loading && totals.undatedClosed > 0 && (
                <p className='flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                    <LuAlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                    <span>
                        {totals.undatedClosed} закрытых задач без даты закрытия — в «сделано за
                        период» они не попали, но видны в разрезе по сроку.
                    </span>
                </p>
            )}

            <section className='space-y-3'>
                <SectionHeading
                    icon={LuListChecks}
                    title='Задачи менеджеров'
                    count={loading ? null : managers.length}
                    hint='строка раскрывается — история задач и разрез по типам'
                />

                <div className='space-y-3 md:hidden'>
                    {loading && <CardListSkeleton />}
                    {managers.map(m => (
                        <MobileCard key={m.id || m.name}>
                            <div className='flex items-start justify-between gap-2'>
                                <span className='font-medium text-neutral-900'>{m.name}</span>
                                <span className='shrink-0 text-sm font-semibold tabular-nums text-neutral-900'>
                                    {m.closed.done} вып.
                                </span>
                            </div>
                            <div className='mt-2 space-y-1'>
                                <CardRow label='Не выполнено'>{m.closed.failed}</CardRow>
                                <CardRow label='Выполнение'>
                                    {m.closed.total ? `${m.doneRate} %` : "—"}
                                </CardRow>
                                <CardRow label='В срок'>
                                    {m.closed.done ? `${m.onTimeRate} %` : "—"}
                                </CardRow>
                                <CardRow label='Просрочено'>{m.planned.overdue}</CardRow>
                            </div>
                        </MobileCard>
                    ))}
                </div>

                <div className='hidden md:block'>
                    <DataTable
                        columns={columns}
                        rows={managers}
                        loading={loading}
                        getRowId={m => m.id || m.name}
                        initialSort={{ key: "done", dir: "desc" }}
                        pageSize={50}
                        expandable={{
                            render: m => <ManagerDetails manager={m} />,
                            isExpandable: m => m.tasksCount > 0,
                        }}
                        empty={
                            <EmptyState
                                icon={LuClipboardList}
                                title='За период задач нет'
                                hint='В выбранном периоде не закрыто и не запланировано ни одной задачи. Измените период.'
                            />
                        }
                    />
                </div>
            </section>

            {!loading && creators.length > 0 && (
                <section className='space-y-3'>
                    <SectionHeading
                        icon={LuUserPlus}
                        title='Кто ставил задачи'
                        count={creators.length}
                        hint={`заведено за период: ${created.total || 0}`}
                    />
                    <div className='overflow-hidden rounded-2xl border border-line bg-white shadow-sm'>
                        <table className='w-full text-sm'>
                            <thead className='border-b border-line text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400'>
                                <tr>
                                    <th className='px-3.5 py-2.5 font-medium'>Сотрудник</th>
                                    <th className='w-[16%] px-3.5 py-2.5 text-right font-medium'>
                                        Поставил
                                    </th>
                                    <th className='w-[16%] px-3.5 py-2.5 text-right font-medium'>
                                        Другим
                                    </th>
                                    <th className='w-[16%] px-3.5 py-2.5 text-right font-medium'>
                                        Себе
                                    </th>
                                    <th className='w-[18%] px-3.5 py-2.5 text-right font-medium'>
                                        Исполнителей
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {creators.map(c => (
                                    <tr key={c.id || c.name} className='border-t border-line/70'>
                                        <td className='px-3.5 py-2.5'>
                                            <span className='font-medium text-neutral-900'>
                                                {c.name}
                                            </span>
                                            {c.position && (
                                                <span className='block text-xs text-neutral-500'>
                                                    {c.position}
                                                </span>
                                            )}
                                        </td>
                                        <td className='px-3.5 py-2.5 text-right font-semibold tabular-nums text-neutral-900'>
                                            {c.total}
                                        </td>
                                        <td className='px-3.5 py-2.5 text-right tabular-nums text-neutral-700'>
                                            {c.forOthers || "—"}
                                        </td>
                                        <td className='px-3.5 py-2.5 text-right tabular-nums text-neutral-500'>
                                            {c.forSelf || "—"}
                                        </td>
                                        <td className='px-3.5 py-2.5 text-right tabular-nums text-neutral-500'>
                                            {c.assigneesCount || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {!loading && (data?.types?.length ?? 0) > 0 && (
                <section className='space-y-3'>
                    <SectionHeading
                        icon={LuClipboardList}
                        title='Чем занимались'
                        hint='закрытые задачи по типам, весь отдел'
                    />
                    <div className='rounded-2xl border border-line bg-white p-3.5 shadow-sm'>
                        <div className='space-y-2'>
                            {data.types.map(t => {
                                const max = data.types[0]?.closed || 0
                                const width = max ? Math.max(2, (t.closed / max) * 100) : 0
                                return (
                                    <div key={t.key} className='flex items-center gap-3'>
                                        <span className='w-44 shrink-0 truncate text-xs text-neutral-600'>
                                            {TASK_TYPE_MAP[t.key]?.label || t.key}
                                        </span>
                                        <span className='block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100'>
                                            <span
                                                className='block h-full rounded-full bg-brand_main/70'
                                                style={{ width: `${width}%` }}
                                            />
                                        </span>
                                        <span className='w-16 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900'>
                                            {t.closed}
                                        </span>
                                        <span
                                            className='hidden w-28 shrink-0 text-right text-xs tabular-nums text-neutral-400 sm:block'
                                            title='Из них не выполнено'
                                        >
                                            {t.failed ? `${t.failed} не вып.` : ""}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
