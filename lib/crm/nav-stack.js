"use client"

// Стек CRM-навигации в sessionStorage: по нему работает кнопка «Назад»
// ([CrmBackLink]). Живёт отдельно от компонента, потому что писать в него
// должны двое: трекер переходов и синхронизация фильтров с адресом
// ([lib/crm/url-state.js]).
const STACK_KEY = "crm:navStack"
const STACK_LIMIT = 15

export function readNavStack() {
    if (typeof window === "undefined") return []
    try {
        const raw = sessionStorage.getItem(STACK_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function writeNavStack(stack) {
    try {
        sessionStorage.setItem(STACK_KEY, JSON.stringify(stack))
    } catch {
        /* quota — не критично */
    }
}

function samePath(a, b) {
    return a.split("?")[0] === b.split("?")[0]
}

// Переход на другую страницу. При возврате на уже посещённый URL (типичный
// случай — форма сохранила изменения и router.push вернул на детальную
// страницу) обрезаем всё после него: цикл «список → карточка → редактирование
// → карточка» после сохранения даёт стек [список, карточка], а не
// [список, карточка, редактирование, карточка]. Значит «Назад» ведёт в список,
// а не обратно в редактирование.
export function pushNavUrl(full) {
    const stack = readNavStack()
    const idx = stack.indexOf(full)
    if (idx >= 0) {
        stack.length = idx + 1
    } else {
        stack.push(full)
        if (stack.length > STACK_LIMIT) stack.splice(0, stack.length - STACK_LIMIT)
    }
    writeNavStack(stack)
}

// Сменились только параметры текущей страницы — вкладка или фильтры списка.
// Это history.replaceState, а не переход: заменяем верхушку стека, иначе
// «Назад» из карточки вернул бы на список без отбора, а сам стек забился бы
// промежуточными состояниями фильтра.
export function replaceNavUrl(full) {
    const stack = readNavStack()
    if (stack.length && samePath(stack[stack.length - 1], full)) {
        stack[stack.length - 1] = full
    } else {
        stack.push(full)
        if (stack.length > STACK_LIMIT) stack.splice(0, stack.length - STACK_LIMIT)
    }
    writeNavStack(stack)
}
