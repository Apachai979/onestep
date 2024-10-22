"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import { useState } from "react"
import BoxAcademy from "@/components/forAcademy/BoxAcademy"

export default function Academy() {
    const [activeTab, setActiveTab] = useState("Менеджмент качества")
    const [isAnimating, setIsAnimating] = useState(false);
    const handleTabClick = title => {

        setIsAnimating(true);

        setTimeout(() => {
            setActiveTab(title)
            setIsAnimating(false);
        }, 200); // Длительность анимации 300ms
    }

    // Перемещаем активную вкладку в начало списка
    const sortedData = [
        ...parsedData.filter(item => item.title === activeTab),
        ...parsedData.filter(item => item.title !== activeTab),
    ]

    return (
        <div className="px-4">
            {/* Навигационные элементы */}
            <div className='mb-5 flex flex-wrap gap-4'>
                {parsedData.map(item => (
                    <button
                        key={item.title}
                        href='#'
                        onClick={() => handleTabClick(item.title)}
                        className={`text-nowrap rounded-full border border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold ${activeTab === item.title ? "text-primary_green" : "text-gray-500"
                            }`}
                    >
                        {item.title}
                    </button>
                ))}
            </div>

            {/* Отображение всех блоков с контентом, активный блок первым */}
            <div className={`mb-3 flex w-full flex-col gap-3 transition-all duration-200 transform ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {sortedData.map(item => (
                    <BoxAcademy key={item.title} title={item.title} categories={item.categories} />
                ))}
            </div>
        </div>
    )
}
