import Block from "@/components/Block"

export default function Fallcost() {
    return (

        <Block>
            <div className="flex justify-center py-4 h-screen">
                <div className="flex flex-col text-lg">
                    <h1 className="text-2xl font-semibold py-3">Затраты времени на примере процедуры обработки ран: </h1>
                    <p className="py-1">Готовые процедурные наборы исключают лишние действия и функции, позволяя медицинскому персоналу сосредоточиться на другой, более важной работе.</p>
                    <p className="py-1">Кроме того, немаловажно, что для большинства процедур, выполняемых с применением наборов, не требуется помощник (ассистент).</p>
                    <p className="py-1">Сравним примерное затрачиваемое время на подготовку к такой распространенной процедуре, как обработка ран.</p>
                    <p className="font-semibold pt-3">Без набора:</p>
                    <ul>
                        <li>промывка лотков в холодной воде — 60 минут,</li>
                        <li>дезинфекция — 45 минут,</li>
                        <li>укладка инструментария — 15 минут,</li>
                        <li>стерилизация — 40 минут,</li>
                        <li>подготовка манипуляционного стола — 15 мин.</li>
                        <li className="font-semibold px-2">Итого: 2 часа 55 минут</li>
                    </ul>
                    <p className="font-semibold pt-3">С набором:</p>
                    <ul>
                        <li>Подготовка набора — 1 минута,</li>
                        <li>Вскрытие набора — 30 секунд.</li>
                        <li className="font-semibold px-2">Итого: 1,5 минуты</li>
                    </ul>

                    <p className="font-semibold py-4 text-xl"> Результат очевиден.</p>

                </div>
            </div>
        </Block>

    )
}