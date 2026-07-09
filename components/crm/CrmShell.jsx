"use client"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { signOut } from "next-auth/react"
import {
    LuInbox,
    LuLayoutDashboard,
    LuListTodo,
    LuBriefcase,
    LuGavel,
    LuTruck,
    LuTarget,
    LuStore,
    LuStethoscope,
    LuContact,
    LuPackage,
    LuSearch,
    LuSettings,
    LuUsers,
    LuLogOut,
    LuMenu,
    LuX,
} from "react-icons/lu"
import { onTasksChanged } from "@/lib/crm/tasks-events"
import { ConfirmProvider, ToastProvider } from "@/components/crm/ui"
import { CrmNavTracker } from "@/components/crm/CrmBackLink"
import GlobalSearch from "@/components/crm/GlobalSearch"
import InstallAppButton from "@/components/crm/InstallAppButton"

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function useTaskCounts() {
    const [counts, setCounts] = useState(null)
    const load = useCallback(async () => {
        try {
            const r = await fetch("/api/crm/tasks/count")
            const text = await r.text()
            const data = text ? safeJson(text) : {}
            if (r.ok) setCounts(data)
        } catch {
            /* ignore */
        }
    }, [])
    useEffect(() => {
        load()
        const id = setInterval(load, 60_000)
        const off = onTasksChanged(load)
        return () => {
            clearInterval(id)
            off()
        }
    }, [load])
    return counts
}

