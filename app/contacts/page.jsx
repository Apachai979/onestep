import FormContact from "@/components/FormContact"

export const metadata = {
    title: "Контакты",
    description:
        "Российский производитель медицинских одноразовых перевязочных материалов и процедурных стерильных наборов",
}

export default function Contacts() {
    return (
        <div className='container mx-auto px-4'>
            <div className='flex flex-col items-center'>
                <h1 className='flex py-6 text-3xl font-semibold'>Контакты</h1>
                <div className='flex-col-2 flex space-x-10'>
                    <div className='flex flex-col space-y-6 rounded-3xl border border-stone-300 bg-body_bg p-8 text-xl'>
                        <div className='space-y-2'>
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
                    {/* <Test /> */}
                </div>
            </div>
        </div>
    )
}
