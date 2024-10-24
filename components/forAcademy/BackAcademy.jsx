"use client"
import { usePathname } from "next/navigation"
import { MdArrowBackIosNew } from "react-icons/md"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function BackAcademy() {
    const router = useRouter()
    const pathname = usePathname()
    const [isAcademyPage, setIsAcademyPage] = useState(false)

    useEffect(() => {
        setIsAcademyPage(pathname === "/academy")
    }, [pathname])

    const handleBackClick = () => {
        pathname != "/academy" && router.back()
    }

    return (
        <div className='sticky top-16 z-10 w-full bg-body_bg py-4'>
            <button
                onClick={handleBackClick}
                className={`flex items-center text-4xl font-semibold transition-all duration-500 ease-in-out ${
                    isAcademyPage ? "-translate-x-7 scale-100" : "scale-60 -translate-x-20"
                }`}
            >
                <MdArrowBackIosNew
                    size={27}
                    className={`text-txtGreen transition-all duration-500 ease-in-out ${isAcademyPage ? "opacity-0" : "opacity-100"}`}
                />
                <span>
                    Академия <span className={isAcademyPage ? "" : "text-mainGreen"}>OneStep</span>
                </span>
            </button>
        </div>
    )
}
