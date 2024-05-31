import Link from "next/link";
import Image from "next/image";
import Carousel from "@/components/Carousel";
import WeWorkFor from "@/components/WeWorkFor";
import ConnectWithUs from "@/components/ConnectWithUs";
import AuthComponent from "@/components/AuthComponent";

export const metadata = {
  title: 'Компания OneStep',
  description: 'Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов',
}

export default function Home() {


  return (
    <>
      <AuthComponent />
      <Carousel />

      {/* nextblock */}

      <h1 className='text-night_green text-3xl font-semibold text-center my-14 mx'>OneStep — <span className='text-primary_green'> российский производитель медицинских <br /> одноразовых перевязочных материалов и процедурных <br />стерильных наборов</span></h1>

      {/* nextblock */}
      <div className='container mx-auto px-4'>

        {/* <div className='grid lg:grid-cols-2 place-items-center gap-y-8 xl:mx-28 2xl:mx-60 '> */}
        <div className="flex justify-center">
          <div className="grid lg:grid-cols-2 lg:gap-12 gap-10 ">
            <div className='bg-white w-[460px] h-[350px] rounded-2xl overflow-hidden relative cursor-pointer drop-shadow-md'>
              <div className='bg-white absolute z-20 transition-opacity hover:opacity-0'>
                <Image
                  src="/home/img1.jpg"
                  alt="Neoset"
                  className="object-cover object-bottom  w-[460px] h-[250px]"
                  width={1280}
                  height={720}
                  priority>
                </Image>
                <h2 className='text-night_green text-2xl font-semibold text-center my-8'>Мировые стандарты качества</h2>
              </div>
              <ul className='list-disc list-inside text-txtMiddle text-xl font-semibold m-10 leading-relaxed absolute inset-0 z-10'>
                <li>контроль качества на всех этапах производства</li>
                <li>имеется сертификат соответствия требованиям ГОСТ Р ИСО 9001-2015 (ISO-9001:2015)</li>
                <li>лучшие поставщики комплектующих</li>
              </ul>
            </div>
            <div className='bg-white w-[460px] h-[350px] rounded-2xl overflow-hidden relative cursor-pointer drop-shadow-md'>
              <div className='bg-white absolute z-20 hover:opacity-0 transition-opacity duration-500'>
                <Image
                  src="/home/img4.jpg"
                  alt="Neoset"
                  className="object-cover object-bottom  w-[460px] h-[250px]"
                  width={1280}
                  height={720}
                  priority>
                </Image>
                <h2 className='text-night_green text-2xl font-semibold text-center my-8'>Удобство и функциональность</h2>
              </div>
              <ul className='list-disc list-inside text-txtMiddle text-xl font-semibold m-10 leading-relaxed absolute inset-0 z-10'>
                <li className='list-none pb-3 -mt-5'>Наши наборы:</li>
                <li>готовы к применению</li>
                <li>оптимальны по составу</li>
                <li>эргономика укладки соответствует стандарту операционных процедур</li>
                <li>упаковка совмещена с контейнером для дезсредства</li>
              </ul>
            </div>
            <div className='bg-white w-[460px] h-[350px] rounded-2xl overflow-hidden relative cursor-pointer drop-shadow-md'>
              <div className='bg-white absolute z-20 hover:opacity-0 transition-opacity duration-500'>
                <Image
                  src="/home/img3.jpg"
                  alt="Neoset"
                  className="object-cover object-bottom  w-[460px] h-[250px]"
                  width={1280}
                  height={720}
                  priority>
                </Image>
                <h2 className='text-night_green text-2xl font-semibold text-center my-8'>Безопасность и надежность</h2>
              </div>
              <ul className='list-disc list-inside text-txtMiddle text-xl font-semibold m-10 leading-relaxed absolute inset-0 z-10'>
                <li>100% -я стерильность</li>
                <li>гарантия защиты от внутрибольничных инфекций</li>
                <li>прочная несминаемая упаковка</li>
              </ul>
            </div>
            <div className='bg-white w-[460px] h-[350px] rounded-2xl overflow-hidden relative cursor-pointer drop-shadow-md'>
              <div className='bg-white absolute z-20 hover:opacity-0 transition-opacity duration-500'>
                <Image
                  src="/home/img2.jpg"
                  alt="Neoset"
                  className="object-cover object-bottom  w-[460px] h-[250px]"
                  width={1280}
                  height={720}
                  priority>
                </Image>
                <h2 className='text-night_green text-2xl font-semibold text-center my-8'>Экономия времени и средств</h2>
              </div>
              <ul className='list-disc list-inside text-txtMiddle text-xl font-semibold m-10 leading-relaxed absolute inset-0 z-10'>
                <li className='list-none pb-3 -mt-5'>Использование наших наборов позволит:</li>
                <li>сократить время подготовки к процедуре на 30%</li>
                <li>уменьшить количество и трудозатраты персонала</li>
                <li>повысить эффективность оказания помощи пациенту</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* nextblock */}

      <WeWorkFor />

      {/* nextblock */}

      <div className='container mx-auto px-4 flex justify-center'>

        <div className="bg-white drop-shadow-lg rounded-3xl flex flex-col space-y-5 lg:space-y-0 lg:flex-row justify-center items-center p-14 w-[1000px] lg:shrink xl:w-[1200px]">
          <div className="flex-1 flex justify-center">
            <Image
              src="/home/worldexp.png"
              alt="Neoset"
              className="rounded-3xl object-cover object-center w-[330px] h-[330px]"
              width={1280}
              height={720}>
            </Image>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center space-y-5">
            <h2 className='text-2xl text-justify lg:text-left font-semibold text-txtGreen'>Мы опирались на <span className='text-mainGreen'>лучший мировой опыт</span> производства медицинских изделий и <span className='text-mainGreen'>заложили основные принципы качества</span> и <span className='text-mainGreen'>удобства использования</span>. Так появился OneStep.</h2>
            <Link href="/about" className="w-96 text-center border-[3px] border-mainGreen bg-white px-8 py-3 rounded-full text-mainGreen hover:text-white hover:bg-mainGreen text-2xl transition duration-300">Подробнее компании</Link>
          </div>
        </div>
      </div>

      {/* nextblock */}
      <div className='bg-white drop-shadow-sm'>
        <div className="container mx-auto px-4">
          <div className="my-10 py-10 flex flex-col justify-center items-center">
            <h1 className='lg:indent-96 text-3xl text-center lg:text-4xl font-semibold text-txtMiddle/50 '>Мы оказываем поддержку <span className='text-mainGreen'>гемодиализным центрам</span> Западной Сибири и проектам в области медицинского образования
              <svg fill="none" viewBox="0 0 24 24" className="w-12 h-12 stroke-1 stroke-txtGreen/30 inline fill-mainGreen hover:scale-125 transition-transform duration-700 cursor-pointer">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </h1>
            <Link href="/about" className='mt-4 lg:self-end text-center border-[3px] border-mainGreen bg-white px-10 py-3 rounded-full text-mainGreen hover:text-white hover:bg-mainGreen text-2xl transition duration-300'>Подробнее</Link>
          </div>
        </div>
      </div >

      {/* nextblock */}

      <div className='container mx-auto px-4 my-5'>
        <h1 className='text-center text-4xl font-semibold text-mainGreen mb-5'>Наши <span className='text-txtGreen'>партнеры</span></h1>
        <div className='flex justify-center items-center lg:divide-x'>
          <div className='flex items-center justify-center w-[300px] h-[112px]'>
            <Image
              src="/home/partners/partner1.jpeg"
              alt="НИИ Кардиологии"
              className="object-cover object-center w-auto h-auto"
              width={160}
              height={70}>
            </Image>
          </div>
          <div className='flex items-center justify-center w-[300px] h-[112px]'>
            <Image
              src="/home/partners/partner2.png"
              alt="НИИ Кардиологии"
              className="object-cover object-center w-auto h-auto"
              width={160}
              height={70}>
            </Image>
          </div>
          <div className='flex items-center justify-center w-[300px] h-[112px]'>
            <Image
              src="/home/partners/partner3.jpeg"
              alt="НИИ Кардиологии"
              className="object-cover object-center w-auto h-auto"
              width={160}
              height={70}>
            </Image>
          </div>
          <div className='flex items-center justify-center w-[300px] h-[112px]'>
            <Image
              src="/home/partners/partner4.png"
              alt="НИИ Кардиологии"
              className="object-cover object-center w-auto h-auto"
              width={160}
              height={70}>
            </Image>
          </div>
        </div>
      </div>

      {/* nextblock */}

      <ConnectWithUs title="Наш специалист ответит на ваши вопросы!" titleForForm="Задать вопрос специалисту:" textButton="Связаться с нами" />

    </>
  );
}
