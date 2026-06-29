import { promises as fs } from "fs"
import { createReadStream } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const ROOT = path.join(process.cwd(), "uploads")

function safeName(name) {
    const base = path.basename(name || "file")
        .replace(/[^\w.\-а-яёА-ЯЁ\s()]/giu, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200)
    return base || "file"
}

function relativeFolder({ entityType, entityId, noteId }) {
    if (noteId) return path.join("notes", noteId)
    if (entityType && entityId) return path.join(entityType, entityId)
    return "misc"
}

/**
 * Save a file buffer to local storage.
 * Returns the storage key (relative to ROOT).
 */
export async function saveFile(buffer, { fileName, entityType, entityId, noteId }) {
    const folder = relativeFolder({ entityType, entityId, noteId })
    const dir = path.join(ROOT, folder)
    await fs.mkdir(dir, { recursive: true })
    const final = `${randomUUID()}__${safeName(fileName)}`
    const fullPath = path.join(dir, final)
    await fs.writeFile(fullPath, buffer)
    return path.join(folder, final).replace(/\\/g, "/")
}

export function resolveStoragePath(storageKey) {
    const normalized = String(storageKey || "").replace(/\\/g, "/").replace(/^\/+/, "")
    // guard against path traversal
    const full = path.join(ROOT, normalized)
    const rel = path.relative(ROOT, full)
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error("Invalid storage key")
    }
    return full
}

export async function statFile(storageKey) {
    const p = resolveStoragePath(storageKey)
    return fs.stat(p)
}

export function openReadStream(storageKey) {
    return createReadStream(resolveStoragePath(storageKey))
}

export async function deleteFile(storageKey) {
    if (!storageKey) return
    try {
        await fs.unlink(resolveStoragePath(storageKey))
    } catch (err) {
        if (err?.code !== "ENOENT") throw err
    }
}

export const ROOT_PATH = ROOT
