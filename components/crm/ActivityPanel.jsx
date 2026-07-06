"use client"
import { useState } from "react"
import {
    LuActivity,
    LuHistory,
    LuListTodo,
    LuMessageSquare,
    LuPaperclip,
} from "react-icons/lu"
import { Section, Tabs } from "@/components/crm/ui"
import RelatedTasksSection from "./RelatedTasksSection"
import NotesSection from "./NotesSection"
import AttachmentsSection from "./AttachmentsSection"
import ChangeHistorySection from "./ChangeHistorySection"

/**
 * Объединённая правая колонка карточек: Задачи / Заметки / Документы.
 *
 * Props:
 * - entityType:  "Deal" | "Project" | "Counterparty" | "Shipment"
 * - entityId:    string
 * - currentUserId, currentUserRole — для проверки прав на закрытие задач / удаление заметок
 * - taskRelationKind: для задач — нужен ключ связи ("deal"|"project"|"distributor"|"endCustomer").
 *                    Если не задан — вкладка задач скрывается.
 * - taskRelationId:   id, который надо подставлять в фильтр задач (по умолчанию = entityId).
 */
export default function ActivityPanel({
    entityType,
    entityId,
    currentUserId,
    currentUserRole,
    taskRelationKind,
    taskRelationId,
    showHistory = true,
    historyIncludeChildren = false,
}) {
    const showTasks = !!taskRelationKind
    const [tab, setTab] = useState(showTasks ? "tasks" : "notes")
    const [counts, setCounts] = useState({ tasks: 0, notes: 0, docs: 0 })

    function setCount(key) {
        return n => setCounts(c => (c[key] === n ? c : { ...c, [key]: n }))
    }

    const items = []
    if (showTasks) {
        items.push({
            key: "tasks",
            label: "Задачи",
            icon: LuListTodo,
            badge: counts.tasks,
        })
    }
    items.push({
        key: "notes",
        label: "Заметки",
        icon: LuMessageSquare,
        badge: counts.notes,
    })
    items.push({
        key: "docs",
        label: "Документы",
        icon: LuPaperclip,
        badge: counts.docs,
    })
    if (showHistory) {
        items.push({ key: "history", label: "История", icon: LuHistory })
    }

    return (
        <Section title='Активность' icon={LuActivity} className='lg:sticky lg:top-4'>
            <Tabs items={items} value={tab} onChange={setTab} className='mb-4' />

            {showTasks && (
                <div hidden={tab !== "tasks"}>
                    <RelatedTasksSection
                        bare
                        relationKind={taskRelationKind}
                        relationId={taskRelationId || entityId}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onCountChange={setCount("tasks")}
                    />
                </div>
            )}

            <div hidden={tab !== "notes"}>
                <NotesSection
                    bare
                    entityType={entityType}
                    entityId={entityId}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onCountChange={setCount("notes")}
                />
            </div>

            <div hidden={tab !== "docs"}>
                <AttachmentsSection
                    bare
                    entityType={entityType}
                    entityId={entityId}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onCountChange={setCount("docs")}
                />
            </div>

            {showHistory && (
                <div hidden={tab !== "history"}>
                    <ChangeHistorySection
                        entityType={entityType}
                        entityId={entityId}
                        includeChildren={historyIncludeChildren}
                        active={tab === "history"}
                    />
                </div>
            )}
        </Section>
    )
}
