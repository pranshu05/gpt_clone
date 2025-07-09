"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Message } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Copy,
    Edit3,
    RotateCcw,
    Check,
    X,
    User,
    ThumbsUp,
    ThumbsDown,
    Share,
    MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github-dark.css"
import { TypingAnimation, LoadingDots } from "./typing-animation"
import { useAnnouncer } from "./accessibility-announcer"

interface ChatMessageProps {
    message: Message
    isLast: boolean
    onEdit: (messageId: string, newContent: string) => void
    onRegenerate: (messageId: string) => void
    isLoading?: boolean
    isStreaming?: boolean
}

export function ChatMessage({
    message,
    isLast,
    onEdit,
    onRegenerate,
    isLoading,
}: ChatMessageProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)
    const [copied, setCopied] = useState(false)
    const [showTyping, setShowTyping] = useState(false)
    const { announce } = useAnnouncer()

    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    useEffect(() => {
        if (
            isAssistant &&
            isLast &&
            !isLoading &&
            message.content &&
            !showTyping &&
            message.content.length > 0
        ) {
            setShowTyping(true)
        }
    }, [isAssistant, isLast, isLoading, message.content, showTyping])

    useEffect(() => {
        setEditContent(message.content)
    }, [message.content])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content)
            setCopied(true)
            toast({ title: "Copied to clipboard" })
            announce("Message copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error("Failed to copy:", error)
            toast({
                title: "Copy failed",
                description: "Unable to copy to clipboard",
                variant: "destructive",
            })
        }
    }

    const handleEdit = () => {
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
    }

    const handleCancelEdit = () => {
        setEditContent(message.content)
        setIsEditing(false)
        announce("Edit cancelled")
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleEdit()
        } else if (e.key === "Escape") {
            e.preventDefault()
            handleCancelEdit()
        }
    }

    return (
        <div
            className={cn(
                "group w-full message-container",
                isUser
                    ? "bg-[#2f2f2f] chatgpt-message-user"
                    : "bg-[#212121] chatgpt-message-assistant"
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
                                className="w-8 h-8 bg-[#4d4d4d] rounded-full flex items-center justify-center"
                                role="img"
                                aria-label="User avatar"
                            >
                                <User className="h-4 w-4 text-white" aria-hidden="true" />
                            </div>
                        ) : (
                            <div
                                className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center"
                                role="img"
                                aria-label="ChatGPT avatar"
                            >
                                <div className="w-4 h-4 bg-white rounded-sm" aria-hidden="true"></div>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm text-white">
                                {isUser ? "You" : "ChatGPT"}
                            </span>
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
                                        className="bg-[#10a37f] hover:bg-[#0d8f6b] text-white focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    >
                                        <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                                        Save & Submit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="border-[#4d4d4d] text-white hover:bg-[#2f2f2f] bg-transparent focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    >
                                        <X className="h-4 w-4 mr-1" aria-hidden="true" />
                                        Cancel
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Press Ctrl+Enter to save, Escape to cancel
                                </p>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none">
                                {isLoading && isLast ? (
                                    <LoadingDots />
                                ) : isAssistant && showTyping && isLast ? (
                                    <TypingAnimation
                                        text={message.content}
                                        speed={20}
                                        onComplete={() => setShowTyping(false)}
                                    />
                                ) : isAssistant ? (
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="whitespace-pre-wrap text-white">{message.content}</p>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        {!isEditing && !isLoading && !showTyping && (
                            <div
                                className="flex items-center gap-1 mt-3 message-actions"
                                role="toolbar"
                                aria-label="Message actions"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    aria-label="Copy message"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Copy className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </Button>

                                {isAssistant && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                            aria-label="Like message"
                                        >
                                            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                            aria-label="Dislike message"
                                        >
                                            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                        {isLast && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRegenerate(message.id)}
                                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                                aria-label="Regenerate response"
                                            >
                                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                        )}
                                    </>
                                )}

                                {isUser && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                        aria-label="Edit message"
                                    >
                                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    aria-label="Share message"
                                >
                                    <Share className="h-4 w-4" aria-hidden="true" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                    aria-label="More options"
                                >
                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}