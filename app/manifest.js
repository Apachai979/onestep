export default function manifest() {
    return {
        name: "OneStep CRM",
        short_name: "CRM",
        description:
            "CRM OneStep — управление контрагентами, сделками и складом",
        start_url: "/crm",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        lang: "ru",
        background_color: "#fcfbf8",
        theme_color: "#133531",
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
