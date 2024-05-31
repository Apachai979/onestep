'use client'
import { useSession } from 'next-auth/react'

export default function AuthComponent() {

    const session = useSession()

    console.log(session)
    return (
        <div className="container mx-auto px-4 max-w-[1200px] bg-blue-300 h-4">

        </div>
    )
}