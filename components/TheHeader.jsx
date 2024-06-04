import Link from 'next/link'
import Image from 'next/image'
import Navigation from './Navigation'

export default function TheHeader() {
    return (
        <header className="sticky top-0 z-20 bg-white sm920:bg-body_bg">
            <nav className="flex justify-center">
                <div className="flex min-h-16 max-w-[1200px] flex-1 items-center justify-between whitespace-nowrap bg-white px-6 sm920:bg-body_bg sm920:px-1">
                    <Link href="/" className="flex-none">
                        <span className="sr-only">Onestep Logo</span>
                        <Image
                            src="/logo_name.svg"
                            alt="OneStep Logo"
                            className=""
                            width={110} //140 //128 //117 //110 //105
                            height={47} //60 //55 //50 //47 //45
                            priority
                        ></Image>
                    </Link>

                    <Navigation />
                </div>
            </nav>
        </header>
    )
}
