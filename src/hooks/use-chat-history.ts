"use client"

import { useState, useEffect } from "react"
import type { Message } from "ai"

interface Chat {
    id: string
    title: string
    messages: Message[]
    createdAt: Date
    updatedAt: Date
}

export function useChatHistory() {
    const [chats, setChats] = useState<Chat[]>([])

    useEffect(() => {
        // Load chats from localStorage on mount
        const savedChats = localStorage.getItem("chatgpt-clone-chats")
        if (savedChats) {
            try {
                const parsedChats = JSON.parse(savedChats).map((chat: {
                    id: string;
                    title: string;
                    messages: Message[];
                    createdAt: string;
                    updatedAt: string;
                }) => ({
                    ...chat,
                    createdAt: new Date(chat.createdAt),
                    updatedAt: new Date(chat.updatedAt),
                }))
                setChats(parsedChats)
            } catch (error) {
                console.error("Failed to load chats:", error)
            }
        }
    }, [])

    useEffect(() => {
        // Save chats to localStorage whenever chats change
        localStorage.setItem("chatgpt-clone-chats", JSON.stringify(chats))
    }, [chats])

    const createChat = (initialMessages: Message[] = []) => {
        const chatId = Math.random().toString(36).substr(2, 9)
        const title =
            initialMessages.length > 0
                ? initialMessages[0].content.slice(0, 50) + (initialMessages[0].content.length > 50 ? "..." : "")
                : "New Chat"

        const newChat: Chat = {
            id: chatId,
            title,
            messages: initialMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        setChats((prev) => [newChat, ...prev])
        return chatId
    }

    const updateChat = (chatId: string, messages: Message[]) => {
        setChats((prev) =>
            prev.map((chat) =>
                chat.id === chatId
                    ? {
                        ...chat,
                        messages,
                        updatedAt: new Date(),
                        title:
                            messages.length > 0 && !chat.title.startsWith(messages[0].content.slice(0, 20))
                                ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "")
                                : chat.title,
                    }
                    : chat,
            ),
        )
    }

    const deleteChat = (chatId: string) => {
        setChats((prev) => prev.filter((chat) => chat.id !== chatId))
    }

    const loadChat = (chatId: string) => {
        return chats.find((chat) => chat.id === chatId)
    }

    return {
        chats,
        createChat,
        updateChat,
        deleteChat,
        loadChat,
    }
}