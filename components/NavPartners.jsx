'use client'
import { usePathname } from 'next/navigation'
import Block from './Block'
import Link from 'next/link'

const arrPartners = [
    { href: '/partners/specialist', title: 'Специалисту' },
    { href: '/partners/doctors', title: 'Главному врачу' },
    { href: '/partners', title: 'Партнеру' },
    { href: '/partners/patient', title: 'Пациенту' },
]

export default function NavPartners() {
    const pathname = usePathname()
    return (
        <Block>
            <div className="flex justify-center my-3">
                <ul className="grid md:grid-cols-2 gap-1 lg:grid-cols-4 w-full">
                    {arrPartners.map(elem => {
                        const isActive = pathname === elem.href
                        return (
                            <Link
                                key={elem.title}
                                href={elem.href}
                                className={
                                    isActive
                                        ? 'min-w-[220px] border-2 border-primary_green bg-primary_green text-white rounded-full py-2 text-center   '
                                        : 'min-w-[220px] border-2 border-gray-200 rounded-full py-2 text-center hover:text-white hover:bg-primary_green hover:border-primary_green transition ease-in duration-200'
                                }
                            >
                                <li className="">{elem.title}</li>
                            </Link>
                        )
                    })}
                </ul>
            </div>
        </Block>
    )
}
