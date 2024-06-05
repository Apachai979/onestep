import Link from "next/link"
import Image from 'next/image'

export default function TheFooter() {
    return (
        <footer className="bg-stone-200 rounded-t-3xl shadow-footer">
            <div className="container mx-auto px-4 h-auto py-4" >
                <div className="flex items-center justify-between flex-col space-y-1 md:flex-row w-auto">
                    <div className="flex-auto md:w-40 lg:w-48 mb-3 md:mb-0">
                        <Link href="/" className="flex-none">
                            <span className="sr-only">Onestep Logo</span>
                            <Image
                                src="/logo_name.svg"
                                alt="OneStep Logo"
                                className=""
                                width={110} //140 //128 //117 //110 //105
                                height={47} //60 //55 //50 //47 //45
                                priority>
                            </Image>
                        </Link>
                    </div>
                    <div className="flex-auto flex justify-center space-x-3 md:space-x-0 md:flex-col text-lg">
                        <Link href="/" className="hover:text-mainGreen focus:text-mainGreen">Главная</Link>
                        <Link href="/partners" className="hover:text-mainGreen focus:text-mainGreen">Партнерам</Link>
                        <Link href="/partners/specialist" className="hover:text-mainGreen focus:text-mainGreen">Специалисту</Link>
                        <Link href="/partners/doctors" className="hover:text-mainGreen focus:text-mainGreen whitespace-nowrap">Главному врачу</Link>
                    </div>
                    <div className="flex-auto flex justify-center space-x-3 md:space-x-0 md:flex-col text-lg">
                        <Link href="/about" className="hover:text-mainGreen focus:text-mainGreen whitespace-nowrap">О Компании</Link>
                        <Link href="/academy" className="hover:text-mainGreen focus:text-mainGreen">Академия</Link>
                        <Link href="/partners/patient" className="hover:text-mainGreen focus:text-mainGreen">Пациенту</Link>
                        <Link href="/about" className="hover:text-mainGreen focus:text-mainGreen">Отзывы</Link>
                    </div>
                    <div className="flex-auto flex justify-center space-x-3 md:space-x-0 md:flex-col text-lg">
                        <Link href="/catalogs" className="hover:text-mainGreen focus:text-mainGreen">Каталог</Link>
                        <Link href="/documents" className="hover:text-mainGreen focus:text-mainGreen">Документы</Link>
                        <Link href="/manufacture" className="hover:text-mainGreen focus:text-mainGreen">Производство</Link>
                        <Link href="/academy" className="hover:text-mainGreen focus:text-mainGreen">Вакансии</Link>
                    </div>
                    <div className="flex-auto pt-2 md:pt-0">
                        <div className="flex md:justify-center">
                            <Link href="/">
                                <svg className="fill-mainGreen w-10 h-10 hover:fill-txtGreen" viewBox="0 0 24 24">
                                    <path d="M21.579 6.855c.14-.465 0-.806-.662-.806h-2.193c-.558 0-.813.295-.953.619 0 0-1.115 2.719-2.695 4.482-.51.513-.743.675-1.021.675-.139 0-.341-.162-.341-.627V6.855c0-.558-.161-.806-.626-.806H9.642c-.348 0-.558.258-.558.504 0 .528.79.65.871 2.138v3.228c0 .707-.127.836-.407.836-.743 0-2.551-2.729-3.624-5.853-.209-.607-.42-.852-.98-.852H2.752c-.627 0-.752.295-.752.619 0 .582.743 3.462 3.461 7.271 1.812 2.601 4.363 4.011 6.687 4.011 1.393 0 1.565-.313 1.565-.853v-1.966c0-.626.133-.752.574-.752.324 0 .882.164 2.183 1.417 1.486 1.486 1.732 2.153 2.567 2.153h2.192c.626 0 .939-.313.759-.931-.197-.615-.907-1.51-1.849-2.569-.512-.604-1.277-1.254-1.51-1.579-.325-.419-.231-.604 0-.976.001.001 2.672-3.761 2.95-5.04z"></path>
                                </svg>
                            </Link>
                            <Link href="/" className="">
                                <svg className="fill-mainGreen w-10 h-10 hover:fill-txtGreen" viewBox="0 0 24 24">
                                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"></path>
                                </svg>
                            </Link>
                            <Link href="/">
                                <svg className="fill-mainGreen w-10 h-10 hover:fill-txtGreen" viewBox="0 0 24 24">
                                    <path d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.027 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112s-.58.729-.711.879-.262.168-.486.056-.947-.349-1.804-1.113c-.667-.595-1.117-1.329-1.248-1.554s-.014-.346.099-.458c.101-.1.224-.262.336-.393.112-.131.149-.224.224-.374s.038-.281-.019-.393c-.056-.113-.505-1.217-.692-1.666-.181-.435-.366-.377-.504-.383a9.65 9.65 0 0 0-.429-.008.826.826 0 0 0-.599.28c-.206.225-.785.767-.785 1.871s.804 2.171.916 2.321c.112.15 1.582 2.415 3.832 3.387.536.231.954.369 1.279.473.537.171 1.026.146 1.413.089.431-.064 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.067-.056-.094-.207-.151-.43-.263"></path>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

        </footer >
    )
}