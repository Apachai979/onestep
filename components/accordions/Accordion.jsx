'use client'
import { useState } from 'react'
import Block from '../Block'

export default function Accordion({ children, title, design = ' bg-slate-100 ' }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className={`max-w-[800px] mx-auto px-10 py-4 ${design}`}>
                <button
                    onClick={() => {
                        setOpen(prev => !prev)
                    }}
                    className=" flex w-full justify-between items-center group"
                >
                    <h1 className="text-xl font-semibold text-left w-full">{title}</h1>
                    <div className="relative w-9 h-9 flex justify-center items-center rounded-full group-hover:bg-gray-300">
                        <div className={` absolute h-6 w-0.5 bg-primary_green transition-all duration-300 ease-in-out 
                    ${open ? 'rotate-45' : 'rotate-0'}`}></div>
                        <div className={` absolute h-0.5 w-6 bg-primary_green transition-all duration-300 ease-in-out 
                        ${open ? 'rotate-45' : 'rotate-0'}`}></div>
                    </div>
                </button>

                <div
                    className={`text-lg grid overflow-hidden ${design} transition-all duration-300 ease-in-out ${open ? 'py-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        } `}
                >
                    <div className="overflow-hidden px-4">
                        {children}
                    </div>

                </div>

            </div >

        </>
    )
}
