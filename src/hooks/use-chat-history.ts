"use client"

import { useState, useEffect, useCallback } from "react"
import type { Message } from "ai"

interface Chat {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

const STORAGE_KEY = "chatgpt-clone-chats"

export function useChatHistory() {
    const [chats, setChats] = useState<Chat[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load chats from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const savedChats = localStorage.getItem(STORAGE_KEY)
                if (savedChats) {
                    const parsedChats = JSON.parse(savedChats).map(
                        (chat: {
                            id: string
                            title: string
                            messages: Message[]
                            createdAt: string
                            updatedAt: string
                        }) => ({
                            ...chat,
                            createdAt: new Date(chat.createdAt),
                            updatedAt: new Date(chat.updatedAt),
                        }),
                    )
                    setChats(parsedChats)
                }
            } catch (error) {
                console.error("Failed to load chats from localStorage:", error)
                // Clear corrupted data
                localStorage.removeItem(STORAGE_KEY)
            }
            setIsLoaded(true)
        }
    }, [])

    // Save chats to localStorage whenever chats change
    useEffect(() => {
        if (isLoaded && typeof window !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
            } catch (error) {
                console.error("Failed to save chats to localStorage:", error)
            }
        }
    }, [chats, isLoaded])

    const createChat = useCallback((initialMessages: Message[] = []) => {
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Generate title from first message or use default
        let title = "New Chat"
        if (initialMessages.length > 0) {
            const firstUserMessage = initialMessages.find((m) => m.role === "user")
            if (firstUserMessage) {
                title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
            }
        }

        const newChat: Chat = {
            id: chatId,
            title,
            messages: initialMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        setChats((prev) => {
            const updated = [newChat, ...prev]
            return updated
        })

        return chatId
    }, [])

    const updateChat = useCallback((chatId: string, messages: Message[], newTitle?: string) => {
        setChats((prev) => {
            const updated = prev.map((chat) => {
                if (chat.id === chatId) {
                    // Auto-generate title from first user message if not provided
                    let title = newTitle || chat.title
                    if (!newTitle && messages.length > 0 && chat.title === "New Chat") {
                        const firstUserMessage = messages.find((m) => m.role === "user")
                        if (firstUserMessage) {
                            title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
                        }
                    }

                    return {
                        ...chat,
                        messages: [...messages], // Create new array to ensure reactivity
                        updatedAt: new Date(),
                        title,
                    }
                }
                return chat
            })
            return updated
        })
    }, [])

    const deleteChat = useCallback((chatId: string) => {
        setChats((prev) => {
            const updated = prev.filter((chat) => chat.id !== chatId)
            return updated
        })
    }, [])

    const loadChat = useCallback(
        (chatId: string): Chat | null => {
            const chat = chats.find((chat) => chat.id === chatId)
            return chat || null
        },
        [chats],
    )

    const clearAllChats = useCallback(() => {
        setChats([])
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [])

    return {
        chats,
        createChat,
        updateChat,
        deleteChat,
        loadChat,
        clearAllChats,
        isLoaded,
    }
}