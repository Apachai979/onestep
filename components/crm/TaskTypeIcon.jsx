"use client"
import {
    FiPhone,
    FiUsers,
    FiDollarSign,
    FiAlertCircle,
    FiClock,
    FiEdit,
    FiTrendingUp,
    FiPhoneMissed,
    FiPauseCircle,
    FiInbox,
    FiFileText,
    FiBell,
} from "react-icons/fi"
import { TASK_TYPE_MAP } from "@/lib/crm/task"

const ICONS = {
    FiPhone,
    FiUsers,
    FiDollarSign,
    FiAlertCircle,
    FiClock,
    FiEdit,
    FiTrendingUp,
    FiPhoneMissed,
    FiPauseCircle,
    FiInbox,
    FiFileText,
    FiBell,
}

export default function TaskTypeIcon({ type, className = "" }) {
    const meta = TASK_TYPE_MAP[type]
    if (!meta) return null
    const Icon = ICONS[meta.icon]
    if (!Icon) return null
    return <Icon className={className} />
}

export function TaskTypeBadge({ type }) {
    const meta = TASK_TYPE_MAP[type]
    if (!meta) return <span className='text-xs text-gray-500'>{type}</span>
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg}`}
        >
            <TaskTypeIcon type={type} />
            {meta.label}
        </span>
    )
}
