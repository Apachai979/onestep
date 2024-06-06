"use client"
import { useState } from "react"
export default function BubbleBlock({ data }) {

    console.log(data[0].name)
    const [order, setOrder] = useState([0, 1, 2, 3, 4])
    const [lastClickedIndex, setLastClickedIndex] = useState(null)
    const [classname, setClassname] = useState("")

    const moveToTop = index => {
        if (index === lastClickedIndex) {
            setClassname("animate-shaker")
            setTimeout(() => setClassname(""), 400)
        } else {
            setOrder([index, ...order.filter(i => i !== index)])
            setClassname("animate-transformt z-10")
            setTimeout(() => setClassname(""), 500)
            setLastClickedIndex(index)
        }
    }

    return (
        <div className='p-4'>
            <div className='mb-4 flex justify-around'>
                {data.map((el) => {
                    return (
                        <button key={el.id}
                            className='rounded bg-blue-500 px-4 py-2 text-white'
                            onClick={() => moveToTop(el.id)}
                        >
                            {el.name}
                        </button>
                    )
                })}

            </div>
            <div className='flex flex-col'>
                {order.map(i => (
                    <div
                        key={i}
                        className={`mb-4 border border-black p-4 ${order[0] === i && classname} `}
                    >
                        {" "}
                        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quod itaque autem
                        quae alias nam, molestiae suscipit odio doloribus aliquam, magnam labore
                        aspernatur exercitationem corporis odit nobis! Nobis consectetur quasi
                        doloremque?
                        {`Блок ${i + 1} `}
                    </div>
                ))}
            </div>
        </div>
    )
}
