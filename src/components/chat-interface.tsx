"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Message } from "ai"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { ContextIndicator } from "./context-indicator"

interface ChatInterfaceProps {
    messages: Message[]
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    reload: () => void
    stop: () => void
    setMessages: (messages: Message[]) => void
    setInput: React.Dispatch<React.SetStateAction<string>>
    selectedModel: string
}

export function ChatInterface({
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    reload,
    stop,
    setMessages,
    setInput,
    selectedModel,
}: ChatInterfaceProps) {
    const [showScrollButton, setShowScrollButton] = useState(false)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollButton(!isNearBottom && messages.length > 0)
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleMessageEdit = (messageId: string, newContent: string) => {
        const messageIndex = messages.findIndex((m) => m.id === messageId)
        if (messageIndex === -1) return

        // Remove all messages after the edited message
        const updatedMessages = messages.slice(0, messageIndex + 1)
        updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: newContent }

        setMessages(updatedMessages)
        setInput("")

        // Regenerate response
        setTimeout(() => {
            const form = document.querySelector("form") as HTMLFormElement
            if (form) {
                const event = new Event("submit", { bubbles: true, cancelable: true })
                form.dispatchEvent(event)
            }
        }, 100)
    }

    const handleMessageRegenerate = (messageId: string) => {
        const messageIndex = messages.findIndex((m) => m.id === messageId)
        if (messageIndex === -1) return

        // Remove the message and all subsequent messages
        const updatedMessages = messages.slice(0, messageIndex)
        setMessages(updatedMessages)

        // Trigger regeneration
        reload()
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative">
                <ScrollArea className="h-full" onScrollCapture={handleScroll} ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto px-4 py-6">
                        {messages?.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="space-y-6">
                                {messages?.map((message, index) => (
                                    <ChatMessage
                                        key={message.id}
                                        message={message}
                                        isLast={index === messages.length - 1}
                                        onEdit={handleMessageEdit}
                                        onRegenerate={handleMessageRegenerate}
                                        isLoading={isLoading && index === messages.length - 1}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {showScrollButton && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute bottom-4 right-4 rounded-full shadow-lg bg-transparent"
                        onClick={scrollToBottom}
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="border-t bg-white dark:bg-gray-800">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <ContextIndicator messages={messages} selectedModel={selectedModel} />
                    </div>
                    <ChatInput
                        input={input}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        stop={stop}
                        setInput={setInput}
                    />
                </div>
            </div>
        </div>
    )
}