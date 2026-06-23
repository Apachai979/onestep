"use client"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import Image from "next/image"

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <SignIn />
        </Suspense>
    )
}

function SignIn() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl,
        })

        setLoading(false)

        if (res?.error) {
            setError(res.error)
            return
        }
        router.push(callbackUrl)
        router.refresh()
    }

    return (
        <div className='container mx-auto my-20 max-w-[1200px] space-y-5 px-4'>
            <div className='flex items-center justify-center'>
                <Image
                    src='/logo_only.png'
                    alt='Profile'
                    className='h-48 w-48 rounded-full object-contain drop-shadow'
                    width={512}
                    height={512}
                />
            </div>
            <div className='flex items-center justify-center'>
                <form
                    onSubmit={handleSubmit}
                    className='flex w-80 flex-col items-center justify-center space-y-3'
                >
                    <h1 className='text-center text-2xl font-semibold text-night_green'>
                        Личный кабинет
                    </h1>
                    <input
                        type='email'
                        required
                        autoComplete='email'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm'
                        placeholder='Адрес электронной почты'
                    />
                    <input
                        type='password'
                        required
                        autoComplete='current-password'
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm'
                        placeholder='Пароль'
                    />
                    {error && (
                        <p className='w-full text-center text-sm text-red-600'>{error}</p>
                    )}
                    <button
                        type='submit'
                        disabled={loading}
                        className='h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {loading ? "Входим..." : "Войти"}
                    </button>
                    <p className='text-center text-sm text-gray-500'>
                        Доступ предоставляется по приглашению администратора.
                    </p>
                    <div className='flex w-80 items-center justify-center'>
                        <hr className='h-0.5 w-full bg-gray-300' />
                        <p className='px-2'>или</p>
                        <hr className='h-0.5 w-full bg-gray-300' />
                    </div>
                    <div className='w-80 space-y-2 pb-2 pt-1'>
                        <button
                            type='button'
                            onClick={() => signIn("google", { callbackUrl })}
                            className='h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95'
                        >
                            Google
                        </button>
                        <button
                            type='button'
                            onClick={() => signIn("mailru", { callbackUrl })}
                            className='h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95'
                        >
                            MailRu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
