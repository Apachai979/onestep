'use client'
import { useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Modal({ children }) {
    const overlay = useRef(null)
    const wrapper = useRef(null)
    const router = useRouter()

    const onDismiss = useCallback(() => {
        router.back()
    }, [router])

    const onClick = useCallback(
        (e) => {
            if (e.target === overlay.current) {
                if (onDismiss) onDismiss()
            }
        },
        [onDismiss, overlay, wrapper]
    )

    const onKeyDown = useCallback(
        (e) => {
            if (e.key === 'Escape') onDismiss()
        },
        [onDismiss]
    )

    useEffect(() => {
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onKeyDown])

    return (
        <div
            ref={overlay}
            className="fixed z-30 left-0 right-0 top-0 bottom-0 mx-auto my-auto backdrop-blur-sm bg-black/60 animate-apparition overflow-y-auto"
            onClick={onClick}
        >
            <div
                ref={wrapper}
                className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white p-8 rounded-xl overflow-hidden animate-emersion min-w-96 "
            >
                {children}
            </div>
        </div>
    )
}