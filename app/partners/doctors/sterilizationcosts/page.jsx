import Block from "@/components/Block"

export default function Sterilizationcosts() {
    return (
        <Block>
            <div className="flex justify-center py-4 h-screen">
                <div className="flex flex-col text-lg">
                    <h1 className="text-2xl font-semibold py-3">Применение готовых стерильных материалов и инструментов существенно снижает данный вид расходов.</h1>
                    <table class="table-auto ">
                        <thead>
                            <tr className="border border-b-gray-600 border-t-0 border-l-0 border-r-0">
                                <th className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 "> </th>
                                <th className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 ">Без наборов</th>
                                <th>С наборами</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="">
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 font-semibold">Закупка упаковки для стерилизации</td>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 pl-4">Требуется</td>
                                <td className="pl-4">Отсутствует</td>
                            </tr>
                            <tr>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0  font-semibold">Срок стерильности укладок</td>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 pl-4">С применением традиционных методов (например, биксов) не превышает 3-х суток</td>
                                <td className="pl-4">До 5 лет без потери стерильности содержимого</td>
                            </tr>
                            <tr>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0  font-semibold">Работа автоклава</td>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 pl-4 py-2">Ежегодное обслуживание медицинского оборудования, электроэнергия, вода, канализация</td>
                                <td className="pl-4">Использование дополнительного оборудования не требуется</td>
                            </tr>
                            <tr>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0  font-semibold">Содержание стерилизационных отделений</td>
                                <td className="border border-r-gray-600 border-t-0 border-b-0 border-l-0 pl-4">Затраты на электроэнергию, воду, зарплату персонала, обучение персонала</td>
                                <td className="pl-4">Значительное снижение нагрузки</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="py-3 font-semibold">Cтатья на стерилизацию - одна из самых затратных статей расходов в клинике.</p>
                </div>
            </div>
        </Block>

    )
}