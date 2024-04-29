import Block from "@/components/Block"

export default function Control() {
    return (
        <Block>
            <div className="flex justify-center py-4 h-screen">
                <div className="flex flex-col text-lg">
                    <h1 className="text-2xl font-semibold py-3">Упрощенный учет медицинских манипуляций, их документирование.</h1>
                    <p className="pb-1">Упаковка готового стерильного набора маркирована специальной этикеткой с указанием:</p>
                    <ul className="list-disc list-inside pb-2">
                        <li>даты изготовления,</li>
                        <li>даты стерилизации,</li>
                        <li>информации о полной идентификации МИ.</li>
                    </ul>
                    <p>Возможность создания прогнозируемой и прозрачной системы формирования расходов (при закупке/утилизации МИ)</p>
                </div>
            </div>
        </Block>
    )
}