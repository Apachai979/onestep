"use client"
import { usePathname } from "next/navigation"

export default function HideOnCrm({ children }) {
    const pathname = usePathname()
    if (pathname?.startsWith("/crm")) return null
    return children
}
