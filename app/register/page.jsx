"use client"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

export default function Register() {
    const router = useRouter()

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")

        if (password.length < 8) {
            setError("Пароль должен содержать минимум 8 символов")
            return
        }
        if (password !== passwordConfirm) {
            setError("Пароли не совпадают")
            return
        }

        setLoading(true)

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || "Не удалось создать аккаунт")
            setLoading(false)
            return
        }

        const signInRes = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        setLoading(false)

        if (signInRes?.error) {
            setError("Аккаунт создан, но не удалось войти. Попробуйте ещё раз.")
            return
        }
        router.push("/")
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
                        Создание аккаунта
                    </h1>
                    <input
                        type='text'
                        autoComplete='name'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm'
                        placeholder='Имя (необязательно)'
                    />
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
                        autoComplete='new-password'
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm'
                        placeholder='Пароль (минимум 8 символов)'
                    />
                    <input
                        type='password'
                        required
                        autoComplete='new-password'
                        value={passwordConfirm}
                        onChange={e => setPasswordConfirm(e.target.value)}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm'
                        placeholder='Повторите пароль'
                    />
                    {error && (
                        <p className='w-full text-center text-sm text-red-600'>{error}</p>
                    )}
                    <button
                        type='submit'
                        disabled={loading}
                        className='h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
                    </button>
                    <p className='text-center'>
                        Уже есть аккаунт?{" "}
                        <Link
                            href='/authorize'
                            className='text-dark_green hover:text-mainGreen'
                        >
                            Войти
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
