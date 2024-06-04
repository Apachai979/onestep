'use client'
import { signIn, signOut, useSession } from "next-auth/react"
import Image from "next/image";
import Link from "next/link";

export default function AuthComponent() {
    const { data: session } = useSession();

    console.log(session)
    return (
<<<<<<< HEAD
        <>+
=======
        <div className='container mx-auto px-4'>
>>>>>>> e0a899e2d436dabf8e44f210e5a7fb78d747f4e5
            {session ? (
                <div className="flex justify-end items-center space-x-1">

                    <h1>Добро пожаловать, <Link href="#" onClick={() => signOut({ callbackUrl: "/" })}>{session?.user?.name}</Link></h1>
                    {session?.user?.image && <Image
                        src={session.user.image}
                        alt="Profile"
                        className="object-contain w-6 h-6 rounded-full"
                        width={512}
                        height={512}
                    />
                    }
                </div>
            )
                : (
                    <div className="space-x-4">
                        <h1>Youre not logged in</h1>
<<<<<<< HEAD
                        <button onClick={() => signIn('google')} className="w-autp h-10 border border-black rounded-lg">Google</button>
                        <button onClick={() => signIn('github')} className="w-auto h-10 border border-black rounded-lg">Github</button>
=======
                        <button onClick={() => signIn('google')} className="px-1 w-auto h-10 border border-black rounded-lg">Google</button>
                        <button onClick={() => signIn('github')} className="px-1 w-auto h-10 border border-black rounded-lg">Github</button>
>>>>>>> e0a899e2d436dabf8e44f210e5a7fb78d747f4e5
                    </div>
                )
            }

        </div >
    )
}