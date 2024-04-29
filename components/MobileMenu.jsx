import Navigation from './Navigation'

export default function MobileMenu({ open }) {
    return (
        <dialog
            open={!open}
            className='absolute w-[919px] -left-[829px] top-[52px] bg-gray-100 rounded-b-3xl transition duration-300 '
        >
            <div className="flex flex-col items-center space-y-3 text-xl pt-4">
                <Navigation />
            </div>
            <div className="flex justify-center items-center space-x-2 pt-5  pb-3">
                <span className="text-sm font-semibold text-stone-400">Тел./WhatsApp:</span>
                <span className="text-lg font-semibold">+7 (495) 927-48-47</span>
            </div>
        </dialog>
    )
}
