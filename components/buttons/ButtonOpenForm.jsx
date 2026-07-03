'use client'
import { useCallback, useRef, useEffect, useState } from 'react'
import { RiCloseLargeLine } from 'react-icons/ri'
import FormContact from '../FormContact';

export default function ButtonOpenForm({ children, titleForForm = "Задать вопрос специалисту:" }) {
    const [isOpen, setIsOpen] = useState(false);

    const openModal = () => setIsOpen(true);

    const overlay = useRef(null)
    const wrapper = useRef(null)

    const onDismiss = useCallback(() => {
        setIsOpen(false)
    }, [])

    const onClick = useCallback(
        (e) => {
            if (e.target === overlay.current) {
                if (onDismiss) onDismiss()
            }
        },
        [onDismiss]
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
                    className="absolute left-1/2 top-1/2 max-h-[92vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 pt-12 shadow-2xl animate-emersion sm:p-8 sm:pt-12"
                >
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Закрыть"
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-night_green"
                    >
                        <RiCloseLargeLine size={18} />
                    </button>
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