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

export function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
}

// Приглушённый цвет для подписей и сносок.
export const MAIL_MUTED = "#6b7280"

// Общая рамка письма. Стили только инлайновые: почтовые клиенты режут <style>.
export function htmlDocument(inner) {
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a2e2b;max-width:640px;">${inner}</div>`
}

/**
 * Абзацы и переносы строк из уже экранированного HTML. Отдельно от
 * `textToHtml` — письмо со ссылками собирает разметку само и не может позволить
 * экранировать её целиком.
 */
export function htmlFromEscaped(escaped) {
    const inner = String(escaped)
        .split(/\n{2,}/)
        .map(p => `<p style="margin:0 0 14px 0;">${p.replaceAll("\n", "<br/>")}</p>`)
        .join("")
    return htmlDocument(inner)
}

// Простой HTML из plain-text, без внешних ресурсов (минимум шансов попасть в спам).
export function textToHtml(text) {
    return htmlFromEscaped(escapeHtml(text))
}

// Ссылка для письма: цвет задаём инлайном — почтовые клиенты режут <style>.
export function mailLink(url, label) {
    return `<a href="${escapeHtml(url)}" style="color:#089E8D;">${escapeHtml(label)}</a>`
}

// `html` — готовая разметка письма; без неё HTML собирается из `text`.
export async function sendMail({ to, replyTo, subject, text, html, attachments }) {
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
        html: html || textToHtml(text),
        attachments,
    })
    // Для тестового Ethereal-аккаунта вернёт ссылку на предпросмотр письма.
    const previewUrl = nodemailer.getTestMessageUrl(info) || null
    return { messageId: info.messageId, previewUrl }
}
