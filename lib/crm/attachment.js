export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

// Allowed MIME types. Anything else is rejected.
export const ALLOWED_MIME = new Set([
    // documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/rtf",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    // images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/heic",
    // text
    "text/plain",
    "text/csv",
])

export function isImageMime(mime) {
    return typeof mime === "string" && mime.startsWith("image/")
}

export function fileIconKey(mime) {
    if (!mime) return "file"
    if (mime.startsWith("image/")) return "image"
    if (mime === "application/pdf") return "pdf"
    if (mime.includes("word")) return "doc"
    if (mime.includes("sheet") || mime.includes("excel")) return "xls"
    if (mime.includes("presentation")) return "ppt"
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "zip"
    if (mime.startsWith("text/")) return "text"
    return "file"
}

export function formatBytes(bytes) {
    const n = Number(bytes) || 0
    if (n < 1024) return `${n} Б`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} МБ`
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} ГБ`
}

const ENTITY_TYPES = new Set([
    "Deal",
    "Project",
    "Counterparty",
    "Shipment",
    "Auction",
])

export function validateAttachmentTarget({ entityType, entityId, noteId }) {
    if (noteId) {
        if (typeof noteId !== "string") return "noteId должен быть строкой"
        return null
    }
    if (!entityType || !entityId) {
        return "Не указан entityType/entityId или noteId"
    }
    if (!ENTITY_TYPES.has(entityType)) {
        return `Неизвестный entityType: ${entityType}`
    }
    if (typeof entityId !== "string") {
        return "entityId должен быть строкой"
    }
    return null
}

export function validateUpload({ size, mimeType }) {
    if (size > MAX_FILE_SIZE) {
        return `Файл больше ${formatBytes(MAX_FILE_SIZE)}`
    }
    if (!ALLOWED_MIME.has(mimeType)) {
        return `Тип файла не поддерживается: ${mimeType || "неизвестный"}`
    }
    return null
}

export const NOTE_ENTITY_TYPES = ["Deal", "Project", "Counterparty", "Shipment", "Auction"]

export function validateNoteTarget({ entityType, entityId }) {
    if (!entityType || !entityId) return "entityType и entityId обязательны"
    if (!NOTE_ENTITY_TYPES.includes(entityType)) {
        return `Неизвестный entityType: ${entityType}`
    }
    if (typeof entityId !== "string") return "entityId должен быть строкой"
    return null
}
