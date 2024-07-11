import ImageModal from "@/components/ImageModal";
import { images } from "@/lib/imageTreatmentRoom"
import Image from "next/image";

export default function ImagePage({ params: { id } }) {
    console.log(id.slice(-1), images[0].id)
    const image = images.find(p => p.id == id.slice(-1))
    console.log('yeah: ', image)
    return (
        <ImageModal>
            <Image
                src={image.src}
                alt={image.alt}
                width={1920}
                height={1080}
                className=''
            ></Image>
        </ImageModal>
    )
}