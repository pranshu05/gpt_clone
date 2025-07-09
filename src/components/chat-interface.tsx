"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import type { Message } from "ai"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { EmptyState } from "./empty-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowDown, Share, MoreHorizontal, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextIndicator } from "./context-indicator"
import { useAnnouncer } from "./accessibility-announcer"
import { MemoryIndicator } from "./memory-indicator"

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
    userId,
}: ChatInterfaceProps) {
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { announce } = useAnnouncer()
    const lastMessageCountRef = useRef(0)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    const handleScroll = useCallback(
        (event: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
            setShowScrollButton(!isNearBottom && messages.length > 0)
        },
        [messages],
    )

    // Only scroll and announce when messages actually change
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            // New message added
            setTimeout(() => scrollToBottom(), 100)

            // Announce new messages for screen readers
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && lastMessage.role === "assistant") {
                announce(`Assistant responded: ${lastMessage.content.slice(0, 100)}...`)
            }

            lastMessageCountRef.current = messages.length
        }
    }, [messages, scrollToBottom, announce])

    const handleMessageEdit = useCallback(
        (messageId: string, newContent: string) => {
            const messageIndex = messages.findIndex((m) => m.id === messageId)
            if (messageIndex === -1) return

            // Update the message and remove all messages after it
            const updatedMessages = messages.slice(0, messageIndex + 1)
            updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: newContent,
                createdAt: new Date(),
            }

            setMessages(updatedMessages)
            setInput("")
            announce("Message edited and regenerating response")

            // Trigger a new completion after a brief delay
            setTimeout(() => {
                const form = document.querySelector("form") as HTMLFormElement
                if (form) {
                    // Create a synthetic form submission event
                    const submitEvent = new Event("submit", { bubbles: true, cancelable: true })
                    form.dispatchEvent(submitEvent)
                }
            }, 100)
        },
        [messages, setMessages, setInput, announce],
    )

    const handleMessageRegenerate = useCallback(
        (messageId: string) => {
            const messageIndex = messages.findIndex((m) => m.id === messageId)
            if (messageIndex === -1) return

            // Remove the message and all messages after it, then regenerate
            const updatedMessages = messages.slice(0, messageIndex)
            setMessages(updatedMessages)
            announce("Regenerating response")

            // Trigger regeneration
            setTimeout(() => {
                reload()
            }, 100)
        },
        [messages, setMessages, announce, reload],
    )

    const handleFilesAttached = useCallback(
        (files: UploadedFile[]) => {
            setAttachedFiles(files)
            if (files.length > 0) {
                announce(`${files.length} file(s) attached`)
            }
        },
        [announce],
    )

    const handleEnhancedSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
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

            // Store original input

            // Temporarily update input for submission
            setInput(enhancedInput)

            // Submit with enhanced input
            handleSubmit(e)

            // Clear attached files and restore input
            setAttachedFiles([])
            announce("Message sent")

            // Reset input after submission
            setTimeout(() => {
                setInput("")
            }, 50)
        },
        [input, attachedFiles, setInput, handleSubmit, announce],
    )

    return (
        <div className="flex flex-col h-full bg-[#212121] chatgpt-main" role="main" aria-label="Chat interface">
            {/* Header - matches ChatGPT exactly */}
            <header
                className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d] chatgpt-header flex-shrink-0"
                role="banner"
            >
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="text-white hover:bg-[#2d2d2d] font-medium text-lg focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
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

                    {/* Context and Memory indicators */}
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && <ContextIndicator messages={messages} selectedModel={selectedModel} />}
                        {userId && <MemoryIndicator userId={userId} currentQuery={input} />}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                        aria-label="Share conversation"
                    >
                        <Share className="h-4 w-4 mr-2" aria-hidden="true" />
                        Share
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                        aria-label="More options"
                    >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 relative overflow-hidden" role="log" aria-live="polite" aria-label="Chat messages">
                <ScrollArea className="h-full scrollbar-thin" onScrollCapture={handleScroll} ref={scrollAreaRef}>
                    {messages?.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div>
                            {messages?.map((message, index) => (
                                <ChatMessage
                                    key={`${message.id}-${index}`}
                                    message={message}
                                    isLast={index === messages.length - 1}
                                    onEdit={handleMessageEdit}
                                    onRegenerate={handleMessageRegenerate}
                                    isLoading={isLoading && index === messages.length - 1}
                                    isStreaming={isLoading && index === messages.length - 1}
                                />
                            ))}
                            <div ref={messagesEndRef} aria-hidden="true" />
                        </div>
                    )}
                </ScrollArea>

                {showScrollButton && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute bottom-4 right-4 rounded-full shadow-lg bg-[#2f2f2f] border-[#4d4d4d] text-white hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                        onClick={scrollToBottom}
                        aria-label="Scroll to bottom"
                    >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}
            </div>

            {/* Input */}
            <div className="p-4 flex-shrink-0" role="region" aria-label="Message input">
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

                {/* Footer text - matches ChatGPT */}
                <p className="text-xs text-gray-400 text-center mt-2">
                    ChatGPT can make mistakes. Check important info.{" "}
                    <button
                        className="underline hover:text-gray-300 focus-visible:ring-2 focus-visible:ring-[#10a37f] rounded"
                        aria-label="Cookie preferences"
                    >
                        Cookie Preferences
                    </button>
                    .
                </p>
            </div>
        </div>
    )
}