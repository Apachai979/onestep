export const TASKS_CHANGED_EVENT = "crm:tasks-changed"

export function notifyTasksChanged() {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT))
}

export function onTasksChanged(handler) {
    if (typeof window === "undefined") return () => {}
    window.addEventListener(TASKS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, handler)
}
