"use client"
import { useEffect, useMemo, useState } from "react"
import { LuPlus } from "react-icons/lu"
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "@/lib/crm/deal"
import {
    Button,
    FilterBar,
    FilterMulti,
    FilterPicker,
    FilterSearch,
    FilterSelect,
    FilterToggle,
} from "@/components/crm/ui"
import DealsKanban from "./DealsKanban"
import DealsList from "./DealsList"

const TABS = [
    { key: "kanban", label: "Канбан" },
    { key: "list", label: "Список" },
]

const EMPTY_FILTERS = {
    status: [],
    counterpartyId: "",
    managerId: "",
    isAuction: "",
    q: "",
}

// Фильтр общий для канбана и списка: состояние живёт здесь, а вкладка
// получает уже готовую строку запроса. Переключение вида ничего не сбрасывает.
// Статус в канбане не участвует — там статусы это сами колонки.
function buildQuery(filters, { includeStatus }) {
    const params = new URLSearchParams()
    if (includeStatus && filters.status.length) params.set("status", filters.status.join(","))
    if (filters.counterpartyId) params.set("counterpartyId", filters.counterpartyId)
    if (filters.managerId) params.set("managerId", filters.managerId)
    if (filters.isAuction) params.set("isAuction", filters.isAuction)
    if (filters.q.trim()) params.set("q", filters.q.trim())
    return params.toString()
}

export default function DealsTabs({ currentUserId, isAdmin = false }) {
    const [tab, setTab] = useState("kanban")
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [counterparties, setCounterparties] = useState([])
    const [managers, setManagers] = useState([])

    useEffect(() => {
        Promise.all([
            fetch("/api/crm/counterparties")
                .then(r => (r.ok ? r.json() : { items: [] }))
                .catch(() => ({ items: [] })),
            fetch("/api/crm/users")
                .then(r => (r.ok ? r.json() : { items: [] }))
                .catch(() => ({ items: [] })),
        ]).then(([c, u]) => {
            setCounterparties(c.items || [])
            setManagers(u.items || [])
        })
    }, [])

    // Запрос идёт не на каждый символ: ждём паузы в наборе.
    const [applied, setApplied] = useState(filters)
    useEffect(() => {
        const t = setTimeout(() => setApplied(filters), 300)
        return () => clearTimeout(t)
    }, [filters])

    const query = useMemo(
        () => buildQuery(applied, { includeStatus: tab === "list" }),
        [applied, tab],
    )

    // «Показать все» из обрезанной колонки канбана: открываем список,
    // отфильтрованный по этому статусу — длинную колонку удобнее смотреть
    // таблицей. Фильтр применяем сразу, без debounce.
    function showAllInList(status) {
        const next = { ...filters, status: [status] }
        setFilters(next)
        setApplied(next)
        setTab("list")
    }

    // Поиск в счёт не идёт — у поля есть собственный крестик.
    const activeCount =
        (tab === "list" ? filters.status.length : 0) +
        (filters.counterpartyId ? 1 : 0) +
        (filters.managerId ? 1 : 0) +
        (filters.isAuction ? 1 : 0)

    const statusOptions = useMemo(
        () => DEAL_STATUSES.map(s => ({ value: s, label: DEAL_STATUS_LABELS[s] })),
        [],
    )

    const counterpartyOptions = useMemo(
        () =>
            counterparties.map(c => ({
                id: c.id,
                label: c.name,
                sublabel: c.type === "DISTRIBUTOR" ? "Дистрибьютор" : "Конечный потребитель",
                search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
            })),
        [counterparties],
    )

    const managerOptions = useMemo(
        () =>
            managers.map(u => {
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
                return {
                    id: u.id,
                    label: u.id === currentUserId ? `${name} (вы)` : name,
                    search: `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`,
                }
            }),
        [managers, currentUserId],
    )

    return (
        <div className='space-y-4'>
            {/* Кнопка создания живёт на уровне вкладок — она нужна в обоих режимах. */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='inline-flex rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            type='button'
                            onClick={() => setTab(t.key)}
                            className={`rounded-lg px-4 py-1.5 font-medium transition-all duration-200 ${
                                tab === t.key
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <Button href='/crm/deals/new' size='sm'>
                    <LuPlus className='h-4 w-4' />
                    Новая сделка
                </Button>
            </div>

            <FilterBar
                canReset={activeCount > 0}
                onReset={() => setFilters(EMPTY_FILTERS)}
            >
                <FilterSearch
                    value={filters.q}
                    onChange={q => setFilters(p => ({ ...p, q }))}
                    onEnter={() => setApplied(filters)}
                    placeholder='Название сделки или клиента'
                />
                {/* На канбане статусы — это колонки, отдельный фильтр там лишний. */}
                {tab === "list" && (
                    <FilterMulti
                        label='Статус'
                        value={filters.status}
                        onChange={status => setFilters(p => ({ ...p, status }))}
                        options={statusOptions}
                    />
                )}
                <FilterPicker
                    label='Клиент'
                    value={filters.counterpartyId}
                    onChange={id => setFilters(p => ({ ...p, counterpartyId: id }))}
                    options={counterpartyOptions}
                    searchPlaceholder='Название или ИНН'
                    emptyLabel='Клиент не найден'
                />
                <FilterPicker
                    label='Менеджер'
                    value={filters.managerId}
                    onChange={id => setFilters(p => ({ ...p, managerId: id }))}
                    options={managerOptions}
                    searchPlaceholder='Имя или email'
                    emptyLabel='Сотрудник не найден'
                />
                <FilterSelect
                    label='Тип'
                    value={filters.isAuction}
                    onChange={v => setFilters(p => ({ ...p, isAuction: v }))}
                    options={[
                        { value: "true", label: "Только аукционы" },
                        { value: "false", label: "Без аукционов" },
                    ]}
                />
                {currentUserId && (
                    <FilterToggle
                        label='Только мои'
                        title='Показать только мои сделки'
                        active={filters.managerId === currentUserId}
                        onChange={on =>
                            setFilters(p => ({ ...p, managerId: on ? currentUserId : "" }))
                        }
                    />
                )}
            </FilterBar>

            {tab === "kanban" ? (
                <DealsKanban query={query} isAdmin={isAdmin} onShowAll={showAllInList} />
            ) : (
                <DealsList query={query} />
            )}
        </div>
    )
}
