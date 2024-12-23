import Image from "next/image"

export default function videoViewProcedureRoom() {
    return (
        <div className='container mx-auto my-4 max-w-[1200px] px-10'>
            <div className='mb-6 flex flex-col items-center justify-center'>
                <h1 className='font-semibold text-2xl text-center'>
                    Забор крови на анализ с помощью новых технологий
                </h1>
                <Image
                    src='/academy/image_topics/zabor_krovi_tehn.jpg'
                    alt='Забор крови на анализ с помощью Onestep'
                    width={1920}
                    height={1080}
                    className='md:m-6 h-[150px] w-[300px] xl:h-[400px] xl:w-[500px] md:h-[300px] md:w-[400px] rounded-xl object-cover shadow-lg md:float-left mx-auto'
                >
                </Image>
                <div className="space-y-4">
                    <p>Процесс забора крови часто является болезненной процедурой как для пациентов, так и для медсестер. Известно, что пациенты обычно не любят иглы, но и медсестра часто вынуждена терпеть долгие попытки найти подходящую вену. Это добавляет пациенту неудобства, и здесь роботы и сканеры вен могут помочь ускорить процедуру.</p>
                    <p><span className="text-mainGreen">Veebot</span>, первый робот-флеботомист, использует комбинацию инфракрасного света и технологии анализа изображений для определения подходящей вены, а затем применяет ультразвук, чтобы увидеть, достаточен ли выбранный кровеносный сосуд для забора крови. Несмотря на то, что он еще находится в разработке, он может правильно определить лучшую вену с точностью около 83% - это сравнимо с показателями опытного специалиста. Это означает меньше места для болезненных ошибок и меньше времени, затрачиваемого на процедуру.</p>
                    <p>Другой подход к взятию крови заключается в использовании технологии дополненной реальности. Она включает в себя технологию подсветки периферических вен для улучшения успеха забора крови с первого укола. Уже разработаны такие устройства, как AccuVein и VeinViewer, которые используют такой подход. Например, система AccuVein была использована уже на более чем 10 миллионах пациентов и обеспечивает обнаружение подходящих кровеносных сосудов в 3,5 раза быстрее.</p>
                </div>
            </div>
        </div>
    )
}