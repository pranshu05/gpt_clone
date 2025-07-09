"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { useChat } from "ai/react"
import { useChatHistory } from "@/hooks/use-chat-history"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"

export default function HomePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant")
    const router = useRouter()

    const { chats, createChat, updateChat, deleteChat, loadChat, isLoaded } = useChatHistory()

    const [userId] = useState(() =>
        typeof window !== "undefined"
            ? localStorage.getItem("chatgpt-clone-user-id") || Math.random().toString(36).substr(2, 9)
            : "default-user",
    )

    const { messages, input, handleInputChange, isLoading, reload, stop, setMessages, setInput } = useChat({
        api: "/api/chat",
        body: { userId, model: selectedModel },
        onFinish: () => {
            // Handle completion on home page
        },
    })

    const handleNewChat = () => {
        // Clear current messages and stay on home
        setMessages([])
        setInput("")
        if (isMobile) {
            setSidebarOpen(false)
        }
    }

    const handleChatSelect = (chatId: string) => {
        // Navigate to specific chat
        router.push(`/c/${chatId}`)
        if (isMobile) {
            setSidebarOpen(false)
        }
    }

    const handleChatDelete = (chatId: string) => {
        deleteChat(chatId)
    }

    const handleChatRename = (chatId: string, newTitle: string) => {
        const chat = loadChat(chatId)
        if (chat) {
            updateChat(chatId, chat.messages, newTitle)
        }
    }

    // Handle first message submission - create new chat with the message and redirect
    const handleFirstMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!input.trim() || isLoading || !isLoaded) return

        // Create the initial user message
        const userMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: "user" as const,
            content: input.trim(),
            createdAt: new Date(),
        }

        // Create new chat with the initial message and wait for it to be saved
        const chatId = await createChat([userMessage])

        // Small delay to ensure localStorage is updated
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Navigate to the new chat
        router.push(`/c/${chatId}`)
    }

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("chatgpt-clone-user-id", userId)
        }
    }, [userId])

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-[#212121]">
                {/* Sidebar */}
                <div
                    className={`
                        ${isMobile ? "fixed inset-y-0 left-0 z-50" : "relative"}
                        ${sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full"}
                        transition-transform duration-300 ease-in-out
                        w-64 flex-shrink-0
                    `}
                >
                    <Sidebar
                        chats={chats.map(chat => ({
                            ...chat,
                            messages: chat.messages
                                .filter(msg => msg.role === "user" || msg.role === "assistant")
                                .map(msg => ({
                                    ...msg,
                                    role: msg.role as "user" | "assistant",
                                    createdAt: msg.createdAt ?? new Date(), // 👈 Fix here
                                })),
                        }))}
                        currentChatId={null}
                        onNewChat={handleNewChat}
                        onChatSelect={handleChatSelect}
                        onChatDelete={handleChatDelete}
                        onChatRename={handleChatRename}
                        onClose={() => setSidebarOpen(false)}
                        isMobile={isMobile}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                    />
                </div>

                {/* Mobile overlay */}
                {isMobile && sidebarOpen && (
                    <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {isMobile && <MobileHeader onMenuClick={() => setSidebarOpen(true)} onNewChat={handleNewChat} />}

                    <ChatInterface
                        messages={messages}
                        input={input}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleFirstMessage}
                        isLoading={isLoading}
                        reload={reload}
                        stop={stop}
                        setMessages={setMessages}
                        setInput={setInput}
                        selectedModel={selectedModel}
                        isNewChat={true}
                        userId={userId}
                    />
                </div>
            </div>
        </ErrorBoundary>
    )
}