"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { Message } from "ai"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowDown, Share, MoreHorizontal, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextIndicator } from "./context-indicator"

interface UploadedFile {
    id: string
    name: string
    type: string
    size: number
    url: string
    preview?: string
    processedContent?: string
    isImage: boolean
    isDocument: boolean
}

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
    isNewChat?: boolean
    userId?: string
    chatId?: string
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
    isNewChat = false,
    userId,
    chatId,
}: ChatInterfaceProps) {
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
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
        // Auto-scroll to bottom when new messages arrive
        if (messages.length > 0) {
            setTimeout(() => scrollToBottom(), 100)
        }
    }, [messages.length])

    const handleMessageEdit = (messageId: string, newContent: string) => {
        const messageIndex = messages.findIndex((m) => m.id === messageId)
        if (messageIndex === -1) return

        // Update the message and remove all messages after it
        const updatedMessages = messages.slice(0, messageIndex + 1)
        updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: newContent,
            createdAt: new Date(), // Update timestamp for edited message
        }

        setMessages(updatedMessages)
        setInput("")

        // Trigger a new completion after a brief delay
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

        // Remove the message and all messages after it, then regenerate
        const updatedMessages = messages.slice(0, messageIndex)
        setMessages(updatedMessages)

        // Trigger regeneration
        setTimeout(() => {
            reload()
        }, 100)
    }

    const handleFilesAttached = (files: UploadedFile[]) => {
        setAttachedFiles(files)
    }

    const handleEnhancedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Create enhanced input with file information
        let enhancedInput = input

        if (attachedFiles.length > 0) {
            const fileDescriptions = attachedFiles
                .map((file) => {
                    if (file.isImage) {
                        return `[Image uploaded: ${file.name} - ${file.url}]`
                    } else if (file.processedContent) {
                        return `[Document: ${file.name}]\n${file.processedContent.slice(0, 2000)}${file.processedContent.length > 2000 ? "..." : ""}`
                    } else {
                        return `[File: ${file.name}]`
                    }
                })
                .join("\n\n")

            enhancedInput = `${input}\n\n${fileDescriptions}`.trim()
        }

        // Temporarily update input
        const originalInput = input
        setInput(enhancedInput)

        // Submit with enhanced input
        handleSubmit(e)

        // Clear attached files
        setAttachedFiles([])

        // Restore original input (will be cleared by form submission)
        setTimeout(() => setInput(""), 100)
    }

    const getChatTitle = () => {
        if (messages.length === 0) return "ChatGPT"
        const firstUserMessage = messages.find((m) => m.role === "user")
        return firstUserMessage?.content.slice(0, 50) + (firstUserMessage?.content.length > 50 ? "..." : "") || "New Chat"
    }

    return (
        <div className="flex flex-col h-full bg-[#212121]">
            {/* Header - matches screenshot exactly */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d]">
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="text-white hover:bg-[#2d2d2d] font-medium text-lg">
                                ChatGPT <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#2d2d2d] border-[#4d4d4d] text-white">
                            <DropdownMenuItem className="hover:bg-[#3d3d3d]">GPT-4</DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-[#3d3d3d]">GPT-3.5</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Context indicator */}
                    {messages.length > 0 && <ContextIndicator messages={messages} selectedModel={selectedModel} />}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 relative">
                <ScrollArea className="h-full" onScrollCapture={handleScroll} ref={scrollAreaRef}>
                    {messages?.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div>
                            {messages?.map((message, index) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    isLast={index === messages.length - 1}
                                    onEdit={handleMessageEdit}
                                    onRegenerate={handleMessageRegenerate}
                                    isLoading={isLoading && index === messages.length - 1}
                                    isStreaming={isLoading && index === messages.length - 1}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>

                {showScrollButton && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute bottom-4 right-4 rounded-full shadow-lg bg-[#2f2f2f] border-[#4d4d4d] text-white hover:bg-[#3f3f3f]"
                        onClick={scrollToBottom}
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Input */}
            <div className="p-4">
                <ChatInput
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleEnhancedSubmit}
                    isLoading={isLoading}
                    stop={stop}
                    setInput={setInput}
                    userId={userId}
                    onFilesAttached={handleFilesAttached}
                />

                {/* Footer text - matches screenshot */}
                <p className="text-xs text-gray-400 text-center mt-2">
                    ChatGPT can make mistakes. Check important info.{" "}
                    <button className="underline hover:text-gray-300">Cookie Preferences</button>.
                </p>
            </div>
        </div>
    )
}