'use client'
import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

export default function SignIn() {
    return (
        <div className="container mx-auto h-[84vh] max-w-[1200px] px-4">
            <div className="flex items-center justify-center">
                <Image
                    src="/logo_only.png"
                    alt="Profile"
                    className="h-48 w-48 rounded-full object-contain drop-shadow"
                    width={512}
                    height={512}
                />
            </div>
            <div className="flex items-center justify-center">
                <div className="flex w-80 flex-col items-center justify-center space-y-2">
                    <h1 className="text-center text-2xl font-semibold text-night_green">
                        С возвращением
                    </h1>
                    <input
                        type="email"
                        className="h-12 w-full rounded-lg border border-gray-300 shadow-sm"
                        placeholder=" Адрес электронной почты"
                    />
                    <button className="h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95">
                        Продолжить
                    </button>
                    <p className="text-center">
                        У вас нет учетной записи?{' '}
                        <Link href="#" className="text-dark_green hover:text-mainGreen">
                            Зарегистрироваться
                        </Link>
                    </p>
                    <div className="flex w-80 items-center justify-center">
                        <hr className="h-0.5 w-full bg-gray-300" />
                        <p className="px-2">или</p>
                        <hr className="h-0.5 w-full bg-gray-300" />
                    </div>
                    <div className="w-80 space-y-2 pb-2 pt-1">
                        <button
                            onClick={() => signIn('google')}
                            className="h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95"
                        >
                            Google
                        </button>
                        <button
                            onClick={() => signIn('github')}
                            className="h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95"
                        >
                            Github
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
