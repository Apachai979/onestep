import Link from "next/link"
import Image from "next/image"

export default function TellaSoft() {

    const tellasoft = [
        { name: 'Марлевые салфетки TellaLux', srcImg: '/catalog/blood.jpg', href: 'marlevye-salfetki-tellalux' },
        { name: 'Марлевые тампоны SoftLux', srcImg: '/catalog/blood.jpg', href: 'marlevye-tampony-softlux' },
        { name: 'Марлевые тампоны SoftLux с рентгенконтрастной нитью', srcImg: '/catalog/blood.jpg', href: 'marlevye-tampony-softlux-s-xray' },
    ]

    return (
        <>
            {tellasoft.map((product) => (
                <Link key={product.name} href={`/catalogs/${product.href}`}>
                    <div className="flex-initial w-[265px] group">
                        <Image
                            src={product.srcImg}
                            alt="Neoset"
                            className="object-cover object-center rounded-2xl h-[170px] shadow-md  transition duration-300 group-hover:shadow-stone-300 group-hover:-translate-y-3 group-hover:scale-105"
                            width={1280}
                            height={720}
                            priority>
                        </Image>
                        <h3 className='text-mainGreen text-xl font-semibold text-center transition duration-300 group-hover:text-txtGreen group-hover:-translate-y-1'>{product.name}</h3>
                    </div>
                </Link>
            ))
            }
        </>
    )
}