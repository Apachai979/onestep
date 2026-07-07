"use client"
import { useEffect, useState } from "react"
import { LuDownload, LuShare, LuX } from "react-icons/lu"

const IOS_HINT_KEY = "crm-ios-install-hint-dismissed"

function detectIosSafari() {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || ""
    // iPhone/iPod + iPad (в т.ч. iPadOS, который мимикрирует под Mac)
    const isIos =
        /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    if (!isIos) return false
    // «Добавить на экран Домой» есть только в Safari — не в Chrome (CriOS),
    // Firefox (FxiOS), Edge (EdgiOS) на iOS
    const isOtherBrowser = /crios|fxios|edgios|opios/i.test(ua)
    return !isOtherBrowser
}

/**
 * Кнопка/подсказка «Установить приложение» для CRM.
 *
 * Android/десктоп Chrome: ловим событие `beforeinstallprompt`, гасим баннер
 * браузера и показываем свою кнопку, вызывающую нативный диалог установки.
 *
 * iOS/Safari: события установки нет, ставится только вручную через
 * «Поделиться → На экран Домой» — поэтому показываем закрываемую подсказку
 * с этой инструкцией (факт закрытия помним в localStorage).
 *
 * Если CRM уже открыта как установленное приложение (display-mode: standalone),
 * ничего не показываем.
 */
export default function InstallAppButton({ showLabels = "opacity-100", onDone }) {
    const [deferred, setDeferred] = useState(null)
    const [hidden, setHidden] = useState(false)
    const [iosHint, setIosHint] = useState(false)

    useEffect(() => {
        const standalone =
            window.matchMedia?.("(display-mode: standalone)").matches ||
            window.navigator.standalone === true
        if (standalone) {
            setHidden(true)
            return
        }

        if (detectIosSafari()) {
            let dismissed = false
            try {
                dismissed = localStorage.getItem(IOS_HINT_KEY) === "1"
            } catch {
                /* приватный режим — просто покажем подсказку */
            }
            if (!dismissed) setIosHint(true)
            return
        }

        function onPrompt(e) {
            // не даём браузеру показать свой баннер — покажем свою кнопку
            e.preventDefault()
            setDeferred(e)
        }
        function onInstalled() {
            setDeferred(null)
            setHidden(true)
        }
        window.addEventListener("beforeinstallprompt", onPrompt)
        window.addEventListener("appinstalled", onInstalled)
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt)
            window.removeEventListener("appinstalled", onInstalled)
        }
    }, [])

    if (hidden) return null

    if (iosHint) {
        function dismissHint() {
            try {
                localStorage.setItem(IOS_HINT_KEY, "1")
            } catch {
                /* приватный режим — ничего не сохраняем */
            }
            setIosHint(false)
        }
        return (
            <div
                className={`mb-2 rounded-lg border border-brand_main/30 bg-brand_main/10 px-3 py-2.5 text-brand_main transition-opacity duration-150 ${showLabels}`}
            >
                <div className='flex items-start gap-2'>
                    <LuShare className='mt-0.5 h-4 w-4 shrink-0' />
                    <p className='flex-1 text-xs leading-snug'>
                        Установить приложение: нажмите{" "}
                        <span className='font-semibold'>«Поделиться»</span> и выберите{" "}
                        <span className='font-semibold'>«На экран „Домой“»</span>.
                    </p>
                    <button
                        type='button'
                        onClick={dismissHint}
                        aria-label='Скрыть подсказку'
                        className='-mr-1 -mt-1 shrink-0 rounded p-0.5 text-brand_main/60 hover:bg-brand_main/15 hover:text-brand_main'
                    >
                        <LuX className='h-3.5 w-3.5' />
                    </button>
                </div>
            </div>
        )
    }

    if (!deferred) return null

    async function install() {
        deferred.prompt()
        try {
            await deferred.userChoice
        } catch {
            /* пользователь закрыл диалог — ничего не делаем */
        }
        // событие одноразовое: повторно вызвать prompt() уже нельзя
        setDeferred(null)
        onDone?.()
    }

    return (
        <button
            type='button'
            onClick={install}
            title='Установить приложение на устройство'
            className='group/item mb-2 flex w-full items-center gap-3 rounded-lg border border-brand_main/30 bg-brand_main/10 px-3 py-2.5 text-sm font-medium text-brand_main transition hover:bg-brand_main hover:text-white'
        >
            <LuDownload className='h-5 w-5 shrink-0' />
            <span
                className={`flex-1 truncate whitespace-nowrap text-left transition-opacity duration-150 ${showLabels}`}
            >
                Установить приложение
            </span>
        </button>
    )
}
