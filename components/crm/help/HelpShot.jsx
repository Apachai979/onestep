"use client"
import { useState } from "react"
import { LuImage } from "react-icons/lu"

/**
 * Место под скриншот в инструкции.
 *
 * Пока файла нет — рисуется рамка с подсказкой, что именно снять и как назвать
 * файл. Как только картинка появится в `public/help/`, компонент покажет её сам:
 * ошибка загрузки — единственный способ отличить «скриншот ещё не сделали» от
 * «сделали», серверной проверки файла здесь намеренно нет.
 *
 * Props:
 * - file    — имя файла в public/help (например "deals-kanban.png")
 * - caption — подпись под картинкой (что на ней видно)
 * - shoot   — что и в каком состоянии снять; показывается только в заглушке
 */
export default function HelpShot({ file, caption, shoot }) {
    const [failed, setFailed] = useState(!file)

    if (failed) {
        return (
            <figure className='my-4'>
                <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line_strong bg-surface_muted px-4 py-8 text-center'>
                    <LuImage className='h-6 w-6 text-neutral-300' />
                    <p className='text-sm font-medium text-neutral-600'>
                        {caption || "Скриншот"}
                    </p>
                    {shoot && (
                        <p className='max-w-xl text-xs text-neutral-500'>
                            <span className='font-medium text-neutral-600'>Что снять: </span>
                            {shoot}
                        </p>
                    )}
                    {file && (
                        <p className='mt-1 text-[11px] text-neutral-400'>
                            Положите файл{" "}
                            <code className='rounded bg-white px-1 py-0.5 font-mono text-[10px] text-neutral-500'>
                                public/help/{file}
                            </code>{" "}
                            — картинка подставится сюда сама
                        </p>
                    )}
                </div>
            </figure>
        )
    }

    return (
        <figure className='my-4'>
            {/* Обычный img, не next/image: размеры скриншотов заранее не известны,
                а оптимизация статичной картинке из public здесь ничего не даёт. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/help/${file}`}
                alt={caption || "Скриншот интерфейса CRM"}
                onError={() => setFailed(true)}
                className='w-full rounded-xl border border-line shadow-sm'
            />
            {caption && (
                <figcaption className='mt-2 text-xs text-neutral-500'>{caption}</figcaption>
            )}
        </figure>
    )
}