function userInitials(name, email) {
    const src = (name || email || "").trim()
    if (!src) return "?"
    const parts = src.split(/[\s.@]+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function CrmShell({ user, role, children }) {
    const pathname = usePathname()
    const counts = useTaskCounts()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)

    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    // Ctrl+K / Cmd+K — глобальный поиск. Плюс событие от кнопок на страницах
    // (например, строка поиска на дашборде).
    useEffect(() => {
        function onKey(e) {
            // e.code === "KeyK" — по физической клавише, чтобы работало и на
            // русской раскладке (где e.key === "л"). e.key — запасной вариант.
            const isK = e.code === "KeyK" || e.key?.toLowerCase() === "k"
            if ((e.ctrlKey || e.metaKey) && isK) {
                e.preventDefault()
                setSearchOpen(o => !o)
            }
        }
        function onOpen() {
            setSearchOpen(true)
        }
        window.addEventListener("keydown", onKey)
        window.addEventListener("crm:open-search", onOpen)
        return () => {
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("crm:open-search", onOpen)
        }
    }, [])

    const overdue = counts?.mineOverdue || 0
    const open = counts?.mineOpen || 0
    const taskBadge = useMemo(
        () => (open > 0 ? { count: open, urgent: overdue > 0 } : null),
        [open, overdue],
    )

    const navItems = useMemo(() => {
        const base = [
            { href: "/crm", label: "Главная", icon: LuLayoutDashboard, exact: true },
            { href: "/crm/leads", label: "Заявки с сайта", icon: LuInbox },
            { href: "/crm/tasks", label: "Задачи", icon: LuListTodo, badge: taskBadge },
            { href: "/crm/deals", label: "Сделки", icon: LuBriefcase },
            { href: "/crm/shipments", label: "Отгрузки", icon: LuTruck },
            { href: "/crm/projects", label: "Проекты", icon: LuTarget },
            { href: "/crm/auctions", label: "Аукционы", icon: LuGavel },
            { href: "/crm/distributors", label: "Дистрибьюторы", icon: LuStore },
            { href: "/crm/customers", label: "Конечные потребители", icon: LuStethoscope },
            { href: "/crm/contacts", label: "Контакты", icon: LuContact },
            { href: "/crm/products", label: "Товары", icon: LuPackage },
        ]
        if (role === "ADMIN") {
            base.push({ href: "/crm/users", label: "Пользователи", icon: LuUsers })
            base.push({ href: "/crm/settings", label: "Настройки", icon: LuSettings })
        }
        return base
    }, [role, taskBadge])

    function isActive(item) {
        if (item.exact) return pathname === item.href
        return pathname === item.href || pathname.startsWith(item.href + "/")
    }

    function SidebarContent({ alwaysExpanded = false, onClose }) {
        const showLabels = alwaysExpanded
            ? "opacity-100"
            : "opacity-0 group-hover/aside:opacity-100"
        return (
            <div className='relative flex h-full flex-col overflow-hidden border-r border-brand_soft/40 bg-white/75 backdrop-blur-md'>
                {/* decorative brand wash — very subtle mint gradient at top */}
                <div
                    aria-hidden
                    className='pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand_soft/35 via-brand_soft/10 to-transparent'
                />

                <div className='relative flex h-16 shrink-0 items-center gap-3 border-b border-brand_soft/30 px-4'>
                    <Link
                        href='/crm'
                        className='flex min-w-0 items-center gap-3'
                        title='OneStep CRM'
                    >
                        <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center'>
                            <Image
                                src='/logo_only.svg'
                                alt='OneStep'
                                width={34}
                                height={34}
                                priority
                            />
                        </span>
                        <span
                            className={`whitespace-nowrap text-sm font-bold tracking-wide text-night_green transition-opacity duration-150 ${showLabels}`}
                        >
                            ONESTEP CRM
                        </span>
                    </Link>
                    {onClose && (
                        <button
                            type='button'
                            onClick={onClose}
                            className='ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-night_green/60 hover:bg-brand_soft/40 hover:text-night_green'
                            aria-label='Закрыть меню'
                        >
                            <LuX className='h-5 w-5' />
                        </button>
                    )}
                </div>

                <nav className='relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3'>
                    <button
                        type='button'
                        onClick={() => {
                            setSearchOpen(true)
                            onClose?.()
                        }}
                        title={alwaysExpanded ? undefined : "Поиск (Ctrl+K)"}
                        className='group/item mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-night_green/75 transition hover:bg-brand_soft/40 hover:text-night_green'
                    >
                        <LuSearch className='h-5 w-5 shrink-0 text-brand_main/80 group-hover/item:text-brand_main' />
                        <span
                            className={`flex-1 truncate whitespace-nowrap text-left font-medium transition-opacity duration-150 ${showLabels}`}
                        >
                            Поиск
                        </span>
                        <kbd
                            className={`shrink-0 rounded border border-brand_soft/60 px-1.5 py-0.5 text-[10px] text-night_green/45 transition-opacity duration-150 ${showLabels}`}
                        >
                            Ctrl K
                        </kbd>
                    </button>
                    <ul className='space-y-0.5'>
                        {navItems.map(item => {
                            const Icon = item.icon
                            const active = isActive(item)
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        title={alwaysExpanded ? undefined : item.label}
                                        className={`group/item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                                            active
                                                ? "bg-brand_main text-white shadow-sm shadow-brand_main/20"
                                                : "text-night_green/75 hover:bg-brand_soft/40 hover:text-night_green"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-5 w-5 shrink-0 ${
                                                active
                                                    ? "text-white"
                                                    : "text-brand_main/80 group-hover/item:text-brand_main"
                                            }`}
                                        />
                                        <span
                                            className={`flex-1 truncate whitespace-nowrap font-medium transition-opacity duration-150 ${showLabels}`}
                                        >
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span
                                                title={
                                                    item.badge.urgent
                                                        ? `Есть просроченные задачи`
                                                        : `Открытых задач: ${item.badge.count}`
                                                }
                                                className={`inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-opacity duration-150 ${showLabels} ${
                                                    item.badge.urgent
                                                        ? "bg-red-500 text-white"
                                                        : active
                                                          ? "bg-white text-brand_main"
                                                          : "bg-brand_main text-white"
                                                }`}
                                            >
                                                {item.badge.count}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                <div className='relative shrink-0 border-t border-brand_soft/30 p-2'>
                    <InstallAppButton showLabels={showLabels} onDone={onClose} />
                    <div className='flex items-center gap-3 rounded-lg bg-brand_soft/20 px-2 py-2'>
                        <div
                            className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand_main text-white text-sm font-semibold'
                            title={user?.name || user?.email || ""}
                        >
                            {userInitials(user?.name, user?.email)}
                        </div>
                        <div
                            className={`min-w-0 flex-1 transition-opacity duration-150 ${showLabels}`}
                        >
                            <p className='truncate text-sm font-medium text-night_green'>
                                {user?.name || user?.email || "—"}
                            </p>
                            <p className='truncate text-[11px] text-night_green/55'>
                                {role === "ADMIN" ? "Администратор" : "Менеджер"}
                            </p>
                        </div>
                        <button
                            type='button'
                            onClick={() => signOut({ callbackUrl: "/" })}
                            title='Выйти'
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-night_green/55 hover:bg-white/70 hover:text-brand_main transition-opacity duration-150 ${showLabels}`}
                        >
                            <LuLogOut className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <ToastProvider>
            <ConfirmProvider>
                <CrmNavTracker />
                <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
                <div className='relative min-h-screen bg-body_bg'>
            {/* page-wide soft brand wash so the translucent sidebar has something to filter */}
            <div
                aria-hidden
                className='pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-brand_soft/25 via-transparent to-brand_blue/10'
            />

            {/* Desktop: fixed collapsible sidebar, expands on hover */}
            <aside className='group/aside fixed inset-y-0 left-0 z-30 hidden w-16 overflow-hidden transition-[width] duration-200 ease-in-out hover:w-64 sm920:block'>
                <SidebarContent />
            </aside>

            {/* Mobile drawer */}
            {mobileOpen && (
                <>
                    <div
                        className='fixed inset-0 z-40 bg-night_green/30 backdrop-blur-sm sm920:hidden'
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className='fixed inset-y-0 left-0 z-50 w-72 shadow-xl sm920:hidden'>
                        <SidebarContent
                            alwaysExpanded
                            onClose={() => setMobileOpen(false)}
                        />
                    </aside>
                </>
            )}

            {/* Main column */}
            <div className='flex min-h-screen min-w-0 flex-col sm920:pl-16'>
                <header className='flex items-center gap-3 border-b border-brand_soft/40 bg-white/75 px-4 py-2 backdrop-blur-md sm920:hidden'>
                    <button
                        type='button'
                        onClick={() => setMobileOpen(true)}
                        className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand_soft/50 text-night_green/75 hover:bg-brand_soft/40 hover:text-night_green'
                        aria-label='Открыть меню'
                    >
                        <LuMenu className='h-5 w-5' />
                    </button>
                    <span className='font-semibold text-night_green'>ONESTEP CRM</span>
                    <button
                        type='button'
                        onClick={() => setSearchOpen(true)}
                        className='ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand_soft/50 text-night_green/75 hover:bg-brand_soft/40 hover:text-night_green'
                        aria-label='Поиск'
                    >
                        <LuSearch className='h-5 w-5' />
                    </button>
                </header>
                <main className='flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8'>
                    {children}
                </main>
            </div>
        </div>
            </ConfirmProvider>
        </ToastProvider>
    )
}
