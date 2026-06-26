"use client"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <button
            type='button'
            onClick={() => signOut({ callbackUrl: "/" })}
            className='rounded-md border border-brand_soft/60 px-3 py-1 text-xs text-gray-700 transition hover:bg-brand_soft/30'
        >
            Выйти
        </button>
    )
}
