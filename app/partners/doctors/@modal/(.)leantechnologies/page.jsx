import Modal from "@/components/Modal";

export default function Leantechnologies() {
    return (
        <Modal>
            <div className="flex flex-col md:text-md text-sm ">
                <h1 className="text-xl md:text-2xl font-semibold pb-3">Реализация принципов <span className="text-nowrap">Бережливой <span className="text-primary_green">(Lean)</span>-медицины</span> <br />с наборами NeoSet</h1>
                <p className="py-1">
                    Концепция Бережливого производства в медицине - это способ оптимизации рабочего пространства для медицинского персонала, помогающий ускорить процесс работы с пациентами и улучшающий качество обслуживания. Данный подход направлен на облегчение работы врачей, медицинских сестер, младшего медицинского персонала.
                </p>
                <p className="py-1 font-semibold">
                    Бережливое производство базируется на принципах 5С:
                </p>
                <ul className="list-disc list-inside">
                    <li>сортировка (убираем лишнее);</li>
                    <li>соблюдение порядка, аккуратность;</li>
                    <li>содержание в чистоте;</li>
                    <li>стандартизация - установление норм и правил;</li>
                    <li>совершенствование - самодисциплина.</li>
                </ul>
                <p className="pb-1 font-semibold">Использование одноразовых стерильных готовых к применению наборов NeoSet полностью отвечает данным принципам.</p>
                <p className="py-1 font-semibold">Применяя готовые стерильные наборы, вы получаете:</p>
                <ul className="list-disc list-inside">
                    <li>оптимизацию медицинских процессов в подразделении (исключение лишних действий, избыточных функций и процедур);</li>
                    <li>создание благоприятной производственной среды (быстрота, порядок, стандартизация, комфорт применения);</li>
                    <li>устранение потерь и сокращение затрат (отсутствие лишних материалов и инструментов, максимальное соответствие комплектации наборов объему процедуры);</li>
                    <li>возрастание пациентоориентированности оказания медицинских услуг: качество, безопасность, комфорт очевидны пациенту.</li>
                </ul>

            </div>
        </Modal>
    )
}