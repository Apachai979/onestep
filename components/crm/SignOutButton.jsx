"use client"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <button
            type='button'
            onClick={() => signOut({ callbackUrl: "/" })}
            className='rounded-md border border-line px-3 py-1 text-xs text-neutral-700 transition hover:bg-surface_muted'
        >
            Выйти
        </button>
    )
}
