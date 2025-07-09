"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
    Plus,
    MessageSquare,
    Edit3,
    Trash2,
    X,
    Search,
    BookOpen,
    Sparkles,
    Palette,
    Zap,
    User,
    Settings,
    ChevronDown,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    content: string
    role: "user" | "assistant"
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
    onChatRename: (chatId: string, newTitle: string) => void
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
    onChatRename,
    onClose,
    isMobile,
    selectedModel,
    onModelChange,
}: SidebarProps) {
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")

    const handleEditStart = (chat: Chat, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingChatId(chat.id)
        setEditTitle(chat.title)
    }

    const handleEditSave = (chatId: string) => {
        if (editTitle.trim()) {
            onChatRename(chatId, editTitle.trim())
        }
        setEditingChatId(null)
        setEditTitle("")
    }

    const handleEditCancel = () => {
        setEditingChatId(null)
        setEditTitle("")
    }

    const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
        if (e.key === "Enter") {
            handleEditSave(chatId)
        } else if (e.key === "Escape") {
            handleEditCancel()
        }
    }

    const handleDelete = (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this chat?")) {
            onChatDelete(chatId)
        }
    }

    const handleChatClick = (chatId: string) => {
        if (!editingChatId) {
            onChatSelect(chatId)
        }
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

    // Sort chats by updatedAt (most recent first)
    const sortedChats = [...chats].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    const groupedChats = sortedChats.reduce(
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
        <div className="flex flex-col h-full bg-[#171717] text-white border-r border-[#2d2d2d]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#2d2d2d]">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm"></div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="text-white hover:bg-[#2d2d2d] p-1 h-auto font-medium">
                                ChatGPT <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#2d2d2d] border-[#4d4d4d] text-white">
                            <DropdownMenuItem className="hover:bg-[#3d3d3d]">GPT-4</DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-[#3d3d3d]">GPT-3.5</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {isMobile && (
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-[#2d2d2d] p-1">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Navigation */}
            <div className="px-3 py-2 space-y-1">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal"
                >
                    <Plus className="h-4 w-4" />
                    New chat
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <Search className="h-4 w-4" />
                    Search chats
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <BookOpen className="h-4 w-4" />
                    Library
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <Sparkles className="h-4 w-4" />
                    Sora
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <Zap className="h-4 w-4" />
                    GPTs
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <Palette className="h-4 w-4" />
                    DALLE
                </Button>
            </div>

            {/* Chat history */}
            <ScrollArea className="flex-1 px-3">
                <div className="space-y-2 py-2">
                    {Object.keys(groupedChats).length > 0 ? (
                        Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                            <div key={dateGroup}>
                                {dateGroup !== "Today" && (
                                    <h3 className="text-xs font-medium text-gray-400 px-2 mb-2 mt-4 uppercase tracking-wider">
                                        {dateGroup}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {groupChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={cn(
                                                "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors relative",
                                                currentChatId === chat.id ? "bg-[#2d2d2d]" : "hover:bg-[#2d2d2d]",
                                            )}
                                            onClick={() => handleChatClick(chat.id)}
                                        >
                                            <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />

                                            {editingChatId === chat.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <Input
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                                                        className="flex-1 bg-[#3d3d3d] border-[#4d4d4d] text-white text-sm h-7 px-2"
                                                        autoFocus
                                                        onBlur={() => handleEditSave(chat.id)}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="flex-1 truncate text-sm text-white pr-2">{chat.title}</span>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleEditStart(chat, e)}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#3d3d3d] rounded"
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleDelete(chat.id, e)}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-[#3d3d3d] rounded"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-400 text-sm py-8">
                            <p>No chats yet</p>
                            <p>Start a new conversation</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-[#2d2d2d] p-3 space-y-1">
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm"></div>
                    Upgrade plan
                </Button>
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <User className="h-4 w-4" />
                    My plan
                </Button>
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal">
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </div>
        </div>
    )
}