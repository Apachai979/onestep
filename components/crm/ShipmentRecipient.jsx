"use client"

import { Fragment } from "react"
import { shipmentRecipientParts } from "@/lib/crm/shipment"
import PhoneLink from "@/components/crm/PhoneLink"

// Строка получателя с кликабельным телефоном. Для контакта телефон и email
// показываются в скобках после имени, для ручного ввода — через « · ».
export default function ShipmentRecipient({ shipment }) {
    const { name, phone, email, wrapped } = shipmentRecipientParts(shipment)
    if (!name && !phone && !email) return null

    const extras = [
        phone ? <PhoneLink key='phone' phone={phone} /> : null,
        email ? <span key='email'>{email}</span> : null,
    ].filter(Boolean)

    const joined = extras.map((node, i) => (
        <Fragment key={node.key}>
            {i > 0 && " · "}
            {node}
        </Fragment>
    ))

    if (!extras.length) return <>{name || "—"}</>
    if (!wrapped && !name) return <>{joined}</>
    if (!wrapped)
        return (
            <>
                {name} · {joined}
            </>
        )

    return (
        <>
            {name || "—"} ({joined})
        </>
    )
}
