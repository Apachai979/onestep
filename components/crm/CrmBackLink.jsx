"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LuChevronLeft } from "react-icons/lu"
import { pushNavUrl, readNavStack } from "@/lib/crm/nav-stack"

// Отслеживает CRM-навигацию как стек URL (см. [lib/crm/nav-stack.js]).
// Вкладку и фильтры списка в этот же URL дописывает useUrlFilters — их
// правка стек не наращивает, а обновляет верхушку.
export function CrmNavTracker() {
    const pathname = usePathname()
    useEffect(() => {
        if (typeof window === "undefined") return
        pushNavUrl(pathname + window.location.search)
    }, [pathname])
    return null
}

// Страница редактирования/создания — сегмент пути /edit или /new.
// «Назад» никогда не должна вести туда, поэтому такие URL пропускаем.
function isEditPath(url) {
    const path = url.split("?")[0]
    return /\/(edit|new)$/.test(path)
}

// Возвращает URL предыдущей CRM-страницы или fallback, если истории нет.
export function usePrevPath(fallback) {
    const [href, setHref] = useState(fallback)
    const [fromHistory, setFromHistory] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        const stack = readNavStack()
        // Идём от предпоследнего элемента вглубь, пропуская страницы
        // редактирования/создания — на них «Назад» вести не должна.
        let prev = null
        for (let i = stack.length - 2; i >= 0; i--) {
            if (!isEditPath(stack[i])) {
                prev = stack[i]
                break
            }
        }
        if (prev && prev !== fallback) {
            setHref(prev)
            setFromHistory(true)
        }
    }, [fallback])
    return { href, fromHistory }
}

// Умная кнопка «Назад». Если пользователь пришёл с другой CRM-страницы —
// ведёт туда и подписана «Назад». Иначе — на fallback с fallbackLabel.
//
//  <CrmBackLink fallback="/crm/deals" fallbackLabel="Сделки" />
//  <CrmBackLink fallback={`/crm/deals/${id}`} fallbackLabel={dealTitle} />
export default function CrmBackLink({
    fallback,
    fallbackLabel = "Назад",
    className = "mb-3 inline-flex items-center gap-1 text-sm text-brand_main hover:underline",
    showIcon = true,
}) {
    const { href, fromHistory } = usePrevPath(fallback)
    const label = fromHistory ? "Назад" : fallbackLabel
    return (
        <Link href={href} className={className}>
            {showIcon ? <LuChevronLeft className='h-4 w-4' /> : "← "}
            {label}
        </Link>
    )
}
