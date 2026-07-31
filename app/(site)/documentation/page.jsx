import Link from "next/link"
import ConnectUs from "@/components/ConnectUs"

export const metadata = {
    title: "Документы",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

const permitDocs = [
    {
        href: "/files/Certificate_ISO_9001.jpg",
        label: "Сертификат соответствия ISO 9001:2015",
    },
    {
        href: "/files/Certificate_ISO_13485.jpeg",
        label: "Сертификат соответствия ISO 13485-2017",
    },
    {
        href: "/files/hemodialysis/RC_hemodialysis.pdf",
        label: "Регистрационное удостоверение гемодиализ",
    },
    {
        href: "/files/registration_certificate.pdf",
        label: "Регистрационное удостоверение наборы общехирургические",
    },
]

const otherDocs = [
    {
        href: "/files/Law_of_the_Russian_Federation_N_323-ФЗ.docx",
        label: "ФЗ от 21.11.2011 N 323-ФЗ (ред. от 28.12.2022) «Об основах охраны здоровья граждан в Российской Федерации»",
    },
    {
        href: "/files/Order_of_the_Ministry_of_Health_of_Russia_N_919n.pdf",
        label: "Приказ Минздрава России от 15.11.2012 N 919н (ред. от 14.09.2018) «Об утверждении Порядка оказания медицинской помощи взрослому населению по профилю „анестезиология и реаниматология“»",
    },
]

function fileType(href) {
    const ext = href.split(".").pop().toLowerCase()
    return ext === "jpeg" ? "JPG" : ext.toUpperCase()
}

function DocList({ documents }) {
    return (
        <ul className='mt-4 space-y-3'>
            {documents.map(doc => (
                <li key={doc.href} className='flex items-start gap-3'>
                    <span className='mt-1 shrink-0 rounded bg-brand_soft/40 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-txtGreen/70'>
                        {fileType(doc.href)}
                    </span>
                    <Link
                        href={doc.href}
                        className='text-lg font-medium leading-snug text-mainGreen hover:text-txtGreen'
                    >
                        {doc.label}
                    </Link>
                </li>
            ))}
        </ul>
    )
}

export default function Documentation() {
    return (
        <>
            <div className='container mx-auto max-w-[1200px] px-4'>
                <h1 className='my-4 text-3xl font-semibold text-txtGreen sm:my-10 sm:text-4xl lg:mx-10'>
                    Документы
                </h1>

                <div className='mt-5 rounded-2xl bg-white px-6 pb-6 pt-4 sm:mt-10 sm:px-10 lg:mx-10'>
                    <h2 className='text-2xl font-semibold text-txtGreen sm:text-3xl'>
                        Разрешительные документы
                    </h2>
                    <DocList documents={permitDocs} />
                </div>

                <div className='mt-5 rounded-2xl bg-white px-6 pb-6 pt-4 sm:mt-10 sm:px-10 lg:mx-10'>
                    <h2 className='text-2xl font-semibold text-txtGreen sm:text-3xl'>Разное</h2>
                    <DocList documents={otherDocs} />
                </div>
            </div>

            <div className='mt-10 sm:mt-16'>
                <ConnectUs
                    title='Мы готовы обсудить возникшие вопросы'
                    txtbutton='Связаться со специалистом'
                />
            </div>
        </>
    )
}
