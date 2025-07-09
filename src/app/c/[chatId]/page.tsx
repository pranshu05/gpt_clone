"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { useChat, Message } from "ai/react"
import { useChatHistory } from "@/hooks/use-chat-history"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter, useParams } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ContextWindowManager } from "@/lib/context-window-manager"

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [chatNotFound, setChatNotFound] = useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant")
    const router = useRouter()
    const params = useParams()
    const chatId = params.chatId as string

    const { chats, updateChat, deleteChat, loadChat, isLoaded: chatsLoaded } = useChatHistory()
    const contextManager = React.useMemo(() => new ContextWindowManager(), [])

    const [userId] = useState(() =>
        typeof window !== "undefined"
            ? localStorage.getItem("chatgpt-clone-user-id") || Math.random().toString(36).substr(2, 9)
            : "default-user",
    )

    const { messages, input, handleInputChange, handleSubmit, isLoading, reload, stop, setMessages, setInput, append } =
        useChat({
            api: "/api/chat",
            body: { userId, model: selectedModel, chatId },
            onFinish: (message) => {
                // Only update chat if we have a valid chatId and messages
                if (chatId && messages.length > 0) {
                    const updatedMessages = [...messages, message]
                    const managedMessages = contextManager.manageContextWindow(updatedMessages, selectedModel)
                    updateChat(chatId, managedMessages)
                }
            },
        })

    // Memoize chat update function to prevent infinite loops
    const updateChatMemoized = useCallback(
        (id: string, msgs: Message[], title?: string) => {
            updateChat(id, msgs, title)
        },
        [updateChat],
    )

    // Load chat messages on mount and handle pending messages
    useEffect(() => {
        if (chatId && chatsLoaded) {
            const loadChatWithDelay = async () => {
                // Try multiple times with increasing delays
                for (let attempt = 0; attempt < 5; attempt++) {
                    const chat = loadChat(chatId)
                    if (chat) {
                        // Chat found, load its messages
                        setMessages(chat.messages)

                        // Check for pending message from home page
                        const pendingMessage = sessionStorage.getItem("pendingMessage")
                        const pendingChatId = sessionStorage.getItem("pendingChatId")

                        if (pendingMessage && pendingChatId === chatId) {
                            // Clear pending data
                            sessionStorage.removeItem("pendingMessage")
                            sessionStorage.removeItem("pendingChatId")

                            // Send the pending message
                            setTimeout(() => {
                                append({
                                    role: "user",
                                    content: pendingMessage,
                                })
                            }, 100)
                        }

                        setIsLoaded(true)
                        return
                    }
                    // Wait before next attempt
                    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
                }

                // Chat not found after all attempts
                setChatNotFound(true)
                setIsLoaded(true)

                // Redirect to home after a brief delay
                setTimeout(() => {
                    router.push("/")
                }, 2000)
            }

            loadChatWithDelay()
        }
    }, [chatId, chatsLoaded, loadChat, setMessages, router, append])

    const handleNewChat = useCallback(() => {
        router.push("/")
        if (isMobile) {
            setSidebarOpen(false)
        }
    }, [router, isMobile])

    const handleChatSelect = useCallback(
        (selectedChatId: string) => {
            if (selectedChatId !== chatId) {
                router.push(`/c/${selectedChatId}`)
            }
            if (isMobile) {
                setSidebarOpen(false)
            }
        },
        [chatId, router, isMobile],
    )

    const handleChatDelete = useCallback(
        (deleteChatId: string) => {
            deleteChat(deleteChatId)
            if (deleteChatId === chatId) {
                router.push("/")
            }
        },
        [deleteChat, chatId, router],
    )

    const handleChatRename = useCallback(
        (renameChatId: string, newTitle: string) => {
            const chat = loadChat(renameChatId)
            if (chat) {
                updateChatMemoized(renameChatId, chat.messages, newTitle)
            }
        },
        [loadChat, updateChatMemoized],
    )

    // Enhanced submit handler with context window management
    const handleChatSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            if (!input.trim() || isLoading) return

            // Apply context window management before submitting
            const managedMessages = contextManager.manageContextWindow(messages, selectedModel)
            setMessages(managedMessages)

            // Submit with managed messages
            handleSubmit(e)
        },
        [input, isLoading, contextManager, messages, selectedModel, setMessages, handleSubmit],
    )

    // Update chat when messages change (but not on initial load or during loading)
    useEffect(() => {
        if (isLoaded && chatId && messages.length > 0 && !isLoading) {
            // Debounce the update to prevent excessive calls
            const timeoutId = setTimeout(() => {
                const managedMessages = contextManager.manageContextWindow(messages, selectedModel)
                updateChatMemoized(chatId, managedMessages)
            }, 500)

            return () => clearTimeout(timeoutId)
        }
    }, [messages, chatId, isLoaded, isLoading, selectedModel, contextManager, updateChatMemoized])

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("chatgpt-clone-user-id", userId)
        }
    }, [userId])

    // Show loading state
    if (!isLoaded || !chatsLoaded) {
        return (
            <div className="flex h-screen bg-[#212121] items-center justify-center fixed inset-0">
                <div className="text-center text-white">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-400">Loading chat...</p>
                </div>
            </div>
        )
    }

    // Show chat not found state
    if (chatNotFound) {
        return (
            <div className="flex h-screen bg-[#212121] items-center justify-center fixed inset-0">
                <div className="text-center text-white">
                    <h2 className="text-xl font-semibold mb-2">Chat not found</h2>
                    <p className="text-gray-400 mb-4">This chat doesn&apos;t exist or has been deleted.</p>
                    <p className="text-sm text-gray-500">Redirecting to home...</p>
                </div>
            </div>
        )
    }

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
                        currentChatId={chatId}
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
                        handleSubmit={handleChatSubmit}
                        isLoading={isLoading}
                        reload={reload}
                        stop={stop}
                        setMessages={setMessages}
                        setInput={setInput}
                        selectedModel={selectedModel}
                        isNewChat={false}
                        userId={userId}
                        chatId={chatId}
                    />
                </div>
            </div>
        </ErrorBoundary>
    )
}