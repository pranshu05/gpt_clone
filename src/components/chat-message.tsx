"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Message } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Edit3, RotateCcw, Check, X, User, ThumbsUp, ThumbsDown, Share, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { TypingAnimation, LoadingDots } from "./typing-animation"

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
    const [copied, setCopied] = useState(false)
    const [showTyping, setShowTyping] = useState(false)

    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    // Show typing animation for new assistant messages
    useEffect(() => {
        if (isAssistant && isLast && !isLoading && message.content && !showTyping && message.content.length > 0) {
            setShowTyping(true)
        }
    }, [isAssistant, isLast, isLoading, message.content, showTyping])

    // Reset edit content when message changes
    useEffect(() => {
        setEditContent(message.content)
    }, [message.content])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        toast({ title: "Copied to clipboard" })
        setTimeout(() => setCopied(false), 2000)
    }

    const handleEdit = () => {
        if (isEditing) {
            if (editContent.trim() !== message.content) {
                onEdit(message.id, editContent.trim())
            }
            setIsEditing(false)
        } else {
            setIsEditing(true)
        }
    }

    const handleCancelEdit = () => {
        setEditContent(message.content)
        setIsEditing(false)
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
        <div className={cn("group w-full", isUser ? "bg-[#2f2f2f]" : "bg-[#212121]")}>
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {isUser ? (
                            <div className="w-8 h-8 bg-[#4d4d4d] rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center">
                                <div className="w-4 h-4 bg-white rounded-sm"></div>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm text-white">{isUser ? "You" : "ChatGPT"}</span>
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="min-h-[100px] resize-none bg-[#2f2f2f] border-[#4d4d4d] text-white"
                                    autoFocus
                                    placeholder="Edit your message..."
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleEdit} className="bg-[#10a37f] hover:bg-[#0d8f6b] text-white">
                                        <Check className="h-4 w-4 mr-1" />
                                        Save & Submit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="border-[#4d4d4d] text-white hover:bg-[#2f2f2f] bg-transparent"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">Press Ctrl+Enter to save, Escape to cancel</p>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none">
                                {isLoading && isLast ? (
                                    <LoadingDots />
                                ) : isAssistant && showTyping && isLast ? (
                                    <TypingAnimation text={message.content} speed={20} onComplete={() => setShowTyping(false)} />
                                ) : isAssistant ? (
                                    <ReactMarkdown
                                        components={{
                                            code({
                                                inline,
                                                className,
                                                children,
                                                ...props
                                            }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
                                                const match = /language-(\w+)/.exec(className || "")
                                                return !inline && match ? (
                                                    <SyntaxHighlighter
                                                        style={oneDark as { [key: string]: React.CSSProperties }}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        className="rounded-md"
                                                        {...props}
                                                    >
                                                        {String(children).replace(/\n$/, "")}
                                                    </SyntaxHighlighter>
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

                        {/* Action buttons */}
                        {!isEditing && !isLoading && !showTyping && (
                            <div className="flex items-center gap-1 mt-3 message-actions">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>

                                {isAssistant && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                        >
                                            <ThumbsUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                        >
                                            <ThumbsDown className="h-4 w-4" />
                                        </Button>
                                        {isLast && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRegenerate(message.id)}
                                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                                title="Regenerate response"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                )}

                                {isUser && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                        title="Edit message"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                >
                                    <Share className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}