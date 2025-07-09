"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { Message } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github-dark.css"
import { TypingAnimation, LoadingDots } from "./typing-animation"
import { useAnnouncer } from "./accessibility-announcer"
import { EnhancedMessageActions } from "./enhanced-message-actions"

interface ChatMessageProps {
    message: Message
    isLast: boolean
    onEdit: (messageId: string, newContent: string) => void
    onRegenerate: (messageId: string) => void
    isLoading?: boolean
    isStreaming?: boolean
}

export function ChatMessage({ message, isLast, onEdit, onRegenerate, isLoading, isStreaming }: ChatMessageProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)
    const [showTyping, setShowTyping] = useState(false)
    const [typingComplete, setTypingComplete] = useState(false)
    const { announce } = useAnnouncer()

    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    console.log(`ChatMessage rendering:`, {
        id: message.id,
        role: message.role,
        content: message.content?.slice(0, 50) + "...",
        isUser,
        isAssistant,
    })

    // Handle typing animation for assistant messages
    useEffect(() => {
        if (isAssistant && isLast && message.content && !typingComplete) {
            // Only show typing if this is a new message or streaming
            if (isStreaming || (!showTyping && message.content.length > 0)) {
                setShowTyping(true)
            }
        }
    }, [isAssistant, isLast, message.content, isStreaming, showTyping, typingComplete])

    // Reset typing state when message content changes significantly
    useEffect(() => {
        const contentChanged = editContent !== message.content
        setEditContent(message.content)

        if (contentChanged) {
            setTypingComplete(false)
            setShowTyping(false)
        }
    }, [message.content])

    // Handle edit functionality
    const handleEdit = useCallback(() => {
        if (isEditing) {
            if (editContent.trim() !== message.content) {
                onEdit(message.id, editContent.trim())
                announce("Message edited and regenerating response")
            }
            setIsEditing(false)
        } else {
            setIsEditing(true)
            announce("Editing message")
        }
    }, [isEditing, editContent, message.content, message.id, onEdit, announce])

    const handleCancelEdit = useCallback(() => {
        setEditContent(message.content)
        setIsEditing(false)
        announce("Edit cancelled")
    }, [message.content, announce])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleEdit()
            } else if (e.key === "Escape") {
                e.preventDefault()
                handleCancelEdit()
            }
        },
        [handleEdit, handleCancelEdit],
    )

    const handleTypingComplete = useCallback(() => {
        setShowTyping(false)
        setTypingComplete(true)
    }, [])

    // Listen for edit events from enhanced actions
    useEffect(() => {
        const handleEditEvent = (event: CustomEvent) => {
            if (event.detail.messageId === message.id) {
                setIsEditing(true)
                setEditContent(event.detail.content)
            }
        }

        window.addEventListener("editMessage", handleEditEvent as EventListener)
        return () => {
            window.removeEventListener("editMessage", handleEditEvent as EventListener)
        }
    }, [message.id])

    // Don't render if message has no content
    if (!message.content && !isLoading) {
        console.log("Message has no content, not rendering:", message)
        return null
    }

    return (
        <div
            className={cn(
                "group w-full message-container chatgpt-message-container",
                isUser ? "bg-[#2f2f2f] chatgpt-message-user" : "bg-[#212121] chatgpt-message-assistant",
            )}
            role="article"
            aria-label={`${isUser ? "Your" : "Assistant"} message`}
        >
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {isUser ? (
                            <div
                                className="w-8 h-8 bg-[#4d4d4d] rounded-full flex items-center justify-center chatgpt-avatar chatgpt-avatar-user"
                                role="img"
                                aria-label="User avatar"
                            >
                                <User className="h-4 w-4 text-white" aria-hidden="true" />
                            </div>
                        ) : (
                            <div
                                className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center chatgpt-avatar chatgpt-avatar-assistant"
                                role="img"
                                aria-label="ChatGPT avatar"
                            >
                                <div className="w-4 h-4 bg-white rounded-sm" aria-hidden="true"></div>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 relative">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm text-white">{isUser ? "You" : "ChatGPT"}</span>
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="min-h-[100px] resize-none bg-[#2f2f2f] border-[#4d4d4d] text-white focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    autoFocus
                                    placeholder="Edit your message..."
                                    aria-label="Edit message content"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleEdit}
                                        className="bg-[#10a37f] hover:bg-[#0d8f6b] text-white focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                                    >
                                        <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                                        Save & Submit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="border-[#4d4d4d] text-white hover:bg-[#2f2f2f] bg-transparent focus-visible:ring-2 focus-visible:ring-[#10a37f] chatgpt-button"
                                    >
                                        <X className="h-4 w-4 mr-1" aria-hidden="true" />
                                        Cancel
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">Press Ctrl+Enter to save, Escape to cancel</p>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none chatgpt-text">
                                {isLoading && isLast ? (
                                    <LoadingDots />
                                ) : isAssistant && showTyping && !typingComplete ? (
                                    <TypingAnimation text={message.content} speed={15} onComplete={handleTypingComplete} />
                                ) : isAssistant ? (
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeHighlight]}
                                        components={{
                                            code: ({ node, inline, className, children, ...props }) => {
                                                return inline ? (
                                                    <code className="chatgpt-code" {...props}>
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            },
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="whitespace-pre-wrap text-white">{message.content}</p>
                                )}
                            </div>
                        )}

                        {/* Enhanced Action buttons */}
                        {!isEditing && !isLoading && !showTyping && (
                            <div className="mt-3 chatgpt-message-actions">
                                <EnhancedMessageActions
                                    messageId={message.id}
                                    content={message.content}
                                    isUser={isUser}
                                    isLast={isLast}
                                    isLoading={isLoading || false}
                                    isStreaming={showTyping}
                                    onEdit={(messageId, content) => {
                                        setIsEditing(true)
                                        setEditContent(content)
                                    }}
                                    onRegenerate={onRegenerate}
                                    onFeedback={(messageId, type) => {
                                        console.log(`Feedback for ${messageId}: ${type}`)
                                        announce(`Message marked as ${type}`)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}