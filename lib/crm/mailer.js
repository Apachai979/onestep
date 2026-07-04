import nodemailer from "nodemailer"

// SMTP-транспорт для исходящей почты CRM.
// Настройки: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM.

let transporter = null

export function isMailConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
}

function getTransporter() {
    if (transporter) return transporter
    const port = Number(process.env.SMTP_PORT) || 465
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure:
            process.env.SMTP_SECURE !== undefined
                ? process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true"
                : port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
    })
    return transporter
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
}

// Простой HTML из plain-text: абзацы + переносы строк, без внешних ресурсов
// (минимум шансов попасть в спам).
export function textToHtml(text) {
    const paragraphs = String(text).split(/\n{2,}/)
    const inner = paragraphs
        .map(p => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replaceAll("\n", "<br/>")}</p>`)
        .join("")
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a2e2b;max-width:640px;">${inner}</div>`
}

export async function sendMail({ to, replyTo, subject, text, attachments }) {
    if (!isMailConfigured()) {
        throw new Error(
            "Почта не настроена: задайте SMTP_HOST, SMTP_USER, SMTP_PASS в окружении",
        )
    }
    const info = await getTransporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        replyTo: replyTo || undefined,
        subject,
        text,
        html: textToHtml(text),
        attachments,
    })
    // Для тестового Ethereal-аккаунта вернёт ссылку на предпросмотр письма.
    const previewUrl = nodemailer.getTestMessageUrl(info) || null
    return { messageId: info.messageId, previewUrl }
}
