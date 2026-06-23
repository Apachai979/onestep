"use client"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <button
            type='button'
            onClick={() => signOut({ callbackUrl: "/" })}
            className='rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 transition hover:bg-gray-100'
        >
            Выйти
        </button>
    )
}
