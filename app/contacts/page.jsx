import FormContact from "@/components/FormContact"

export const metadata = {
    title: "Контакты",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

export default function Contacts() {
    return (
        <div className='container mx-auto px-4'>
            <h1 className='py-6 text-3xl font-semibold text-center'>Контакты</h1>
            <div className="flex justify-center">
                <div className='flex flex-col sm:grid sm:grid-cols-2 sm:max-w-[1200px] sm:gap-10 justify-center items-center '>
                    <div className='flex flex-col space-y-6 rounded-3xl border border-stone-300 bg-body_bg p-8 text-xl sm:place-self-start sm:justify-self-stretch sm:text-right sm:mt-4'>
                        <div className='space-y-2 '>
                            <p className='text-stone-400'>Адрес производства:</p>
                            <p className=''>
                                634015, Томская область, г. Томск, <br />
                                ул. Циолковского, 19/1, пом. 24.
                            </p>
                        </div>
                        <div>
                            <p>+7 (495) 231-01-11</p>
                            <p>+7 (985) 231-01-11</p>
                        </div>

                        <p className='text-base text-primary_green'>
                            {" "}
                            <a href='mailto:info@onestep.su'>info@onestep.su</a>
                        </p>
                    </div>

                    <FormContact />
                    <div className="m-3"></div>
                    {/* <Test /> */}
                </div>
            </div>
        </div>
    )
}
