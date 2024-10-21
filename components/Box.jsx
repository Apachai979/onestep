import { useState } from 'react';
import Link from 'next/link'; // Assuming you're using Next.js

const Box = ({ title, categories }) => {
    const [activeCategory, setActiveCategory] = useState(null);

    const handleCategoryClick = (categoryName) => {
        setActiveCategory(categoryName === activeCategory ? null : categoryName);
    };

    const getVisibleTopics = () => {
        if (!activeCategory) {
            return categories.flatMap((category) => category.topics);
        }
        const activeCategoryData = categories.find((category) => category.name === activeCategory);
        return activeCategoryData ? activeCategoryData.topics : [];
    };

    const visibleTopics = getVisibleTopics();

    return (
        <div className="container mx-auto max-w-[1200px] px-4">
            <div className="mb-5 flex flex-wrap gap-4">
                <Link
                    href="#"
                    className="text-nowrap rounded-full border border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold text-primary_green"
                >
                    {title}
                </Link>
            </div>
            <div className="mb-3 flex gap-3">
                <div className="flex flex-col">
                    <div className="my-2 rounded-3xl border bg-zinc-200 p-4">
                        <h2 className="py-2 text-xl font-semibold">{title}</h2>
                        <div className="mb-3 flex gap-3">
                            {categories.map((category) => (
                                <Link
                                    key={category.name}
                                    href="#"
                                    className="my-1 rounded-full border border-gray-700 px-3 py-1"
                                    onClick={() => handleCategoryClick(category.name)}
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>


                        {visibleTopics.map((topic) => (
                            <div className="mb-4 rounded-3xl bg-stone-300 p-4">
                                <Link key={topic.title} href="#" className="flex items-center space-x-4 mb-2">
                                    <div className="h-12 w-12 rotate-45 overflow-hidden rounded-xl">
                                        <img
                                            src="/logo_only.svg"
                                            alt=""
                                            className="h-12 w-12 -rotate-45 object-cover object-center"
                                        />
                                    </div>
                                    <div className="text-xl font-semibold">{topic.title}</div>
                                </Link>
                            </div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Box;
