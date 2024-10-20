"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import Link from "next/link"
import { usePathname } from "next/navigation"

const myFunc = perem => {}

export default async function AcademyHeader() {
    const pathname = usePathname()

    return (
        <div className='container mx-auto max-w-[1200px] px-4'>
            <div className='mb-5 flex flex-wrap gap-4'>
                {parsedData.map(el => {
                    const isActive = pathname === "/academy/" + el.href
                    return (
                        <Link
                            onClick={myFunc("theme")}
                            href={`/academy/${el.href}`}
                            key={el.title}
                            className={`text-nowrap rounded-full border border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold text-primary_green ${isActive && "translate-y-2 shadow-neon"}`}
                        >
                            {el.title}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
