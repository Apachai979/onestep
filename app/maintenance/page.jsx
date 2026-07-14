import Image from "next/image"
import Link from "next/link"

export const metadata = {
    title: "Сайт в разработке",
}

export default function MaintenancePage() {
    return (
        <section className='flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center'>
            <Image
                src='/logo_name.svg'
                alt='Onestep'
                width={220}
                height={60}
                priority
            />
            <div className='flex max-w-xl flex-col gap-4'>
                <h1 className='text-3xl font-semibold text-night_green sm:text-4xl'>
                    Сайт в разработке
                </h1>
                <p className='text-base text-night_green/70 sm:text-lg'>
                    Мы обновляем сайт и скоро вернёмся. По вопросам продукции
                    свяжитесь с нами по почте{" "}
                    <a
                        href='mailto:info@onestep.su'
                        className='text-primary_green underline underline-offset-4'
                    >
                        info@onestep.su
                    </a>
                    .
                </p>
            </div>
            <Link
                href='/authorize?callbackUrl=/crm'
                className='rounded-lg bg-primary_green px-6 py-3 font-medium text-white transition-opacity hover:opacity-90'
            >
                Войти в CRM
            </Link>
        </section>
    )
}
