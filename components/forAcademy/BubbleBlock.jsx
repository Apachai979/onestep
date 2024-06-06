"use client"
import { useState } from "react"
export default function BubbleBlock({ categories, posts }) {

    // console.log(posts)
    const [idPost, setidPost] = useState(categories.map(i => i.id))
    const [lastClickedIndex, setLastClickedIndex] = useState(null)
    const [classname, setClassname] = useState("")

    const moveToTop = index => {
        console.log('number: ' + index)
        if (index === lastClickedIndex) {
            setClassname("animate-shaker")
            setTimeout(() => setClassname(""), 400)
        } else {
            setidPost([index, ...idPost.filter(i => i !== index)])
            setClassname("animate-transformt z-10")
            setTimeout(() => setClassname(""), 700)
            setLastClickedIndex(index)
        }
    }

    return (
        <div className='p-4'>
            <div className='mb-4 flex justify-around'>
                {categories.map((el) => {
                    return (
                        <button key={el.id}
                            className='rounded-full text-primary_green font-semibold text-lg bg-stone-50 border-primary_green border px-6 py-2'
                            onClick={() => moveToTop(el.id)}
                        >
                            {el.name}
                        </button>
                    )
                })}

            </div>
            <div className='flex flex-col'>
                {idPost.map((idCategory) => {
                    const selectPosts = posts.filter(el => el.categoryId === idCategory);
                    // console.log('-- ', selectPosts)
                    return (
                        selectPosts.length > 0 && selectPosts.map((post) => {
                            // console.log('post: ', post)
                            return (
                                <div className={`mb-4 border bg-zinc-200 rounded-3xl p-4 ${idPost[0] === idCategory && classname}`}>
                                    <h2 className="text-xl py-2 font-semibold">{categories[idCategory].name}</h2>
                                    <div
                                        key={post.id}
                                        className={`mb-4 border bg-stone-300 rounded-3xl p-4`}
                                    >

                                        <p className="text-xl font-semibold">{post.title}</p>
                                        <p>{post.content}</p>
                                    </div>
                                </div>
                            )
                        })
                    )
                })}
            </div>
        </div>
    )
}
