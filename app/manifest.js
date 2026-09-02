export default function manifest() {
    return {
        name: "OneStep CRM",
        short_name: "CRM",
        description:
            "CRM OneStep — управление контрагентами, сделками и складом",
        start_url: "/crm",
        scope: "/",
        // "tabbed" возвращает установленному приложению полосу вкладок
        // (Ctrl+T, Ctrl+клик, средняя кнопка) — иначе десктопное окно
        // standalone одно на всю CRM, и сравнить две сделки негде.
        // Где режим не поддержан (Safari, старый Chrome, мобильные) браузер
        // молча берёт следующий вариант — обычный standalone.
        display_override: ["tabbed", "standalone"],
        display: "standalone",
        // Ориентацию не фиксируем: portrait имел смысл только на телефоне, а
        // на десктопе окно приложения всегда шире, чем выше.
        lang: "ru",
        background_color: "#fcfbf8",
        theme_color: "#133531",
        // Правый клик по иконке в панели задач / доке — переход сразу в раздел.
        shortcuts: [
            {
                name: "Сделки",
                short_name: "Сделки",
                url: "/crm/deals",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
            },
            {
                name: "Задачи",
                short_name: "Задачи",
                url: "/crm/tasks",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
            },
            {
                name: "Закупки",
                short_name: "Закупки",
                url: "/crm/tenders",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
            },
            {
                name: "Контрагенты",
                short_name: "Контрагенты",
                url: "/crm/counterparties",
                icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
            },
        ],
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512-maskable.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    }
}
