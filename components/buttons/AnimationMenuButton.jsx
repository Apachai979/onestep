import { memo } from "react";

export default memo(function ButtonMenu({ isActive }) {
    console.log('Render ButtonMenu')
    return (
        <>

            <div
                className={
                    isActive
                        ? 'absolute top-1 flex flex-col transition duration-300 group opacity-1'
                        : 'absolute top-1 flex flex-col transition duration-300 group opacity-0'
                }
            >
                <div
                    className={
                        isActive
                            ? 'absolute w-[42px] h-[4px] bg-primary_green group-hover:translate-y-1 transition duration-500  delay-200'
                            : 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 translate-y-3.5 '
                    }
                ></div>
                <div className="absolute top-[14px] w-[42px] h-[4px] bg-primary_green"></div>
                <div
                    className={
                        isActive
                            ? 'absolute top-[28px] w-[42px] h-[4px] bg-primary_green group-hover:-translate-y-1 transition duration-500 delay-200 after:bg-red-500'
                            : 'absolute top-[28px] w-[42px] h-[4px] bg-primary_green transition duration-500 -translate-y-3.5'
                    }
                ></div>
            </div>
            {/* <div className={
                    isActive
                        ? "absolute top-1 flex flex-col space-y-2.5 transition duration-300 group opacity-0"
                        : "absolute top-1 flex flex-col space-y-2.5 transition duration-300 group opacity-0"}
                >
                    <div
                        className={
                            isActive
                                ? 'w-[42px] h-[4px] bg-primary_green group-hover:translate-y-0.5 transition duration-500  '
                                : 'w-[42px] h-[4px] bg-primary_green transition duration-500 translate-y-3.5 '
                        }
                    ></div>
                    <div className="w-[42px] h-[4px] bg-primary_green"></div>
                    <div
                        className={
                            isActive
                                ? 'w-[42px] h-[4px] bg-primary_green group-hover:-translate-y-0.5 transition duration-500 '
                                : 'w-[42px] h-[4px] bg-primary_green transition duration-500 -translate-y-3.5'
                        }
                    ></div>
                </div > */}
            <div
                className={
                    isActive
                        ? 'absolute top-[18px] transition duration-150 group opacity-0'
                        : 'absolute top-[18px] transition duration-150 group opacity-1'
                }
            >
                <div
                    className={
                        isActive
                            ? 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500'
                            : 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 -rotate-45 delay-150'
                    }
                ></div>
                <div
                    className={
                        isActive
                            ? 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500'
                            : 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 rotate-45 delay-150'
                    }
                ></div>
            </div>
            <div
                className={
                    isActive
                        ? 'absolute top-[18px] transition duration-150 group opacity-1'
                        : 'absolute top-[18px] transition duration-150 group opacity-0'
                }
            >
                <div
                    className={
                        isActive
                            ? 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500'
                            : 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 -rotate-45'
                    }
                ></div>
                <div
                    className={
                        isActive
                            ? 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 '
                            : 'absolute w-[42px] h-[4px] bg-primary_green transition duration-500 rotate-45'
                    }
                ></div>
            </div>

        </>
    )
})
