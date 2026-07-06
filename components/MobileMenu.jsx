import Navigation from "./Navigation"

export default function MobileMenu({ open }) {
    return (
        <dialog
            open={!open}
            className='absolute -left-[829px] top-[52px] w-[919px] rounded-b-3xl bg-gray-100 transition duration-300'
        >
            <div className='flex flex-col items-center space-y-3 pt-4 text-xl'>
                <Navigation />
            </div>
            <div className='flex items-center justify-center space-x-2 pb-3 pt-5'>
                <span className='text-sm font-semibold text-stone-400'>info@onestep.su</span>
                <span className='text-lg font-semibold'>+7 (495) 927-48-47</span>
            </div>
        </dialog>
    )
}
