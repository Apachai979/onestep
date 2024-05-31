'use client'
import { signIn, useSession } from "next-auth/react"

export default function AuthComponent() {
    const { data: session } = useSession();

    console.log(session)
    return (
        <>
            {session ? (
                <h1>Welcome back</h1>)
                : (
                    <>
                        <h1>Youre not logged in</h1>
                        <button onClick={() => signIn('google')} className="w-10 h-10 border border-black rounded-lg">Google</button>
                        <button onClick={() => signIn('github')} className="w-10 h-10 border border-black rounded-lg">Github</button>
                    </>
                )
            }


            <div>
                Dashboard
            </div>
        </>
    )
}