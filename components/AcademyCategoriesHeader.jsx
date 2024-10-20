"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default async function AcademyCategoriesHeader({ path }) {
    const pathname = usePathname()
    const cat = parsedData.find(el => el.href == path)

    return (
        <>
            {cat.categories.map(el => {
                const isActive = pathname === "/academy/" + el.href
                return (
                    <button
                        className={`my-1 rounded-full border border-gray-700 px-3 py-1 ${isActive && "translate-y-2 shadow-neon"}`}
                    >
                        {el.name}
                    </button>
                )
            })}
        </>
    )
}
