"use client"

// Телефон как ссылка tel: — на мобильных открывает набор номера.
// stopPropagation нужен, потому что строки таблиц и мобильные карточки кликабельны целиком.
export default function PhoneLink({ phone, className = "", children }) {
    if (!phone) return null
    return (
        <a
            href={`tel:${String(phone).replace(/[^\d+]/g, "")}`}
            onClick={e => e.stopPropagation()}
            className={`text-brand_main hover:underline ${className}`.trim()}
        >
            {children ?? phone}
        </a>
    )
}
