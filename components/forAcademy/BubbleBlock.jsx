"use client"
import parsedData from "@/components/Data/dataAcademy.json"
import { useState } from "react"
import Box from "@/components/forAcademy/Box"

export default async function Academy() {
    const [activeTab, setActiveTab] = useState("Менеджмент качества")
    const handleTabClick = title => {
        setActiveTab(title)
    }

    // Перемещаем активную вкладку в начало списка
    const sortedData = [
        ...parsedData.filter(item => item.title === activeTab),
        ...parsedData.filter(item => item.title !== activeTab),
    ]

    return (
        <>
            {/* Навигационные элементы */}
            <div className='mb-5 flex gap-4'>
                {parsedData.map(item => (
                    <button
                        key={item.title}
                        href='#'
                        onClick={() => handleTabClick(item.title)}
                        className={`text-nowrap rounded-full border border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold ${
                            activeTab === item.title ? "text-primary_green" : "text-gray-500"
                        }`}
                    >
                        {item.title}
                    </button>
                ))}
            </div>

            {/* Отображение всех блоков с контентом, активный блок первым */}
            <div className='mb-3 flex flex-col gap-3'>
                {sortedData.map(item => (
                    <Box key={item.title} title={item.title} categories={item.categories} />
                ))}
            </div>
        </>
    )
}
