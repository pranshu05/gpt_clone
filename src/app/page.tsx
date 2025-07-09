"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
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
        onFinish: (message) => {
            console.log("Home page chat finished:", message)
            // This will be handled in the chat page after redirect
        },
    })

    // Debug: Log messages state
    useEffect(() => {
        console.log("Messages state in home page:", messages)
    }, [messages])

    const handleNewChat = useCallback(() => {
        console.log("New chat clicked")
        // Clear current messages and stay on home
        setMessages([])
        setInput("")
        if (isMobile) {
            setSidebarOpen(false)
        }
    }, [setMessages, setInput, isMobile])

    const handleChatSelect = useCallback(
        (chatId: string) => {
            console.log("Chat selected:", chatId)
            // Navigate to specific chat
            router.push(`/c/${chatId}`)
            if (isMobile) {
                setSidebarOpen(false)
            }
        },
        [router, isMobile],
    )

    const handleChatDelete = useCallback(
        (chatId: string) => {
            console.log("Chat deleted:", chatId)
            deleteChat(chatId)
        },
        [deleteChat],
    )

    const handleChatRename = useCallback(
        (chatId: string, newTitle: string) => {
            console.log("Chat renamed:", chatId, newTitle)
            const chat = loadChat(chatId)
            if (chat) {
                updateChat(chatId, chat.messages, newTitle)
            }
        },
        [loadChat, updateChat],
    )

    // Handle first message submission - create new chat and redirect
    const handleFirstMessage = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            console.log("First message submitted:", input)

            if (!input.trim() || isLoading || !isLoaded) {
                console.log("First message blocked - no input, loading, or not loaded")
                return
            }

            try {
                // Create the initial user message
                const userMessage = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    role: "user" as const,
                    content: input.trim(),
                    createdAt: new Date(),
                }

                console.log("Creating chat with user message:", userMessage)

                // Create new chat with the initial message
                const chatId = await createChat([userMessage])
                console.log("Chat created with ID:", chatId)

                // Store the input temporarily for the new chat
                sessionStorage.setItem("pendingMessage", input.trim())
                sessionStorage.setItem("pendingChatId", chatId)

                // Clear input
                setInput("")

                // Navigate to the new chat immediately
                router.push(`/c/${chatId}`)
            } catch (error) {
                console.error("Failed to create chat:", error)
            }
        },
        [input, isLoading, isLoaded, createChat, setInput, router],
    )

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("chatgpt-clone-user-id", userId)
        }
    }, [userId])

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-[#212121] fixed inset-0">
                {/* Sidebar - Fixed positioning */}
                <div
                    className={`
                        ${isMobile ? "fixed inset-y-0 left-0 z-50" : "fixed inset-y-0 left-0"}
                        ${sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full"}
                        transition-transform duration-300 ease-in-out
                        w-64 flex-shrink-0
                    `}
                >
                    <Sidebar
                        chats={chats.map((chat) => ({
                            ...chat,
                            messages: chat.messages
                                .filter((msg) => msg.role === "user" || msg.role === "assistant")
                                .map((msg) => ({
                                    ...msg,
                                    role: msg.role as "user" | "assistant",
                                    createdAt: msg.createdAt ?? new Date(),
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

                {/* Main content - Adjusted for fixed sidebar */}
                <div className={`flex-1 flex flex-col min-w-0 ${!isMobile ? "ml-64" : ""}`}>
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