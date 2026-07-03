import FormContact from "@/components/FormContact"

export const metadata = {
    title: "Обратная связь",
    description:
        "Задайте вопрос специалисту OneStep — мы свяжемся с вами в ближайшее время",
}

export default function FeedbackForm() {
    return (
        <div className='container mx-auto flex justify-center px-4 py-12'>
            <div className='w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8'>
                <FormContact titleForForm='Задать вопрос специалисту:' />
            </div>
        </div>
    )
}
