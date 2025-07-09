"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { useChat } from "ai/react"
import { useChatHistory } from "@/hooks/use-chat-history"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary } from "@/components/error-boundary"

export default function HomePage() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [currentChatId, setCurrentChatId] = useState<string | null>(null)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [selectedModel, setSelectedModel] = useState("meta-llama/llama-4-scout-17b-16e-instruct")

    const { chats, createChat, updateChat, deleteChat, loadChat } = useChatHistory()

    const [userId] = useState(() =>
        typeof window !== "undefined"
            ? localStorage.getItem("chatgpt-clone-user-id") || Math.random().toString(36).substr(2, 9)
            : "default-user",
    )

    const { messages, input, handleInputChange, handleSubmit, isLoading, reload, stop, setMessages, setInput } = useChat({
        api: "/api/chat",
        body: { userId, model: selectedModel },
        onFinish: (message) => {
            if (currentChatId) {
                updateChat(currentChatId, [...messages, message])
            }
        },
    })

    const handleNewChat = () => {
        const chatId = createChat()
        setCurrentChatId(chatId)
        setMessages([])
        setInput("")
        if (isMobile) {
            setSidebarOpen(false)
        }
    }

    const handleChatSelect = (chatId: string) => {
        const chat = loadChat(chatId)
        if (chat) {
            setCurrentChatId(chatId)
            setMessages(chat.messages)
            setInput("")
            if (isMobile) {
                setSidebarOpen(false)
            }
        }
    }

    const handleChatDelete = (chatId: string) => {
        deleteChat(chatId)
        if (currentChatId === chatId) {
            setCurrentChatId(null)
            setMessages([])
            setInput("")
        }
    }

    useEffect(() => {
        if (!currentChatId && messages.length > 0) {
            const chatId = createChat(messages)
            setCurrentChatId(chatId)
        }
    }, [messages, currentChatId, createChat])

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("chatgpt-clone-user-id", userId)
        }
    }, [userId])

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-white dark:bg-gray-800">
                {/* Sidebar */}
                <div
                    className={`
        ${isMobile ? "fixed inset-y-0 left-0 z-50" : "relative"}
        ${sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full"}
        transition-transform duration-300 ease-in-out
        ${isMobile ? "w-80" : "w-64"}
        bg-gray-900 text-white
      `}
                >
                    <Sidebar
                        chats={chats}
                        currentChatId={currentChatId}
                        onNewChat={handleNewChat}
                        onChatSelect={handleChatSelect}
                        onChatDelete={handleChatDelete}
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
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        reload={reload}
                        stop={stop}
                        setMessages={setMessages}
                        setInput={setInput}
                        selectedModel={selectedModel}
                    />
                </div>
            </div>
        </ErrorBoundary>
    )
}