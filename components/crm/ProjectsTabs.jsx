"use client"
import { useEffect, useMemo, useState } from "react"
import { LuPlus } from "react-icons/lu"
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/crm/project"
import {
    Button,
    FilterBar,
    FilterMulti,
    FilterPicker,
    FilterSearch,
    FilterText,
    FilterToggle,
} from "@/components/crm/ui"
import ProjectsKanban from "./ProjectsKanban"
import ProjectsList from "./ProjectsList"

const EMPTY_FILTERS = {
    q: "",
    status: [],
    region: "",
    distributorId: "",
    customerId: "",
    managerId: "",
}

function fullName(u) {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email
}

function counterpartyOption(c) {
    return {
        id: c.id,
        label: c.name,
        sublabel: `${c.inn ? `ИНН ${c.inn}` : ""}${c.inn && c.region ? " · " : ""}${
            c.region ?? ""
        }`,
        search: `${c.name} ${c.inn ?? ""} ${c.region ?? ""}`,
    }
}

// Фильтр общий для канбана и списка: состояние живёт здесь, а вкладка
// получает уже готовую строку запроса. Переключение вида ничего не сбрасывает.
// Статус в канбане не участвует — там статусы это сами колонки.
function buildQuery(filters, { includeStatus }) {
    const params = new URLSearchParams()
    if (includeStatus && filters.status.length) params.set("status", filters.status.join(","))
    if (filters.customerId) params.set("customerId", filters.customerId)
    if (filters.distributorId) params.set("distributorId", filters.distributorId)
    if (filters.managerId) params.set("managerId", filters.managerId)
    if (filters.region.trim()) params.set("region", filters.region.trim())
    if (filters.q.trim()) params.set("q", filters.q.trim())
    return params.toString()
}

export default function ProjectsTabs({ currentUserId, isAdmin = false }) {
    const [view, setView] = useState("kanban")
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [refs, setRefs] = useState({ distributors: [], customers: [], managers: [] })

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

    // Запрос идёт не на каждый символ: ждём паузы в наборе.
    const [applied, setApplied] = useState(filters)
    useEffect(() => {
        const t = setTimeout(() => setApplied(filters), 300)
        return () => clearTimeout(t)
    }, [filters])

    const query = useMemo(
        () => buildQuery(applied, { includeStatus: view === "list" }),
        [applied, view],
    )

    // Поиск в счёт не идёт — у поля есть собственный крестик.
    const activeCount =
        (view === "list" ? filters.status.length : 0) +
        (filters.customerId ? 1 : 0) +
        (filters.distributorId ? 1 : 0) +
        (filters.managerId ? 1 : 0) +
        (filters.region ? 1 : 0)

    const statusOptions = useMemo(
        () => PROJECT_STATUSES.map(s => ({ value: s, label: PROJECT_STATUS_LABELS[s] })),
        [],
    )

    const distributorOptions = useMemo(
        () => refs.distributors.map(counterpartyOption),
        [refs.distributors],
    )

    const customerOptions = useMemo(
        () => refs.customers.map(counterpartyOption),
        [refs.customers],
    )

    const managerOptions = useMemo(
        () =>
            refs.managers.map(m => {
                const name = fullName(m)
                return {
                    id: m.id,
                    label: m.id === currentUserId ? `${name} (вы)` : name,
                    search: `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`,
                }
            }),
        [refs.managers, currentUserId],
    )

    function setId(field) {
        return id => setFilters(prev => ({ ...prev, [field]: id }))
    }

    return (
        <div className='space-y-4'>
            {/* Кнопка создания живёт на уровне вкладок — она нужна в обоих режимах. */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='inline-flex w-fit rounded-xl border border-line bg-white p-1 text-sm shadow-sm'>
                    {[
                        ["kanban", "Канбан"],
                        ["list", "Список"],
                    ].map(([v, label]) => (
                        <button
                            key={v}
                            type='button'
                            onClick={() => setView(v)}
                            className={`rounded-lg px-4 py-1.5 font-medium transition-all duration-200 ${
                                view === v
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Button href='/crm/projects/new' size='sm'>
                    <LuPlus className='h-4 w-4' />
                    Новый проект
                </Button>
            </div>

            <FilterBar canReset={activeCount > 0} onReset={() => setFilters(EMPTY_FILTERS)}>
                <FilterSearch
                    value={filters.q}
                    onChange={q => setFilters(prev => ({ ...prev, q }))}
                    onEnter={() => setApplied(filters)}
                    placeholder='Название, клиент'
                />
                {/* На канбане статусы — это колонки, отдельный фильтр там лишний. */}
                {view === "list" && (
                    <FilterMulti
                        label='Статус'
                        value={filters.status}
                        onChange={status => setFilters(prev => ({ ...prev, status }))}
                        options={statusOptions}
                    />
                )}
                <FilterPicker
                    label='Потребитель'
                    value={filters.customerId}
                    onChange={setId("customerId")}
                    options={customerOptions}
                    searchPlaceholder='Название или ИНН'
                    emptyLabel='Клиент не найден'
                />
                <FilterPicker
                    label='Дистрибьютор'
                    value={filters.distributorId}
                    onChange={setId("distributorId")}
                    options={distributorOptions}
                    searchPlaceholder='Название или ИНН'
                    emptyLabel='Дистрибьютор не найден'
                />
                <FilterPicker
                    label='Менеджер'
                    value={filters.managerId}
                    onChange={setId("managerId")}
                    options={managerOptions}
                    searchPlaceholder='Имя или email'
                    emptyLabel='Сотрудник не найден'
                />
                <FilterText
                    label='Регион'
                    value={filters.region}
                    onChange={region => setFilters(prev => ({ ...prev, region }))}
                    placeholder='Например, Москва'
                />
                {currentUserId && (
                    <FilterToggle
                        label='Только мои'
                        title='Показать только мои проекты'
                        active={filters.managerId === currentUserId}
                        onChange={on =>
                            setFilters(prev => ({
                                ...prev,
                                managerId: on ? currentUserId : "",
                            }))
                        }
                    />
                )}
            </FilterBar>

            {view === "kanban" ? (
                <ProjectsKanban query={query} isAdmin={isAdmin} />
            ) : (
                <ProjectsList query={query} />
            )}
        </div>
    )
}
