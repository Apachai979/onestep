'use client'
import { useCallback, useRef, useEffect, useState } from 'react'
import FormContact from '../FormContact';

export default function ButtonOpenForm({ children, titleForForm = "Задать вопрос специалисту:" }) {
    const [isOpen, setIsOpen] = useState(false);

    const openModal = () => setIsOpen(true);

    const overlay = useRef(null)
    const wrapper = useRef(null)

    const onDismiss = useCallback(() => {
        setIsOpen(false)
    }, [isOpen])

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
        <div>
            {isOpen && (<div
                ref={overlay}
                className="fixed z-30 left-0 right-0 top-0 bottom-0 mx-auto my-auto backdrop-blur-sm bg-black/60 animate-apparition"
                onClick={onClick}
            >
                <div
                    ref={wrapper}
                    className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white p-10 pt-7 rounded-xl overflow-hidden animate-emersion"
                >
                    <section className="flex flex-col justify-center items-center ">
                        <FormContact titleForForm={titleForForm} />
                    </section>
                </div>
            </div>
            )}
            <button onClick={openModal}>{children}
            </button>
        </div>
    )
}