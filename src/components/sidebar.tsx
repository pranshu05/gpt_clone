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
import { useAnnouncer } from "./accessibility-announcer"

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
}: SidebarProps) {
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const { announce } = useAnnouncer()

    const handleEditStart = (chat: Chat, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingChatId(chat.id)
        setEditTitle(chat.title)
        announce(`Editing chat title: ${chat.title}`)
    }

    const handleEditSave = (chatId: string) => {
        if (editTitle.trim()) {
            onChatRename(chatId, editTitle.trim())
            announce(`Chat renamed to: ${editTitle.trim()}`)
        }
        setEditingChatId(null)
        setEditTitle("")
    }

    const handleEditCancel = () => {
        setEditingChatId(null)
        setEditTitle("")
        announce("Edit cancelled")
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
            announce("Chat deleted")
        }
    }

    const handleChatClick = (chatId: string) => {
        if (!editingChatId) {
            onChatSelect(chatId)
            const chat = chats.find((c) => c.id === chatId)
            if (chat) {
                announce(`Selected chat: ${chat.title}`)
            }
        }
    }

    const handleNewChatClick = () => {
        onNewChat()
        announce("Started new chat")
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
        <nav
            className="flex flex-col h-full bg-[#171717] text-white border-r border-[#2d2d2d] chatgpt-sidebar"
            role="navigation"
            aria-label="Chat navigation"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#2d2d2d] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center" aria-hidden="true">
                        <div className="w-4 h-4 bg-black rounded-sm"></div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-white hover:bg-[#2d2d2d] p-1 h-auto font-medium focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                                aria-label="Select ChatGPT model"
                            >
                                ChatGPT <ChevronDown className="h-4 w-4 ml-1" aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#2d2d2d] border-[#4d4d4d] text-white chatgpt-dropdown">
                            <DropdownMenuItem className="hover:bg-[#3d3d3d] focus:bg-[#3d3d3d] chatgpt-dropdown-item">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm"></div>
                                    <span>GPT-4</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-[#3d3d3d] focus:bg-[#3d3d3d] chatgpt-dropdown-item">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-[#10a37f] rounded-sm"></div>
                                    <span>GPT-3.5</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {isMobile && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-white hover:bg-[#2d2d2d] p-1 focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                        aria-label="Close sidebar"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}
            </div>

            {/* Navigation */}
            <div className="px-3 py-2 space-y-1 flex-shrink-0">
                <Button
                    onClick={handleNewChatClick}
                    className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item"
                    aria-label="Start new chat"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New chat
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search chats
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Library
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Sora
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <Zap className="h-4 w-4" aria-hidden="true" />
                    GPTs
                </Button>

                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <Palette className="h-4 w-4" aria-hidden="true" />
                    DALLE
                </Button>
            </div>

            {/* Chat history */}
            <ScrollArea className="flex-1 px-3 scrollbar-thin" role="region" aria-label="Chat history">
                <div className="space-y-2 py-2">
                    {Object.keys(groupedChats).length > 0 ? (
                        Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                            <div key={dateGroup}>
                                {dateGroup !== "Today" && (
                                    <h3 className="text-xs font-medium text-gray-400 px-2 mb-2 mt-4 uppercase tracking-wider">
                                        {dateGroup}
                                    </h3>
                                )}
                                <div className="space-y-1" role="list" aria-label={`Chats from ${dateGroup}`}>
                                    {groupChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={cn(
                                                "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors relative chatgpt-sidebar-item",
                                                currentChatId === chat.id ? "bg-[#2d2d2d] active" : "hover:bg-[#2d2d2d]",
                                            )}
                                            onClick={() => handleChatClick(chat.id)}
                                            role="listitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    handleChatClick(chat.id)
                                                }
                                            }}
                                            aria-label={`Chat: ${chat.title}`}
                                        >
                                            <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />

                                            {editingChatId === chat.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <Input
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, chat.id)}
                                                        className="flex-1 bg-[#3d3d3d] border-[#4d4d4d] text-white text-sm h-7 px-2 focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                                        autoFocus
                                                        onBlur={() => handleEditSave(chat.id)}
                                                        aria-label="Edit chat title"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="flex-1 truncate text-sm text-white pr-2">{chat.title}</span>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center md:opacity-100">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleEditStart(chat, e)}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#3d3d3d] rounded focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                                                            aria-label={`Edit ${chat.title}`}
                                                        >
                                                            <Edit3 className="h-3 w-3" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleDelete(chat.id, e)}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-[#3d3d3d] rounded focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                                                            aria-label={`Delete ${chat.title}`}
                                                        >
                                                            <Trash2 className="h-3 w-3" aria-hidden="true" />
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
            <div className="border-t border-[#2d2d2d] p-3 space-y-1 flex-shrink-0">
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm" aria-hidden="true"></div>
                    Upgrade plan
                </Button>
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <User className="h-4 w-4" aria-hidden="true" />
                    My plan
                </Button>
                <Button className="w-full justify-start gap-3 bg-transparent hover:bg-[#2d2d2d] text-white border-none h-10 px-3 font-normal focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button chatgpt-sidebar-item">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                </Button>
            </div>
        </nav>
    )
}