"use client"
import { usePathname } from "next/navigation"
import { MdArrowBackIosNew } from "react-icons/md"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function BackAcademy() {
    const pathname = usePathname()
    const [isAcademyPage, setIsAcademyPage] = useState(false)

    useEffect(() => {
        setIsAcademyPage(pathname === "/academy")
    }, [pathname])

    return (
        <div className='my-4 flex'>
            <Link
                href='/academy'
                className={`flex items-center text-4xl font-semibold transition-all duration-500 ease-in-out ${
                    isAcademyPage ? "-translate-x-7 scale-100" : "scale-60 -translate-x-16"
                }`}
            >
                <MdArrowBackIosNew
                    size={27}
                    className={`text-txtGreen transition-all duration-500 ease-in-out ${isAcademyPage ? "opacity-0" : "opacity-100"}`}
                />
                <span>
                    Академия <span className={isAcademyPage ? "" : "text-mainGreen"}>OneStep</span>
                </span>
            </Link>
        </div>
    )
}
