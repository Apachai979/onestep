"use client"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

export default function RegisterPage() {
    return (
        <Suspense fallback={null}>
            <Register />
        </Suspense>
    )
}

function safeJson(text) {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function Register() {
    const router = useRouter()
    const params = useSearchParams()
    const token = params.get("invite") || ""

    const [invite, setInvite] = useState(null)
    const [inviteError, setInviteError] = useState("")
    const [form, setForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        passwordConfirm: "",
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!token) {
            setInviteError("В ссылке отсутствует токен приглашения.")
            return
        }
        fetch(`/api/auth/invite-info?token=${encodeURIComponent(token)}`)
            .then(async r => {
                const text = await r.text()
                const data = text ? safeJson(text) : {}
                if (!r.ok) throw new Error(data?.error || `Ошибка ${r.status}`)
                return data
            })
            .then(data => {
                setInvite(data.item)
                if (data.item.email) {
                    setForm(prev => ({ ...prev, email: data.item.email }))
                }
                if (data.item.status === "USED") {
                    setInviteError("Приглашение уже использовано.")
                } else if (data.item.status === "EXPIRED") {
                    setInviteError("Срок действия приглашения истёк.")
                }
            })
            .catch(err => setInviteError(err.message))
    }, [token])

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")
        if (form.password.length < 8) {
            setError("Пароль должен содержать минимум 8 символов")
            return
        }
        if (form.password !== form.passwordConfirm) {
            setError("Пароли не совпадают")
            return
        }

        setLoading(true)
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token,
                email: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
            }),
        })
        const text = await res.text()
        const data = text ? safeJson(text) : {}

        if (!res.ok) {
            setError(data?.error || "Не удалось создать аккаунт")
            setLoading(false)
            return
        }

        const signInRes = await signIn("credentials", {
            email: form.email,
            password: form.password,
            redirect: false,
        })
        setLoading(false)
        if (signInRes?.error) {
            setError("Аккаунт создан, но войти не удалось. Откройте страницу входа.")
            return
        }
        router.push("/crm")
        router.refresh()
    }

    const formDisabled = !invite || invite.status !== "ACTIVE"

    return (
        <div className='container mx-auto my-20 max-w-[1200px] space-y-5 px-4'>
            <div className='flex items-center justify-center'>
                <Image
                    src='/logo_only.png'
                    alt='Onestep'
                    className='h-32 w-32 rounded-full object-contain drop-shadow'
                    width={512}
                    height={512}
                />
            </div>

            <div className='flex items-center justify-center'>
                <form
                    onSubmit={handleSubmit}
                    className='flex w-96 flex-col items-center justify-center space-y-3'
                >
                    <h1 className='text-center text-2xl font-semibold text-night_green'>
                        Регистрация по приглашению
                    </h1>

                    {invite && !inviteError && (
                        <p className='text-center text-sm text-gray-600'>
                            Вы регистрируетесь как{" "}
                            <strong className='text-night_green'>{invite.roleLabel}</strong>.
                            {invite.email && (
                                <>
                                    <br />
                                    Email закреплён за приглашением.
                                </>
                            )}
                        </p>
                    )}

                    {inviteError && (
                        <p className='w-full rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700'>
                            {inviteError}
                        </p>
                    )}

                    <input
                        type='email'
                        required
                        autoComplete='email'
                        value={form.email}
                        onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                        readOnly={!!invite?.email}
                        disabled={formDisabled}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm read-only:bg-gray-50 disabled:bg-gray-100'
                        placeholder='Email'
                    />
                    <input
                        type='text'
                        autoComplete='given-name'
                        value={form.firstName}
                        onChange={e =>
                            setForm(prev => ({ ...prev, firstName: e.target.value }))
                        }
                        disabled={formDisabled}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm disabled:bg-gray-100'
                        placeholder='Имя'
                    />
                    <input
                        type='text'
                        autoComplete='family-name'
                        value={form.lastName}
                        onChange={e =>
                            setForm(prev => ({ ...prev, lastName: e.target.value }))
                        }
                        disabled={formDisabled}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm disabled:bg-gray-100'
                        placeholder='Фамилия'
                    />
                    <input
                        type='password'
                        required
                        autoComplete='new-password'
                        value={form.password}
                        onChange={e =>
                            setForm(prev => ({ ...prev, password: e.target.value }))
                        }
                        disabled={formDisabled}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm disabled:bg-gray-100'
                        placeholder='Пароль (минимум 8 символов)'
                    />
                    <input
                        type='password'
                        required
                        autoComplete='new-password'
                        value={form.passwordConfirm}
                        onChange={e =>
                            setForm(prev => ({ ...prev, passwordConfirm: e.target.value }))
                        }
                        disabled={formDisabled}
                        className='h-12 w-full rounded-lg border border-gray-300 px-3 shadow-sm disabled:bg-gray-100'
                        placeholder='Повторите пароль'
                    />

                    {error && (
                        <p className='w-full text-center text-sm text-red-600'>{error}</p>
                    )}

                    <button
                        type='submit'
                        disabled={formDisabled || loading}
                        className='h-10 w-full rounded-lg border border-gray-300 px-1 shadow-sm transition-all ease-in-out hover:bg-mainGreen hover:font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
                    </button>

                    <p className='text-center text-sm text-gray-500'>
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
