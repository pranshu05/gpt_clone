"use client"

import type React from "react"

import { useState } from "react"
import type { Message } from "ai"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Edit3, RotateCcw, Check, X, User, Bot, ThumbsUp, ThumbsDown, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface ChatMessageProps {
    message: Message
    isLast: boolean
    onEdit: (messageId: string, newContent: string) => void
    onRegenerate: (messageId: string) => void
    isLoading?: boolean
}

export function ChatMessage({ message, isLast, onEdit, onRegenerate, isLoading }: ChatMessageProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(message.content)
    const [copied, setCopied] = useState(false)

    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        toast({ title: "Copied to clipboard" })
        setTimeout(() => setCopied(false), 2000)
    }

    const handleEdit = () => {
        if (isEditing) {
            onEdit(message.id, editContent)
            setIsEditing(false)
        } else {
            setIsEditing(true)
        }
    }

    const handleCancelEdit = () => {
        setEditContent(message.content)
        setIsEditing(false)
    }

    return (
        <div
            className={cn(
                "group relative flex gap-4 p-4 rounded-lg transition-colors",
                isUser ? "bg-transparent" : "bg-gray-50 dark:bg-gray-700/50",
            )}
            role="article"
            aria-label={`${isUser ? "Your" : "Assistant"} message`}
        >
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                    className={cn("text-xs font-medium", isUser ? "bg-blue-600 text-white" : "bg-green-600 text-white")}
                >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{isUser ? "You" : "ChatGPT"}</span>
                </div>

                {isEditing ? (
                    <div className="space-y-3">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px] resize-none"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleEdit}>
                                <Check className="h-4 w-4 mr-1" />
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        {isAssistant ? (
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
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                    </div>
                )}

                {/* File attachments */}
                {message.experimental_attachments && message.experimental_attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {message.experimental_attachments.map((attachment, index) => (
                            <div key={index} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                {attachment.contentType?.startsWith("image/") ? (
                                    <img
                                        src={attachment.url || "/placeholder.svg"}
                                        alt={attachment.name || "Uploaded image"}
                                        className="max-w-sm rounded"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="text-sm">{attachment.name}</span>
                                        <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline text-sm"
                                        >
                                            View
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex items-center gap-1 mt-2">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                {!isEditing && (
                    <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2" aria-label="Copy message">
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>

                        {isUser && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="h-8 px-2"
                                aria-label="Edit message"
                            >
                                <Edit3 className="h-3 w-3" />
                            </Button>
                        )}

                        {isAssistant && isLast && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRegenerate(message.id)}
                                className="h-8 px-2"
                                aria-label="Regenerate response"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}

                        {isAssistant && (
                            <>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                    <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                    <ThumbsDown className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
