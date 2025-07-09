"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, MoreHorizontal, Edit3, Trash2, X, Settings, User, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ModelSelector } from "./model-selector"

interface Message {
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: Date
}

interface Chat {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

interface SidebarProps {
    chats: Chat[]
    currentChatId: string | null
    onNewChat: () => void
    onChatSelect: (chatId: string) => void
    onChatDelete: (chatId: string) => void
    onClose: () => void
    isMobile: boolean
    selectedModel: string
    onModelChange: (model: string) => void
}

export function Sidebar({
    chats,
    currentChatId,
    onNewChat,
    onChatSelect,
    onChatDelete,
    onClose,
    isMobile,
    selectedModel,
    onModelChange,
}: SidebarProps) {
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")

    const handleEditStart = (chat: Chat) => {
        setEditingChatId(chat.id)
        setEditTitle(chat.title)
    }

    const handleEditSave = () => {
        // TODO: Implement chat title update
        setEditingChatId(null)
    }

    const handleEditCancel = () => {
        setEditingChatId(null)
        setEditTitle("")
    }

    const formatDate = (date: Date) => {
        const now = new Date()
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffInDays === 0) return "Today"
        if (diffInDays === 1) return "Yesterday"
        if (diffInDays < 7) return `${diffInDays} days ago`
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
        return date.toLocaleDateString()
    }

    const groupedChats = chats.reduce(
        (groups, chat) => {
            const dateKey = formatDate(chat.updatedAt)
            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(chat)
            return groups
        },
        {} as Record<string, Chat[]>,
    )

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <Button
                    onClick={onNewChat}
                    className="flex-1 justify-start gap-2 bg-transparent hover:bg-gray-700 text-white border border-gray-600 mr-2"
                >
                    <Plus className="h-4 w-4" />
                    New chat
                </Button>
                {isMobile && (
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="p-4 border-b border-gray-700">
                <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
            </div>

            {/* Chat history */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-4 py-4">
                    {Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                        <div key={dateGroup}>
                            <h3 className="text-xs font-medium text-gray-400 px-2 mb-2">{dateGroup}</h3>
                            <div className="space-y-1">
                                {groupChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={cn(
                                            "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                                            currentChatId === chat.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700",
                                        )}
                                        onClick={() => onChatSelect(chat.id)}
                                    >
                                        <MessageSquare className="h-4 w-4 shrink-0" />

                                        {editingChatId === chat.id ? (
                                            <input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={handleEditSave}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleEditSave()
                                                    if (e.key === "Escape") handleEditCancel()
                                                }}
                                                className="flex-1 bg-transparent border-none outline-none text-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="flex-1 truncate text-sm">{chat.title}</span>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEditStart(chat)
                                                    }}
                                                >
                                                    <Edit3 className="h-3 w-3 mr-2" />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onChatDelete(chat.id)
                                                    }}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-3 w-3 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-2 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <User className="h-4 w-4" />
                    Upgrade plan
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <LogOut className="h-4 w-4" />
                    Log out
                </Button>
            </div>
        </div>
    )
}