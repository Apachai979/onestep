"use client"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { GiExitDoor } from "react-icons/gi"
import { LuLogIn } from "react-icons/lu"

export default function AuthComponent() {
    const { data: session } = useSession()

    return (
        <div className='container mx-auto px-4'>
            {session ? (
                <div className='flex items-center justify-end space-x-3'>
                    <Link
                        href='/crm'
                        className='flex items-center justify-center hover:text-mainGreen'
                    >
                        <span className='mx-1.5'>{session?.user?.name || "CRM"}</span>
                    </Link>
                    <button
                        type='button'
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className='flex items-center justify-center hover:text-mainGreen'
                        title='Выйти'
                    >
                        <GiExitDoor />
                    </button>
                </div>
            ) : (
                <div className='flex items-center justify-end'>
                    <Link
                        href='/authorize?callbackUrl=/crm'
                        className='flex items-center justify-center hover:text-mainGreen'
                    >
                        <LuLogIn />
                        <span className='mx-1.5'>Войти</span>
                    </Link>
                </div>
            )}
        </div>
    )
}
