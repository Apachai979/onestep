"use client"
import { useEffect, useState } from "react"

const FORMATS = {
    datetime: { dateStyle: "short", timeStyle: "short" },
    date: { dateStyle: "short" },
    weekday: { weekday: "long", day: "numeric", month: "long" },
}

// Дата/время в часовом поясе браузера пользователя.
// Форматировать на сервере нельзя: прод-сервер работает в UTC, и серверный
// toLocaleString давал бы неправильное локальное время (напр. 02:38 вместо
// 05:38 по Москве). Рендерим пустым до монтирования — так нет расхождения
// гидрации, а после монтирования показываем корректное локальное время.
//
// value опущен → текущий момент (для приветствия с днём недели).
export default function LocalDateTime({ value, format = "datetime", fallback = "—" }) {
    const [text, setText] = useState("")

    useEffect(() => {
        const d = value === undefined ? new Date() : value ? new Date(value) : null
        if (!d || Number.isNaN(d.getTime())) return
        setText(d.toLocaleString("ru-RU", FORMATS[format] || FORMATS.datetime))
    }, [value, format])

    if (value === undefined) return <span suppressHydrationWarning>{text}</span>
    if (!value) return <span>{fallback}</span>
    return <span suppressHydrationWarning>{text}</span>
}
