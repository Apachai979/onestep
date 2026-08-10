import Link from "next/link"
import Image from "next/image"

export default function TheFooter() {
    const linkClass =
        "hover:text-mainGreen focus:text-mainGreen transition-colors whitespace-nowrap"

    const links = [
        { href: "/", label: "Главная" },
        { href: "/partners", label: "Партнерам" },
        { href: "/partners/specialist", label: "Специалисту" },
        { href: "/partners/doctors", label: "Главному врачу" },
        { href: "/academy", label: "Академия" },
        { href: "/about", label: "О Компании" },
        { href: "/partners/patient", label: "Пациенту" },
        { href: "/catalogs", label: "Каталог" },
        { href: "/documentation", label: "Документы" },
        { href: "/manufacture", label: "Производство" },
        { href: "/contacts", label: "Контакты" },
        { href: "/feedbackform", label: "Обратная связь" },
    ]

    const socialLinks = [
        {
            href: "https://max.ru/u/f9LHodD0cOImq03vyo7NnoXQAXBBHmXtqQ8iaLQ8VbxUcCLoQCSHz5O6mo8",
            label: "Мессенджер MAX",
            viewBox: "0 0 42 42",
            icon: "M21.47 41.88c-4.11 0-6.02-.6-9.34-3-2.1 2.7-8.75 4.81-9.04 1.2 0-2.71-.6-5-1.28-7.5C1 29.5.08 26.07.08 21.1.08 9.23 9.82.3 21.36.3c11.55 0 20.6 9.37 20.6 20.91a20.6 20.6 0 0 1-20.49 20.67m.17-31.32c-5.62-.29-10 3.6-10.97 9.7-.8 5.05.62 11.2 1.83 11.52.58.14 2.04-1.04 2.95-1.95a10.4 10.4 0 0 0 5.08 1.81 10.7 10.7 0 0 0 11.19-9.97 10.7 10.7 0 0 0-10.08-11.1Z",
        },
    ]

    return (
        <footer className='rounded-t-3xl bg-stone-200 shadow-footer'>
            <div className='container mx-auto max-w-6xl px-6 py-6'>
                <div className='flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0'>
                    {/* Логотип */}
                    <div className='flex-shrink-0'>
                        <Link href='/'>
                            <Image
                                src='/logo_name.svg'
                                alt='OneStep Logo'
                                width={110}
                                height={47}
                            />
                        </Link>
                    </div>

                    {/* Навигация */}
                    <div className='grid w-full grid-cols-2 gap-3 text-center text-lg sm:grid-cols-3 md:w-auto md:gap-x-4 lg:gap-x-14'>
                        {links.map((link, index) => (
                            <Link key={index} href={link.href} className={linkClass}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Соцсети */}
                    <div className='flex space-x-4'>
                        {socialLinks.map((social, index) => (
                            <Link
                                key={index}
                                href={social.href}
                                className='group'
                                aria-label={social.label}
                                target={social.href.startsWith("http") ? "_blank" : undefined}
                                rel={
                                    social.href.startsWith("http")
                                        ? "noopener noreferrer"
                                        : undefined
                                }
                            >
                                <svg
                                    className='h-10 w-10 fill-mainGreen transition-colors group-hover:fill-txtGreen'
                                    viewBox={social.viewBox}
                                >
                                    <path
                                        d={social.icon}
                                        fillRule='evenodd'
                                        clipRule='evenodd'
                                    ></path>
                                </svg>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Реквизиты изготовителя (ст. 9 ЗОЗПП) и ссылка на политику
                обработки персональных данных — должны быть доступны с любой
                страницы сайта. Блок намеренно вынесен из `max-w-6xl`, чтобы
                занимать всю ширину подвала. */}
            <div className='w-full border-t border-stone-300 px-6 pb-3 pt-2'>
                <div className='space-y-0.5 text-center text-xs leading-snug text-stone-500'>
                    <p>
                        Общество с ограниченной ответственностью «Производственная компания
                        „НЕОМЕД“», ИНН 7017479120 · ОГРН 1207000011888, 634015, Томская область, г.
                        Томск, ул. Циолковского, д. 19/1, помещение 24
                    </p>
                    <p>
                        <Link href='/privacy' className={linkClass}>
                            Политика в отношении обработки персональных данных
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    )
}
