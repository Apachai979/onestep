"use client"

import { Fragment } from "react"
import PhoneLink from "@/components/crm/PhoneLink"

// Строка «должность · телефон · раб. телефон · email» с кликабельными телефонами.
// Используется в карточках контактов сделок, проектов и аукционов.
export default function ContactMeta({ contact, className = "text-xs text-neutral-500" }) {
    if (!contact) return <p className={className}>—</p>

    const parts = []
    if (contact.position) parts.push(<span key='position'>{contact.position}</span>)
    if (contact.phone) parts.push(<PhoneLink key='phone' phone={contact.phone} />)
    if (contact.workPhone)
        parts.push(
            <PhoneLink key='workPhone' phone={contact.workPhone}>
                раб. {contact.workPhone}
            </PhoneLink>
        )
    if (contact.email) parts.push(<span key='email'>{contact.email}</span>)

    if (parts.length === 0) return <p className={className}>—</p>

    return (
        <p className={className}>
            {parts.map((part, i) => (
                <Fragment key={part.key}>
                    {i > 0 && " · "}
                    {part}
                </Fragment>
            ))}
        </p>
    )
}
