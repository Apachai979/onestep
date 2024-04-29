import Link from "next/link"
import Image from "next/image"
import Navigation from "./Navigation"

export default function TheHeader() {

    console.log('Render')

    return (
        <header className="sticky top-0 sm920:bg-body_bg z-20 bg-white">
            <nav className="flex justify-center">
                <div className=" px-6 sm920:px-1 flex flex-1 justify-between max-w-[1200px] items-center  min-h-16 whitespace-nowrap sm920:bg-body_bg bg-white ">

                    <Link href="/" className="flex-none">
                        <span className="sr-only">Onestep Logo</span>
                        <Image
                            src="/logoOneStep.png"
                            alt="OneStep Logo"
                            className=""
                            width={110} //140 //128 //117 //110 //105
                            height={47} //60 //55 //50 //47 //45
                            priority>
                        </Image>
                    </Link>

                    <div className="sm920:hidden block">
                        {/* <button
                            onClick={() => setIsActive(prev => !prev)}
                            className="relative w-[50px] p-1 h-[40px] group cursor-pointer"
                        >
                            <AnimationMenuButton isActive={isActive} />
                        </button> */}
                    </div>
                    {/* xl:px-8 px-4  */}

                    <Navigation />


                </div>
            </nav>
        </header>
    )
}