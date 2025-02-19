"use client"
import { usePathname } from "next/navigation"
import { MdArrowBackIosNew } from "react-icons/md"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function BackAcademy() {
    const pathname = usePathname()
    const [isAcademyPage, setIsAcademyPage] = useState(true)

    useEffect(() => {
        setIsAcademyPage(pathname === "/academy")
    }, [pathname])

    return (
        <div className='sticky top-16 z-10 w-full bg-body_bg py-1 sm:py-4'>
            <Link
                href='/academy'
                className={`flex items-center font-semibold transition-all duration-500 ease-in-out ${isAcademyPage ? "-translate-x-7 scale-100" : "-translate-x-20 sm:-translate-x-36 lg:-translate-x-56 scale-60"
                    }`}
            >
                <MdArrowBackIosNew
                    size={28}
                    className={`text-txtGreen transition-all duration-500 ease-in-out ${isAcademyPage ? "opacity-0" : "opacity-100"}`}
                />
                <span className="px-2 sm:px-0 text-3xl sm:text-4xl">
                    Академия <span className={isAcademyPage ? "" : "text-mainGreen"}>OneStep</span>
                </span>
            </Link>
        </div>
    )
}
