"use client"
import { usePathname } from "next/navigation"
import Block from "./Block"
import Link from "next/link"

const arrPartners = [
    { href: "/partners/specialist", title: "Специалисту" },
    { href: "/partners/doctors", title: "Главному врачу" },
    { href: "/partners", title: "Партнеру" },
    { href: "/partners/patient", title: "Пациенту" },
]

export default function NavPartners() {
    const pathname = usePathname()
    return (
        <Block>
            <div className='mb-5 flex justify-center'>
                <ul className='grid w-full gap-1 md:grid-cols-2 lg:grid-cols-4'>
                    {arrPartners.map(elem => {
                        const isActive = pathname === elem.href
                        return (
                            <Link
                                key={elem.title}
                                href={elem.href}
                                className={
                                    isActive
                                        ? "min-w-[220px] rounded-full border-2 border-primary_green bg-primary_green py-2 text-center text-white"
                                        : "min-w-[220px] rounded-full border-2 border-gray-200 py-2 text-center transition duration-200 ease-in hover:border-primary_green hover:bg-primary_green hover:text-white"
                                }
                            >
                                <li className=''>{elem.title}</li>
                            </Link>
                        )
                    })}
                </ul>
            </div>
        </Block>
    )
}
