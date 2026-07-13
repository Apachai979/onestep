import Link from "next/link";
import Image from "next/image";

export default function TheFooter() {
    const linkClass = "hover:text-mainGreen focus:text-mainGreen transition-colors whitespace-nowrap";

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
    ];

    const socialLinks = [
        { href: "#", label: "ВКонтакте", viewBox: "0 0 24 24", icon: "M21.579 6.855c.14-.465 0-.806-.662-.806h-2.193c-.558 0-.813.295-.953.619 0 0-1.115 2.719-2.695 4.482-.51.513-.743.675-1.021.675-.139 0-.341-.162-.341-.627V6.855c0-.558-.161-.806-.626-.806H9.642c-.348 0-.558.258-.558.504 0 .528.79.65.871 2.138v3.228c0 .707-.127.836-.407.836-.743 0-2.551-2.729-3.624-5.853-.209-.607-.42-.852-.98-.852H2.752c-.627 0-.752.295-.752.619 0 .582.743 3.462 3.461 7.271 1.812 2.601 4.363 4.011 6.687 4.011 1.393 0 1.565-.313 1.565-.853v-1.966c0-.626.133-.752.574-.752.324 0 .882.164 2.183 1.417 1.486 1.486 1.732 2.153 2.567 2.153h2.192c.626 0 .939-.313.759-.931-.197-.615-.907-1.51-1.849-2.569-.512-.604-1.277-1.254-1.51-1.579-.325-.419-.231-.604 0-.976.001.001 2.672-3.761 2.95-5.04z" },
        { href: "https://max.ru/u/f9LHodD0cOImq03vyo7NnoXQAXBBHmXtqQ8iaLQ8VbxUcCLoQCSHz5O6mo8", label: "Мессенджер MAX", viewBox: "0 0 42 42", icon: "M21.47 41.88c-4.11 0-6.02-.6-9.34-3-2.1 2.7-8.75 4.81-9.04 1.2 0-2.71-.6-5-1.28-7.5C1 29.5.08 26.07.08 21.1.08 9.23 9.82.3 21.36.3c11.55 0 20.6 9.37 20.6 20.91a20.6 20.6 0 0 1-20.49 20.67m.17-31.32c-5.62-.29-10 3.6-10.97 9.7-.8 5.05.62 11.2 1.83 11.52.58.14 2.04-1.04 2.95-1.95a10.4 10.4 0 0 0 5.08 1.81 10.7 10.7 0 0 0 11.19-9.97 10.7 10.7 0 0 0-10.08-11.1Z" },
    ];

    return (
        <footer className="bg-stone-200 rounded-t-3xl shadow-footer">
            <div className="container mx-auto px-6 py-6 max-w-6xl">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
                    {/* Логотип */}
                    <div className="flex-shrink-0">
                        <Link href="/">
                            <Image src="/logo_name.svg" alt="OneStep Logo" width={110} height={47} />
                        </Link>
                    </div>

                    {/* Навигация */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-x-4 lg:gap-x-14 text-lg text-center w-full md:w-auto">
                        {links.map((link, index) => (
                            <Link key={index} href={link.href} className={linkClass}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Соцсети */}
                    <div className="flex space-x-4">
                        {socialLinks.map((social, index) => (
                            <Link key={index} href={social.href} className="group" aria-label={social.label} target={social.href.startsWith("http") ? "_blank" : undefined} rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}>
                                <svg className="fill-mainGreen w-10 h-10 transition-colors group-hover:fill-txtGreen" viewBox={social.viewBox}>
                                    <path d={social.icon} fillRule="evenodd" clipRule="evenodd"></path>
                                </svg>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
