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
        <div className='md:px-4'>
            <div className='mb-3 flex gap-3'>
                <div className='flex w-full flex-col'>
                    <div className='my-2 rounded-3xl border bg-zinc-200 p-4'>
                        <h2 className='py-2 text-xl font-semibold'>{title}</h2>
                        <div className='mb-3 flex flex-wrap gap-3'>
                            {categories.map(category => (
                                <Link
                                    key={category.name}
                                    href='#'
                                    className={`relative my-1 inline-block rounded-full border-b-2 transition-all duration-300 ease-in-out ${
                                        activeCategory === category.name
                                            ? "border-primary_green text-primary_green"
                                            : "border-transparent text-gray-600 hover:border-gray-400 hover:text-gray-800"
                                    } px-3 py-1 text-base font-semibold`}
                                    onClick={() => handleCategoryClick(category.name)}
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>

                        {visibleTopics.map(topic => (
                            <div
                                key={topic.title}
                                className='mb-4 flex items-center rounded-3xl bg-stone-300 p-4'
                            >
                                <Link href={topic.href} className='flex items-center space-x-4'>
                                    <div className='min-h-14 min-w-14 rotate-45 overflow-hidden rounded-xl'>
                                        {topic.image ? (
                                            <Image
                                                src={topic.image}
                                                alt=''
                                                width={720}
                                                height={480}
                                                className='h-14 w-14 -rotate-45 object-cover object-center'
                                            ></Image>
                                        ) : (
                                            <Image
                                                src='/logo_only.svg'
                                                alt=''
                                                width={720}
                                                height={480}
                                                className='h-14 w-14 -rotate-45 object-cover object-center'
                                            ></Image>
                                        )}
                                    </div>
                                    <div className='text-md font-semibold md:text-xl'>
                                        {topic.title}
                                    </div>
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
