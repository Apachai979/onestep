"use client"
import { usePathname } from "next/navigation"

// Маршруты, где шапка и подвал публичного сайта не нужны.
const HIDDEN_PREFIXES = ["/crm", "/maintenance"]

export default function HideOnCrm({ children }) {
    const pathname = usePathname()
    if (HIDDEN_PREFIXES.some(prefix => pathname?.startsWith(prefix))) return null
    return children
}
