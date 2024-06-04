'use client'
import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

export default function SignIn() {
    return (
        <div className="container mx-auto h-screen max-w-[1200px] px-4">
            <div className="flex items-center justify-center">
                <Image
                    src="/logoOneStep.png"
                    alt="Profile"
                    className="h-48 w-48 rounded-full object-contain"
                    width={512}
                    height={512}
                />
            </div>
            <div className="flex items-center justify-center">
                <div className="flex w-96 flex-col items-center justify-center space-y-2">
                    <h1 className="p-4 text-center text-2xl font-semibold text-night_green">
                        С возвращением
                    </h1>
                    <input
                        type="email"
                        className="h-12 w-80 rounded-lg border border-gray-300"
                        placeholder=" Адрес электронной почты"
                    />
                    <button className="h-10 w-80 rounded-lg border border-gray-300 px-1">
                        Продолжить
                    </button>
                    <p>
                        У вас нет учетной записи? <Link href="#">Зарегистрироваться</Link>
                    </p>
                    <div className="flex w-96 items-center justify-center">
                        <hr className="h-0.5 w-full bg-gray-300" />
                        <p className="px-2">или</p>
                        <hr className="h-0.5 w-full bg-gray-300" />
                    </div>
                    <div className="w-80 space-y-2 pb-2 pt-1">
                        <button
                            onClick={() => signIn('google')}
                            className="h-10 w-full rounded-lg border border-gray-300 px-1"
                        >
                            Google
                        </button>
                        <button
                            onClick={() => signIn('github')}
                            className="h-10 w-full rounded-lg border border-gray-300 px-1"
                        >
                            Github
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
