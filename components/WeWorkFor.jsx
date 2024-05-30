import Link from "next/link"
import Image from "next/image"

export default function WeWorkFor() {
    return (
        <div className='container mx-auto px-4 flex justify-center my-16'>
            <div className='hidden lg:flex lg:shrink xl:w-[1200px] bg-center bg-mainGreen w-[1000px] h-[600px] rounded-3xl overflow-hidden relative drop-shadow-lg inset-0'>
                <h1 className='absolute m-4 top-20 left-14 text-white text-5xl font-semibold z-10 cursor-context-menu'>Для кого <br /> мы работаем</h1>
                <Link href="/partners/specialist" className=' '>
                    <Image
                        src="/home/photo1.png"
                        alt="Neoset"
                        className="absolute right-[100px] -top-3 xl:right-[122px] xl:-top-16 object-cover object-center rotate-45 origin-center drop-shadow-lg w-[270px] h-[270px] xl:w-[350px] xl:h-[350px] hover:scale-110 transition-all duration-300 z-30"
                        width={1280}
                        height={720}>
                    </Image>
                </Link>
                <Link href="/partners/doctors">
                    <Image
                        src="/home/photo2.png"
                        alt="Neoset"
                        className="absolute top-[200px] left-[440px] xl:top-[200px] xl:left-[500px] object-cover object-center rotate-45 origin-center drop-shadow-lg w-[240px] h-[240px] xl:w-[270px] xl:h-[270px] hover:scale-110 transition-all duration-300 z-30 hover:drop-shadow-2xl"
                        width={1280}
                        height={720}>
                    </Image>
                </Link>
                <Link href="/partners">
                    <Image
                        src="/home/photo3.png"
                        alt="Neoset"
                        className="absolute right-[180px] -bottom-[70px] xl:right-[210px] xl:-bottom-[85px] object-cover object-center rotate-45 origin-center drop-shadow-lg w-[230px] h-[230px] xl:w-[270px] xl:h-[270px] hover:scale-110 transition-all duration-300 z-30 hover:drop-shadow-2xl"
                        width={1280}
                        height={720}>
                    </Image>
                </Link>
                <Link href="/partners/patient">
                    <Image
                        src="/home/photo4.png"
                        alt="Neoset"
                        className="absolute left-[250px] -bottom-[28px] xl:left-[285px] xl:-bottom-[95px] object-cover object-center rotate-45 origin-center drop-shadow-lg w-[240px] h-[240px] xl:w-[270px] xl:h-[270px] hover:scale-110 transition-all duration-300 z-30 hover:drop-shadow-2xl"
                        width={1280}
                        height={720}>
                    </Image>
                </Link>
                <Image
                    src="/home/right.png"
                    alt="Neoset"
                    className="absolute -right-[10px] -bottom-[10px] object-cover object-center origin-center drop-shadow-sm w-[250px] h-[480px] hover:scale-110 transition-transform duration-300"
                    width={1280}
                    height={720}>
                </Image>
                <Image
                    src="/home/top.png"
                    alt="Neoset"
                    className=" group/item absolute -left-4 -top-2 object-cover object-center origin-center drop-shadow-sm w-[660px] h-[430px]"
                    width={1280}
                    height={720}>
                </Image>
                <Image
                    src="/home/left.png"
                    alt="Neoset"
                    className="absolute left-0 -bottom-4 object-cover object-center origin-center drop-shadow-sm w-[122px] h-[310px] hover:scale-110 transition-transform duration-300"
                    width={1280}
                    height={720}>
                </Image>
            </div>
            <div className='flex flex-col w-full pt-3 pb-5 px-5 justify-center items-center bg-mainGreen rounded-2xl lg:hidden'>
                <h1 className='text-2xl text-white font-semibold text-center tracking-wide pb-3'>Для кого мы работаем</h1>
                <div className='grid md:grid-cols-4 grid-cols gap-2 w-full'>
                    <Link href='/partners/specialist' className="flex justify-center bg-backMiddle px-8 py-2.5 text-white tracking-wide text-xl rounded-2xl hover:bg-white hover:text-txtGreen transition duration-300 ease-in-out active:scale-95 ">Специалист</Link>
                    <Link href='/partners/doctors' className="flex justify-center bg-backMiddle px-8 py-2.5 text-white tracking-wide text-xl rounded-2xl hover:bg-white hover:text-txtGreen whitespace-nowrap transition duration-300 ease-in-out active:scale-95">Главный врач</Link>
                    <Link href='/partners/patient' className="flex justify-center bg-backMiddle px-8 py-2.5 text-white tracking-wide text-xl rounded-2xl hover:bg-white hover:text-txtGreen transition duration-300 ease-in-out active:scale-95">Пациент</Link>
                    <Link href='/partners' className="flex justify-center bg-backMiddle px-8 py-2.5 text-white tracking-wide text-xl rounded-2xl hover:bg-white hover:text-txtGreen transition duration-300 ease-in-out active:scale-95">Партнер</Link>
                </div>
            </div>
        </div>
    )
}