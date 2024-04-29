'use client'
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from "react"
import AnimationMenuButton from './buttons/AnimationMenuButton'

const navItems = [
    // { label: "Каталог", href: "/catalogs" },
    { label: "Партнерам", href: "/partners" },
    { label: "О Компании", href: "/about" },
    { label: "Производство", href: "/manufacture" },
    { label: "Документы", href: "/documentation" },
    { label: "Академия", href: "/academy" },
    { label: "Контакты", href: "/contacts" }
]

export default function Navigation() {
    const [isActive, setIsActive] = useState(true)
    const ulRef = useRef()

    // console.log('Render navigation')
    useEffect(() => {
        console.log('Render Effect')
        if (!isActive) {
            ulRef.current.className += ' top-[64px] opacity-100 '
        }

        if (isActive) {
            ulRef.current.className = ' rounded-b-3xl sm920:rounded-none sm920:flex sm920:flex-1 sm920:items-center sm920:justify-evenly z-[-1] sm920:z-auto sm920:static absolute bg-gray-200 sm920:bg-body_bg sm920:max-w-[880px] w-full left-0 sm920:w-auto xl:px-8 sm920:px-4 sm920:py-0 py-4 pl-7 text-base sm920:text-sm lg:text-base sm920:opacity-100 opacity-0 top-[-400px] transition-all ease-in duration-300 '
        }

    }, [isActive])

    useEffect(() => {
        setIsActive(true)
    }, [usePathname()])
    const pathname = usePathname()

    return (
        <>
            <ul ref={ulRef} className="rounded-b-3xl sm920:rounded-none sm920:flex sm920:flex-1 sm920:items-center sm920:justify-evenly z-[-1] sm920:z-auto sm920:static absolute bg-gray-200 sm920:bg-body_bg sm920:max-w-[880px] w-full left-0 sm920:w-auto xl:px-8 sm920:px-4 sm920:py-0 py-4 pl-7 text-base sm920:text-sm lg:text-base sm920:opacity-100 opacity-0 top-[-400px] transition-all ease-in duration-300 ">

                <li className="mx-4 mb-8 mt-2 sm920:my-0 sm920:mx-0 text-center ">
                    <Link href="/catalogs" className={pathname === "/catalogs" ? "shadow-inner bg-contrast_green shadow-gray-600/50 text-white rounded-full px-14 py-2 sm920:px-6 sm920:py-2 " : "bg-primary_green text-white rounded-full shadow-md shadow-night_green/50 hover:shadow-inner hover:bg-contrast_green hover:shadow-gray-600/50 px-14 py-2 sm920:px-6 sm920:py-2 text-center transition-all hover:text-white "}>Каталог</Link>
                </li>

                {navItems.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <li key={link.label} className="mx-4 my-6 sm920:my-0 sm920:mx-0 text-center">
                            <Link href={link.href} className={isActive ? "px-1 text-primary_green duration-300"
                                : "px-1 hover:text-primary_green duration-300"}>{link.label}</Link>
                        </li>
                    )
                })}
                <div className="-space-y-1.5 flex-none block sm920:hidden text-center">
                    <p className="text-xs font-semibold text-stone-400">Тел./WhatsApp</p>
                    <p className="lg:text-lg text-base font-semibold">+7 (495) 231-01-11</p>
                </div>
            </ul>
            <div className="-space-y-1.5 flex-none hidden sm920:block ">
                <p className="text-xs font-semibold text-stone-400">Тел./WhatsApp</p>
                <p className="lg:text-lg text-base font-semibold">+7 (495) 231-01-11</p>
            </div>
            <button
                onClick={() => setIsActive(prev => !prev)}
                className="relative w-[44px] h-[40px] group cursor-pointer block sm920:hidden "
            >
                <AnimationMenuButton isActive={isActive} />
            </button>
        </>
    )
}