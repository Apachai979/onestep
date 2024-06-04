'use client'
import { signIn, signOut, useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"

export default function SignIn() {
    return (
        <div className="container mx-auto px-4 max-w-[1200px] h-screen">
            <div className="flex justify-center items-center">
                <Image
                    src="/logoOneStep.png"
                    alt="Profile"
                    className="object-contain w-48 h-48 rounded-full"
                    width={512}
                    height={512}
                />

            </div>

            <div className="flex justify-center items-center">
                <div className="flex flex-col justify-center items-center w-96 space-y-2">
                    <h1 className="text-2xl text-night_green font-semibold text-center p-4">С возвращением</h1>
                    <input type="email" className="h-12 w-80 border border-gray-300 rounded-lg" placeholder=" Адрес электронной почты" />
                    <button className="px-1 w-80 h-10 border border-gray-300 rounded-lg">Продолжить</button>
                    <p>У вас нет учетной записи? <Link href="#">Зарегистрироваться</Link></p>
                    <div className="flex justify-center items-center w-96">
                        <hr className="h-0.5 bg-gray-300 w-full" />
                        <p className="px-2">или</p>
                        <hr className="h-0.5 bg-gray-300 w-full" />
                    </div>
                    <div className="w-80 space-y-2 pb-2 pt-1">
                        <button onClick={() => signIn('google')} className="px-1 w-full h-10 border border-gray-300 rounded-lg">Google</button>
                        <button onClick={() => signIn('github')} className="px-1 w-full h-10 border border-gray-300 rounded-lg">Github</button>
                    </div>
                </div>
            </div>
        </div>
    )
}