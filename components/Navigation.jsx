"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import AnimationMenuButton from "./buttons/AnimationMenuButton"
import AuthComponent from "./AuthComponent"

const navItems = [
    // { label: "Каталог", href: "/catalogs" },
    { label: "Партнерам", href: "/partners" },
    { label: "О Компании", href: "/about" },
    { label: "Производство", href: "/manufacture" },
    { label: "Документы", href: "/documentation" },
    { label: "Академия", href: "/academy" },
    { label: "Контакты", href: "/contacts" },
]

export default function Navigation() {
    const [isActive, setIsActive] = useState(true)
    const ulRef = useRef()
    const pathname = usePathname()

    useEffect(() => {
        if (!isActive) {
            ulRef.current.className += " top-[64px] opacity-100 "
        }

        if (isActive) {
            ulRef.current.className =
                " rounded-b-3xl sm920:rounded-none sm920:flex sm920:flex-1 sm920:items-center sm920:justify-evenly z-[-1] sm920:z-auto sm920:static absolute bg-gray-200 sm920:bg-body_bg sm920:max-w-[880px] w-full left-0 sm920:w-auto xl:px-8 sm920:px-4 sm920:py-0 py-4 pl-7 text-base sm920:text-sm lg:text-base sm920:opacity-100 opacity-0 top-[-400px] transition-all ease-in duration-300 "
        }
    }, [isActive])

    useEffect(() => {
        setIsActive(true)
    }, [pathname])

    return (
        <>
            <ul
                ref={ulRef}
                className='absolute left-0 top-[-400px] z-[-1] w-full rounded-b-3xl bg-gray-200 py-4 pl-7 text-base opacity-0 transition-all duration-300 ease-in sm920:static sm920:z-auto sm920:flex sm920:w-auto sm920:max-w-[880px] sm920:flex-1 sm920:items-center sm920:justify-evenly sm920:rounded-none sm920:bg-body_bg sm920:px-4 sm920:py-0 sm920:text-sm sm920:opacity-100 lg:text-base xl:px-8'
            >
                <li className='mx-4 mb-8 mt-2 text-center sm920:mx-0 sm920:my-0'>
                    <Link
                        href='/catalogs'
                        className={
                            pathname === "/catalogs"
                                ? "rounded-full bg-contrast_green px-14 py-2 text-white shadow-inner shadow-gray-600/50 sm920:px-6 sm920:py-2"
                                : "rounded-full bg-primary_green px-14 py-2 text-center text-white shadow-md shadow-night_green/50 transition-all hover:bg-contrast_green hover:text-white hover:shadow-inner hover:shadow-gray-600/50 sm920:px-6 sm920:py-2"
                        }
                    >
                        Каталог
                    </Link>
                </li>

                {navItems.map(link => {
                    const isActive = pathname === link.href
                    return (
                        <li
                            key={link.label}
                            className='mx-4 my-6 text-center sm920:mx-0 sm920:my-0'
                        >
                            <Link
                                href={link.href}
                                className={
                                    isActive
                                        ? "px-1 text-primary_green duration-300"
                                        : "px-1 duration-300 hover:text-primary_green"
                                }
                            >
                                {link.label}
                            </Link>
                        </li>
                    )
                })}
                <div className='block flex-none -space-y-1.5 text-center sm920:hidden'>
                    <p className='text-xs font-semibold text-stone-400'>Тел./WhatsApp</p>
                    <p className='text-base font-semibold lg:text-lg'>+7 (495) 231-01-11</p>
                </div>
            </ul>
            {/* //autorize */}
            <div>
                <AuthComponent />
            </div>
            {/* // */}
            {/* <div className="-space-y-1.5 flex-none hidden sm920:block ">
                <p className="text-xs font-semibold text-stone-400">Тел./WhatsApp</p>
                <p className="lg:text-lg text-base font-semibold">+7 (495) 231-01-11</p>
            </div> */}
            <button
                onClick={() => setIsActive(prev => !prev)}
                className='group relative block h-[40px] w-[44px] cursor-pointer sm920:hidden'
            >
                <AnimationMenuButton isActive={isActive} />
            </button>
        </>
    )
}
