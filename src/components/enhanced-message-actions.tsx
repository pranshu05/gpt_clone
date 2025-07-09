"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Copy,
    Edit3,
    RotateCcw,
    Check,
    ThumbsUp,
    ThumbsDown,
    Share,
    MoreHorizontal,
    BookmarkPlus,
    Flag,
    Download,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { useAnnouncer } from "./accessibility-announcer"

interface EnhancedMessageActionsProps {
    messageId: string
    content: string
    isUser: boolean
    isLast: boolean
    isLoading: boolean
    isStreaming: boolean
    onEdit: (messageId: string, newContent: string) => void
    onRegenerate: (messageId: string) => void
    onFeedback?: (messageId: string, type: "positive" | "negative") => void
}

export function EnhancedMessageActions({
    messageId,
    content,
    isUser,
    isLast,
    isLoading,
    isStreaming,
    onRegenerate,
    onFeedback,
}: EnhancedMessageActionsProps) {
    const [copied, setCopied] = useState(false)
    const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null)
    const { announce } = useAnnouncer()

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content)
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

    const handleFeedback = (type: "positive" | "negative") => {
        setFeedback(type)
        onFeedback?.(messageId, type)
        announce(`Marked message as ${type}`)
        toast({
            title: `Feedback recorded`,
            description: `Message marked as ${type}`,
        })
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "ChatGPT Conversation",
                    text: content,
                })
                announce("Message shared")
            } catch (error) {
                console.error("Share failed:", error)
            }
        } else {
            // Fallback to copy
            handleCopy()
        }
    }

    const handleBookmark = () => {
        // Store in localStorage for now
        const bookmarks = JSON.parse(localStorage.getItem("chatgpt-bookmarks") || "[]")
        const bookmark = {
            id: messageId,
            content: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
            fullContent: content,
            timestamp: new Date().toISOString(),
            isUser,
        }
        bookmarks.push(bookmark)
        localStorage.setItem("chatgpt-bookmarks", JSON.stringify(bookmarks))

        toast({ title: "Message bookmarked" })
        announce("Message bookmarked")
    }

    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `message-${messageId}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({ title: "Message downloaded" })
        announce("Message downloaded")
    }

    const handleReport = () => {
        toast({
            title: "Message reported",
            description: "Thank you for your feedback",
        })
        announce("Message reported")
    }

    if (isLoading || isStreaming) return null

    return (
        <div className="flex items-center gap-1 message-actions" role="toolbar" aria-label="Message actions">
            {/* Primary actions */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg chatgpt-button"
                aria-label="Copy message"
            >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>

            {/* Assistant-specific actions */}
            {!isUser && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback("positive")}
                        className={`h-8 w-8 p-0 rounded-lg chatgpt-button ${feedback === "positive"
                                ? "text-green-400 bg-green-900/20"
                                : "text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                            }`}
                        aria-label="Like message"
                    >
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback("negative")}
                        className={`h-8 w-8 p-0 rounded-lg chatgpt-button ${feedback === "negative"
                                ? "text-red-400 bg-red-900/20"
                                : "text-gray-400 hover:text-white hover:bg-[#2f2f2f]"
                            }`}
                        aria-label="Dislike message"
                    >
                        <ThumbsDown className="h-4 w-4" />
                    </Button>
                    {isLast && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRegenerate(messageId)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg chatgpt-button"
                            aria-label="Regenerate response"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    )}
                </>
            )}

            {/* User-specific actions */}
            {isUser && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        // This would trigger edit mode in the parent component
                        const editEvent = new CustomEvent("editMessage", {
                            detail: { messageId, content },
                        })
                        window.dispatchEvent(editEvent)
                    }}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg chatgpt-button"
                    aria-label="Edit message"
                >
                    <Edit3 className="h-4 w-4" />
                </Button>
            )}

            {/* More actions dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2f2f2f] rounded-lg chatgpt-button"
                        aria-label="More options"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#2d2d2d] border-[#4d4d4d] text-white chatgpt-dropdown">
                    <DropdownMenuItem onClick={handleShare} className="chatgpt-dropdown-item">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBookmark} className="chatgpt-dropdown-item">
                        <BookmarkPlus className="h-4 w-4 mr-2" />
                        Bookmark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload} className="chatgpt-dropdown-item">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#4d4d4d]" />
                    <DropdownMenuItem onClick={handleReport} className="chatgpt-dropdown-item text-red-400 hover:text-red-300">
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}