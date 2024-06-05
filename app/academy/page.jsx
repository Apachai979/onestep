'use client'
import Link from "next/link"
import { useState } from "react"
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
    const [state, setState] = useState()
    const bubbleFunc = () => {

    }

    return (
        <div className="container mx-auto px-4 h-screen">
            <div className="flex justify-center items-center">
                <Link href="#"><div className="bg-gray-300 px-10 py-2 m-2 text-center">красный</div></Link>
                <Link href="#"><div className="bg-gray-300 p-10 py-2 m-2 text-center">красный</div></Link>
                <Link href="#"><div className="bg-gray-300 p-10 py-2 m-2 text-center">красный</div></Link>
            </div>
            <div className=" space-y-10">
                <div className="w-full h-96 bg-red-400"></div>
                <div className="w-full h-96 bg-blue-400"></div>
                <div className="w-full h-96 bg-green-400"></div>
            </div>
        </div>
    )
}