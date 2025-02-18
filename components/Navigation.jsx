'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import AnimationMenuButton from './buttons/AnimationMenuButton';

const navItems = [
    // { label: "Каталог", href: "/catalogs" },
    { label: "Партнерам", href: "/partners" },
    { label: "О Компании", href: "/about" },
    { label: "Производство", href: "/manufacture" },
    { label: "Документы", href: "/documentation" },
    { label: "Академия", href: "/academy" },
    { label: "Контакты", href: "/contacts" }
]

const PhoneInfo = ({ className }) => (
    <div className={clsx("-space-y-1.5 flex-none", className)}>
        <p className="text-xs font-semibold text-stone-400">Тел./WhatsApp</p>
        <p className="lg:text-lg text-base font-semibold">+7 (495) 231-01-11</p>
    </div>
);

export default function Navigation() {
    const [isActive, setIsActive] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        setIsActive(true);
    }, [pathname]);

    const navClasses = clsx(
        'rounded-b-3xl sm920:rounded-none sm920:flex sm920:flex-1 sm920:items-center sm920:justify-evenly text-nowrap select-none',
        'absolute sm920:static bg-gray-200 sm920:bg-body_bg sm920:max-w-[880px] w-full left-0 sm920:w-auto xl:px-8 sm920:px-4 sm920:py-0 py-4 pl-7',
        'text-base sm920:text-sm lg:text-base transition-all ease-in duration-300',
        { 'top-[64px] opacity-100 z-20': !isActive, 'top-[-400px] opacity-0 z-[-1] sm920:opacity-100 sm920:z-auto sm920:static': isActive }
    );

    return (
        <>
            <ul className={navClasses}>
                <li className="mx-4 mb-8 mt-2 sm920:my-0 sm920:mx-0 text-center">
                    <Link href="/catalogs" aria-current={pathname === '/catalogs' ? 'page' : undefined}
                        className={clsx(
                            'rounded-full px-14 py-2 sm920:px-6 sm920:py-2 text-center transition-all',
                            pathname === '/catalogs' ? 'bg-contrast_green text-white shadow-inner shadow-gray-600/50' : 'bg-primary_green text-white shadow-md hover:shadow-inner hover:bg-contrast_green'
                        )}>
                        Каталог
                    </Link>
                </li>
                {navItems.map((link) => (
                    <li key={link.label} className="mx-4 my-6 sm920:my-0 sm920:mx-0 text-center">
                        <Link href={link.href} aria-current={pathname === link.href ? 'page' : undefined}
                            className={clsx('px-1 duration-300', pathname === link.href ? 'text-primary_green' : 'hover:text-primary_green')}>
                            {link.label}
                        </Link>
                    </li>
                ))}
                <PhoneInfo className="block sm920:hidden text-center" />
            </ul>
            <PhoneInfo className="hidden sm920:block" />
            <button
                onClick={() => setIsActive(prev => !prev)}
                className="relative w-[44px] h-[40px] group cursor-pointer block sm920:hidden"
                aria-label="Toggle menu"
                aria-expanded={!isActive}
            >
                <AnimationMenuButton isActive={isActive} />
            </button>
        </>
    );
}
