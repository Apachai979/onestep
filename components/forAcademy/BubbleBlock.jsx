"use client"
import { useState, useRef } from "react"
import Image from "next/image"
export default function BubbleBlock({ sections, categories, posts }) {
    // console.log(posts)
    const [idCategories, setIdCategories] = useState(categories.map(i => i.id))
    const [idSecton, setIdSection] = useState(sections.map(i => i.id))
    const [activeCategory, setActiveCategory] = useState(null)
    const [activeSection, setActiveSection] = useState(null)
    const [classname, setClassname] = useState("")
    const animationRef = useRef(null);

    const sectionMoveToTop = index => {
        setActiveSection(index)
        setIdSection([index, ...idSecton.filter(i => i !== index)])
    }

    const moveToTop = index => {

        if (animationRef.current) {
            clearTimeout(animationRef.current); // Отменяем текущую анимацию
        }

        if (index === activeCategory) {
            setClassname("animate-shaker")
            animationRef.current = setTimeout(() => {
                setClassname("")
                animationRef.current = null
            }, 400)
        } else {
            setIdCategories([index, ...idCategories.filter(i => i !== index)])
            setClassname("animate-transformt z-10")
            animationRef.current = setTimeout(() => {
                setClassname("")
                animationRef.current = null
            }, 700)
            setActiveCategory(index)
            setActiveSection(null)
        }
    }

    return (
        <div className='p-4'>
            <div className='flex flex-wrap gap-4 mb-5'>
                {categories.map(el => {
                    const active = activeCategory === el.id
                    return (
                        <button
                            key={el.id}
                            className={`text-nowrap rounded-full border  border-primary_green bg-stone-50 px-3 py-2 text-lg font-semibold text-primary_green ${active && "translate-y-2 shadow-neon"}`}
                            onClick={() => moveToTop(el.id)}
                        >
                            {el.name}
                        </button>
                    )
                })}
            </div>
            <div className='flex flex-col'>
                {idCategories.map(idCategory => {
                    const selectPosts = posts.filter(el => el.categoryId === idCategory)
                    // console.log('-- ', selectPosts)
                    return (selectPosts.length > 0 &&
                        <div
                            key={idCategory}
                            className={`my-2 rounded-3xl border bg-zinc-200 p-4 ${idCategories[0] === idCategory && classname}`}
                        >
                            <h2 className='py-2 text-xl font-semibold'>
                                {categories[idCategory - 1].name}
                            </h2>
                            <div className="flex gap-3 mb-3">
                                {selectPosts.filter((item, index, self) =>
                                    index === self.findIndex((t) => (t.section.name === item.section.name
                                    ))
                                ).map((post) => {
                                    const active = activeSection === post.section.id
                                    return (

                                        <button onClick={() => sectionMoveToTop(post.section.id)} className={`border border-gray-700 rounded-full px-3 py-1 my-1 ${active && "bg-primary_green"}`}>
                                            {post.section.name}
                                        </button>

                                    )
                                })}
                            </div>
                            {selectPosts.length > 0 &&
                                selectPosts.map(post => {
                                    // console.log('post: ', post)

                                    return (
                                        post.section.id === activeSection &&
                                        <>
                                            {/* <div className='font-semibold py-1 '>{post.section.name}</div> */}
                                            <div key={post.id} className={`mb-4 rounded-3xl bg-stone-300 p-4`}>
                                                <div className='flex items-center space-x-4'>
                                                    <div className='h-14 w-14 rotate-45 overflow-hidden rounded-xl'>
                                                        <Image
                                                            src='/logo_only.svg'
                                                            alt=''
                                                            width={720}
                                                            height={480}
                                                            className='h-14 w-14 -rotate-45 object-cover object-center'
                                                        ></Image>
                                                    </div>
                                                    <div className='text-xl font-semibold'>
                                                        {post.title}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )
                                })
                            }</div>)
                })}
            </div>
        </div>
    )
}
