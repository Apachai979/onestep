"use client"
import Link from "next/link"
import { useState } from "react"
import "./academy.css"
// const neosets = [
//     { name: 'Набор для снятия швов', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для снятия швов.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-snyatiya-shvov' },
//     { name: 'Набор для обработки ран', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции и обработки ран.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-obrabotki-ran' },
//     { name: 'Набор для забора донорской крови', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции области руки и наложения повязки при процедуре забора донорской крови.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-zabora-donorskoj-krovi' },
//     { name: 'Набор для забора крови из вены', description: 'Готовый к использованию стерильный набор перевязочных материалов, предназначенный для наложения повязки при процедуре забора крови из вены.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-zabora-krovi-iz-veny' },
//     { name: 'Набор для катетеризации мочевого пузыря', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции процедурной области и безопасной постановки катетера мочевого пузыря.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-kateterizacii-mochevogo-puzyrya' },
//     { name: 'Набор для катетеризации центральных вен', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции процедурной области и безопасной постановки центрального венозного катетера.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-kateterizacii-centralnyh-ven' },
//     { name: 'Набор для локальной анестезии', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции процедурной области и безопасного выполнения локальной анестезии.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-lokalnoj-anestezii' },
//     { name: 'Набор для гемодиализа', description: 'Готовый к использованию стерильный набор инструментов и перевязочных материалов, предназначенный для дезинфекции процедурной области и безопасного выполнения гемодиализа.', srcImg: '/catalog/aneste.jpg', pathname: 'dlya-gemodializa' },
// ]

export default function Academy() {
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
                <button
                    className='rounded bg-blue-500 px-4 py-2 text-white'
                    onClick={() => moveToTop(0)}
                >
                    МЕНЕДЖМЕНТ КАЧЕСТВА
                </button>
                <button
                    className='rounded bg-blue-500 px-4 py-2 text-white'
                    onClick={() => moveToTop(1)}
                >
                    МЕДСЕСТРЕ
                </button>
                <button
                    className='rounded bg-blue-500 px-4 py-2 text-white'
                    onClick={() => moveToTop(2)}
                >
                    ПАЦИЕНТУ
                </button>
                <button
                    className='rounded bg-blue-500 px-4 py-2 text-white'
                    onClick={() => moveToTop(3)}
                >
                    МИРОВОЙ ОПЫТ
                </button>
                <button
                    className='rounded bg-blue-500 px-4 py-2 text-white'
                    onClick={() => moveToTop(4)}
                >
                    НОВОЕ В НАУКЕ И ТЕХНИКЕ
                </button>
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
