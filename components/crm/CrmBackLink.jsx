"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LuChevronLeft } from "react-icons/lu"

const STACK_KEY = "crm:navStack"
const STACK_LIMIT = 15

function readStack() {
    if (typeof window === "undefined") return []
    try {
        const raw = sessionStorage.getItem(STACK_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function writeStack(stack) {
    try {
        sessionStorage.setItem(STACK_KEY, JSON.stringify(stack))
    } catch {
        /* quota — не критично */
    }
}

// Отслеживает CRM-навигацию в sessionStorage как стек URL. При переходе
// на URL, который уже есть в стеке (типичный случай — форма сохранила
// изменения и router.push вернул на детальную страницу), обрезаем всё
// после него: цикл «список → карточка → редактирование → карточка»
// после сохранения даёт стек [список, карточка], а не
// [список, карточка, редактирование, карточка]. Значит «Назад» ведёт
// в список, а не обратно в редактирование.
export function CrmNavTracker() {
    const pathname = usePathname()
    useEffect(() => {
        if (typeof window === "undefined") return
        const full = pathname + window.location.search
        const stack = readStack()
        const idx = stack.indexOf(full)
        if (idx >= 0) {
            // Возврат на уже посещённую страницу — обрезаем хвост.
            stack.length = idx + 1
        } else {
            stack.push(full)
            if (stack.length > STACK_LIMIT) stack.splice(0, stack.length - STACK_LIMIT)
        }
        writeStack(stack)
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
        const stack = readStack()
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
