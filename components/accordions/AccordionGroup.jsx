'use client'
import { useState } from 'react'
import Accordion from './Accordion';

export default function AccordionGroup({ accordions }) {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleAccordion = (index) => {
        setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
    };

    return (
        <div>
            {accordions.map((accordion, index) => (
                <Accordion
                    key={index}
                    title={accordion.title}
                    design={accordion.design}
                    isOpen={openIndex === index}
                    onToggle={() => toggleAccordion(index)}
                >
                    {accordion.content}
                </Accordion>
            ))}
        </div>
    );
}