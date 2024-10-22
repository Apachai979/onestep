import { useState } from "react"
import Link from "next/link" // Assuming you're using Next.js
import Image from "next/image"

const BoxAcademy = ({ title, categories }) => {
    const [activeCategory, setActiveCategory] = useState(null)

    const handleCategoryClick = categoryName => {
        setActiveCategory(categoryName === activeCategory ? null : categoryName)
    }

    const getVisibleTopics = () => {
        if (!activeCategory) {
            return categories.flatMap(category => category.topics)
        }
        const activeCategoryData = categories.find(category => category.name === activeCategory)
        return activeCategoryData ? activeCategoryData.topics : []
    }

    const visibleTopics = getVisibleTopics()

    return (
        <div className='px-4'>
            <div className='mb-3 flex gap-3'>
                <div className='flex flex-col w-full'>
                    <div className='my-2 rounded-3xl border bg-zinc-200 p-4'>
                        <h2 className='py-2 text-xl font-semibold'>{title}</h2>
                        <div className='mb-3 flex gap-3 flex-wrap'>
                            {categories.map(category => (
                                <Link
                                    key={category.name}
                                    href='#'
                                    className={`my-1 rounded-3xl border border-gray-700 px-3 py-1 ${activeCategory === category.name && "bg-primary_green"}`}
                                    onClick={() => handleCategoryClick(category.name)}
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>

                        {visibleTopics.map(topic => (
                            <div className='mb-4 rounded-3xl bg-stone-300 p-4'>
                                <Link
                                    key={topic.title}
                                    href={topic.href}
                                    className='mb-2 flex items-center space-x-4'
                                >
                                    <div className='h-14 w-14 rotate-45 overflow-hidden rounded-xl'>
                                        <Image
                                            src='/logo_only.svg'
                                            alt=''
                                            width={720}
                                            height={480}
                                            className='h-14 w-14 -rotate-45 object-cover object-center'
                                        ></Image>
                                    </div>
                                    <div className='text-xl font-semibold'>{topic.title}</div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BoxAcademy
