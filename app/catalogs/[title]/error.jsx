'use client'

export default function ErrorWrapper({ error }) {
    return <h1>Oops!!! {error.message}</h1>
}