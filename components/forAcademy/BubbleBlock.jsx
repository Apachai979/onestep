"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import { useState, useEffect } from "react"
import BoxAcademy from "@/components/forAcademy/BoxAcademy"

export default function Academy() {
    const [activeTab, setActiveTab] = useState()
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        // Получаем значение из localStorage при загрузке страницы
        const savedSection = localStorage.getItem("section")
        if (savedSection) {
            setActiveTab(savedSection)
        }
    }, [])

    const handleTabClick = href => {
        window.scrollTo({ top: 0, behavior: "smooth" })
        localStorage.setItem("section", href)
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
        <div className='sm:px-4'>
            {/* Навигационные элементы */}

            <div className='sticky top-[108px] sm:top-[136px] z-10 flex flex-wrap gap-2 sm:gap-4 bg-body_bg py-2'>
                {parsedData.map(item => (
                    <button
                        key={item.title}
                        onClick={() => handleTabClick(item.href)}
                        className={`relative rounded-full border-2 transition-all duration-300 ease-in-out ${activeTab === item.href
                            ? "shadow-glow border-primary_green bg-transparent text-primary_green"
                            : "border-gray-300 bg-stone-50 text-gray-600 hover:bg-gray-100"
                            } sm:px-4 sm:py-2 px-1 py-2 text-lg font-semibold leading-tight sm:leading-none`}
                    >
                        {item.title}
                        {activeTab === item.href && (
                            <span className='absolute inset-0 rounded-full opacity-20 transition-all duration-300 ease-in-out'></span>
                        )}
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
