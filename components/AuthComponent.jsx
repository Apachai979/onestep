"use client"
import { signIn, signOut, useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"

export default function AuthComponent() {
    const { data: session } = useSession()

    console.log(session)
    return (
        <div className='container mx-auto px-4'>
            {session ? (
                <div className='flex items-center justify-end space-x-1'>
                    <h1>
                        Добро пожаловать,{" "}
                        <Link href='#' onClick={() => signOut({ callbackUrl: "/" })}>
                            {session?.user?.name}
                        </Link>
                    </h1>
                    {session?.user?.image && (
                        <Image
                            src={session.user.image}
                            alt='Profile'
                            className='h-6 w-6 rounded-full object-contain'
                            width={512}
                            height={512}
                        />
                    )}
                </div>
            ) : (
                <div className='space-x-4'>
                    <h1>Youre not logged in</h1>
                    <Link href='/authorize' className='hover:text-mainGreen'>
                        Войти
                    </Link>
                    <button
                        onClick={() => signIn("google")}
                        className='h-10 w-auto rounded-lg border border-black px-1'
                    >
                        Google
                    </button>
                    <button
                        onClick={() => signIn("mailru")}
                        className='h-10 w-auto rounded-lg border border-black px-1'
                    >
                        Mailru
                    </button>
                    <button
                        onClick={() => signIn("github")}
                        className='h-10 w-auto rounded-lg border border-black px-1'
                    >
                        Github
                    </button>
                </div>
            )}
        </div>
    )
}
