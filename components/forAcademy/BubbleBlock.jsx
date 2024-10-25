"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import { useState } from "react"
import BoxAcademy from "@/components/forAcademy/BoxAcademy"
import { useSearchParams, useRouter } from "next/navigation"

function Search() {
    const searchParams = useSearchParams()
    const section = searchParams.get("section")
    return section
}

export default function Academy() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState(Search())
    const [isAnimating, setIsAnimating] = useState(false)

    const handleTabClick = href => {
        router.replace(`/academy?section=${href}`)

        setIsAnimating(true)

        setTimeout(() => {
            setActiveTab(href)
            setIsAnimating(false)
        }, 200) // Длительность анимации 300ms
    }

    // Перемещаем активную вкладку в начало списка
    const sortedData = [
        ...parsedData.filter(item => item.href === activeTab),
        ...parsedData.filter(item => item.href !== activeTab),
    ]

    return (
        <div className='px-4'>
            {/* Навигационные элементы */}

            <div className='sticky top-[136px] z-10 flex flex-wrap gap-4 bg-body_bg py-2'>
                {parsedData.map(item => (
                    <button
                        key={item.title}
                        href='#'
                        onClick={() => handleTabClick(item.href)}
                        className={`text-nowrap rounded-full border border-primary_green bg-stone-50 text-lg font-semibold ${
                            activeTab === item.href
                                ? "border-2 px-3 py-2 text-primary_green"
                                : "px-3.5 py-2.5 text-gray-500"
                        }`}
                    >
                        {item.title}
                    </button>
                ))}
            </div>

            {/* Отображение всех блоков с контентом, активный блок первым */}
            <div
                className={`mb-3 flex w-full transform flex-col gap-3 transition-all duration-200 ${isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
            >
                {sortedData.map(item => (
                    <BoxAcademy key={item.title} title={item.title} categories={item.categories} />
                ))}
            </div>
        </div>
    )
}
