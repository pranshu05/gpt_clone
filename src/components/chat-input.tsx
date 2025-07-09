"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Square, Paperclip, ImageIcon, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDropzone } from "react-dropzone"
import { toast } from "@/hooks/use-toast"

interface ChatInputProps {
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    stop: () => void
    setInput: React.Dispatch<React.SetStateAction<string>>
}

interface UploadedFile {
    id: string
    name: string
    type: string
    size: number
    url: string
    preview?: string
    processedContent?: string
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading, stop, setInput }: ChatInputProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            setIsUploading(true)

            try {
                const uploadPromises = acceptedFiles.map(async (file) => {
                    const formData = new FormData()
                    formData.append("file", file)

                    // Add userId to formData
                    formData.append("userId", "default-user") // You can get this from context/props

                    const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!response.ok) {
                        throw new Error("Upload failed")
                    }

                    const result = await response.json()

                    let processedContent: string | undefined = undefined
                    if (file.type.startsWith("text/") || file.type === "application/json") {
                        processedContent = await file.text()
                    } else if (file.type === "application/pdf") {
                        // Implement PDF parsing here if needed
                        processedContent = "PDF parsing not implemented"
                    }

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: result.url,
                        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
                        processedContent: processedContent,
                    }
                })

                const newFiles = await Promise.all(uploadPromises)

                // Add document content to input if it's a text-based file
                const documentContents = newFiles
                    .filter((file) => file.processedContent)
                    .map((file) => `[File: ${file.name}]\n${file.processedContent}`)
                    .join("\n\n")

                if (documentContents && input.trim()) {
                    setInput((prev) => prev + "\n\n" + documentContents)
                } else if (documentContents) {
                    setInput(documentContents)
                }

                setUploadedFiles((prev) => [...prev, ...newFiles])
                toast({ title: "Files uploaded successfully" })
            } catch (error) {
                console.error("Upload error:", error)
                toast({
                    title: "Upload failed",
                    description: "Please try again",
                    variant: "destructive",
                })
            } finally {
                setIsUploading(false)
            }
        },
        [setInput, input],
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
            "text/*": [".txt", ".md", ".csv"],
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/json": [".json"],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        multiple: true,
    })

    const removeFile = (fileId: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (!isLoading && (input.trim() || uploadedFiles.length > 0)) {
                const form = e.currentTarget.closest("form")
                if (form) {
                    const submitEvent = new Event("submit", { bubbles: true, cancelable: true })
                    form.dispatchEvent(submitEvent)
                }
            }
        }
    }

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
        }
    }

    const handleInputChangeWithResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleInputChange(e)
        adjustTextareaHeight()
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    return (
        <div className="space-y-3">
            {/* Uploaded files */}
            {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 text-sm">
                            {file.type.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4 text-blue-500" />
                            ) : (
                                <FileText className="h-4 w-4 text-green-500" />
                            )}
                            <span className="truncate max-w-32">{file.name}</span>
                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSubmit} className="relative">
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative border rounded-xl transition-colors",
                        isDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-950",
                        "focus-within:border-blue-500",
                    )}
                >
                    <input {...getInputProps()} />

                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChangeWithResize}
                        onKeyDown={handleKeyDown}
                        placeholder={isDragActive ? "Drop files here..." : "Message ChatGPT..."}
                        className="min-h-[52px] max-h-[200px] resize-none border-0 focus-visible:ring-0 pr-16 py-3"
                        disabled={isLoading || isUploading}
                        aria-label="Chat message input"
                        aria-describedby="input-help"
                    />

                    {/* File upload button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-3 bottom-3 h-6 w-6 p-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading}
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>

                    {/* Submit/Stop button */}
                    <Button
                        type={isLoading ? "button" : "submit"}
                        size="sm"
                        className="absolute right-3 bottom-3 h-6 w-6 p-0"
                        onClick={isLoading ? stop : undefined}
                        disabled={(!input?.trim() && uploadedFiles.length === 0) || isUploading}
                    >
                        {isLoading ? <Square className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.txt,.md,.csv,.pdf,.doc,.docx,.json"
                    onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length > 0) {
                            onDrop(files)
                        }
                    }}
                    className="hidden"
                />
            </form>

            <p id="input-help" className="text-xs text-gray-500 text-center">
                ChatGPT can make mistakes. Check important info.
            </p>
        </div>
    )
}