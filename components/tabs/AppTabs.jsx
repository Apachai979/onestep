import Link from "next/link";
import Image from "next/image"
import Block from '../Block';
import { Tabs, Tab } from './Tabs';

export default function AppTabs() {
    return (
        <Block>
            <h1 className='text-3xl indent-10'><span className='text-primary_green'>СОПы:</span> как упростить задачу?</h1>
            <div>
                <Tabs>
                    <Tab label="СОПы">
                        <div className="py-4 text-lg md:block  flex flex-col items-center lg:flex lg:flex-row">
                            <Image
                                src="/doctors/specialist/docs.png"
                                alt="Neoset"
                                className="object-cover rounded-2xl shadow-sm w-96 float-left mr-7"
                                width={1280}
                                height={720}>
                            </Image>
                            <p className="text-gray-700">
                                <span className='font-semibold'>
                                    СОПы для медицинских организаций - это</span> документально оформленные инструкции и алгоритмы по выполнению рабочих процедур медицинским персоналом. Может возникнуть <span className='text-primary_green'>вопрос</span>: зачем нужны СОПы, когда есть ГОСТы сестринских манипуляций? <span className='text-primary_green'>Ответ</span>: не все вмешательства описаны в ГОСТах, а этапы процедур отличаются в разных больницах.
                            </p>
                        </div>
                    </Tab>
                    <Tab label="Обязательны ли СОПы?">
                        <div className="py-4 text-lg">
                            <h2 className="text-xl font-medium mb-2">Обязательны ли СОПы?</h2>
                            <p className="text-gray-700">
                                С 1 сентября 2021 г. Роспотребнадзор утвердил обязательные требования для медорганизаций о внедрении СОПов. Согласно СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней» (далее — СанПиН 3.3686-21), во всех медорганизациях должны появиться стандартные операционные процедуры — СОПы для медицинских манипуляций, которые имеют эпидемиологическое значение. Это требование закреплено в п. 3429 главы XLIV «Профилактика инфекций, связанных с оказанием медицинской помощи» СанПиН 3.3686-21.
                            </p>
                            <p className='pt-3'><span className='font-semibold'> Они необходимы для оценки качества медицинской помощи, а также для защиты прав пациента и врача при разрешении спорных вопросов.</span> Основная цель такой системы – сделать лечение пациентов эффективным и безопасным. Если у персонала нет четких инструкций, он чаще допускает профессиональные ошибки.</p>
                        </div>
                    </Tab>
                    <Tab label="Перечень основных СОПов">
                        <div className="py-4 text-lg">
                            <h2 className="text-xl font-medium ">Какие СОПы должны быть обязательно?</h2>
                            <p className="text-gray-700 text-sm pb-3">
                                Перечень СОПов зависит от того, какие медицинские услуги оказывает клиника, каков ее профиль.
                            </p>
                            <p className='pb-1'>Стандартный перечень для стационара включает СОПы следующих манипуляций:</p>
                            <ul className='list-disc list-inside'>
                                <li>катетеризация периферических сосудов;</li>
                                <li>катетеризация центральных сосудов;</li>
                                <li>катетеризация мочевого пузыря;</li>
                                <li>проведение искусственной вентиляции легких;</li>
                                <li>бесконтактные перевязки;</li>
                                <li>внутримышечные, внутривенные и другие виды инъекций;</li>
                                <li>проведение инфузии и гемотрансфузии;</li>
                                <li>забор венозной крови;</li>
                                <li>забор капиллярной крови;</li>
                                <li>обработка эндоскопов;</li>
                                <li>гигиеническая обработка рук;</li>
                                <li>обработка рук хирургов;</li>
                                <li>обработка операционного поля;</li>
                                <li>оказание неотложной помощи</li>
                            </ul>
                            <p className='pt-3'>Для облегчения работы медицинского персонала, ответственного за составление СОПов, мы разработали некоторые шаблонные варианты, учитывающие применение наборов NeoSet. Взять их в работу вы можете в нашей Академии OneStep, в разделе <Link href='/' className='text-primary_green'> "Менеджмент качества медицинской организации"</Link>.</p>
                        </div>
                    </Tab>
                    <Tab label="Нормативные документы">
                        <div className="py-4 text-lg">
                            <h2 className="text-xl font-medium mb-2">Нормативные документы</h2>
                            <p className="text-gray-700 pb-3">
                                При разработке алгоритмов должны учитываться действующие стандарты, включающие ГОСТы, клинические рекомендации, санитарно-эпидемиологические правила.
                            </p>
                            <p className='pb-3'>Их список можно посмотреть в разделе <Link href='/' className='text-primary_green'>Академия</Link></p>
                            <p className='pb-3'>Также в основе СОПов должны содержаться рекомендации по применению медицинских средств, инструкции по эксплуатации медицинских изделий и техники.</p>
                            <p>Например, при разработке СОПа на послеоперационную обработку ран пациента с использованием набора NeoSet используют инструкцию <Link href='/catalogs/dlya-obrabotki-ran' className='text-primary_green'>"Набора NeoSet для обработки ран"</Link>, при разработке СОПов на катетеризацию центральных вен — инструкции по эксплуатации <Link href='/catalogs/dlya-kateterizacii-centralnyh-ven' className='text-primary_green'>"Набора NeoSet для катетеризации центральных вен"</Link>.</p>
                            <Link href='/'>
                                <div className="text-primary_green bg-white border-2 border-primary_green px-8 py-3 rounded-full ml-10 w-80 text-center mt-2 hover:text-white hover:bg-primary_green transition duration-300 active:shadow-inner active:bg-contrast_green active:shadow-gray-600/50">
                                    Нормативыне документы
                                </div>
                            </Link>
                        </div>
                    </Tab>
                </Tabs>
            </div>
        </Block>
    );
};
