/* eslint-disable @next/next/no-img-element */
"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Square, Plus, Mic, Zap, X, FileText, ImageIcon, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDropzone } from "react-dropzone"
import { toast } from "@/hooks/use-toast"
import { useAnnouncer } from "./accessibility-announcer"

interface ChatInputProps {
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    stop: () => void
    setInput: React.Dispatch<React.SetStateAction<string>>
    userId?: string
    onFilesAttached?: (files: UploadedFile[]) => void
}

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

export function ChatInput({
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    userId,
    onFilesAttached,
}: ChatInputProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { announce } = useAnnouncer()

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return

            setIsUploading(true)
            announce(`Uploading ${acceptedFiles.length} file(s)`)

            const uploadPromises = acceptedFiles.map(async (file) => {
                try {
                    const formData = new FormData()
                    formData.append("file", file)
                    formData.append("userId", userId || "default-user")

                    const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.statusText}`)
                    }

                    const uploadedFile: UploadedFile = await response.json()

                    // Create preview for images
                    if (uploadedFile.isImage) {
                        uploadedFile.preview = uploadedFile.url
                    }

                    return uploadedFile
                } catch (error) {
                    console.error("Upload error:", error)
                    toast({
                        title: "Upload failed",
                        description: `Failed to upload ${file.name}`,
                        variant: "destructive",
                    })
                    announce(`Failed to upload ${file.name}`)
                    return null
                }
            })

            const results = await Promise.all(uploadPromises)
            const successfulUploads = results.filter((file): file is UploadedFile => file !== null)

            setUploadedFiles((prev) => {
                const newFiles = [...prev, ...successfulUploads]
                // Notify parent component about attached files
                if (onFilesAttached) {
                    onFilesAttached(newFiles)
                }
                return newFiles
            })
            setIsUploading(false)

            if (successfulUploads.length > 0) {
                toast({
                    title: "Files uploaded",
                    description: `Successfully uploaded ${successfulUploads.length} file(s)`,
                })
                announce(`Successfully uploaded ${successfulUploads.length} file(s)`)
            }
        },
        [userId, onFilesAttached, announce],
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
        noClick: true,
    })

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

    const removeFile = (fileId: string) => {
        setUploadedFiles((prev) => {
            const fileToRemove = prev.find((f) => f.id === fileId)
            const newFiles = prev.filter((file) => file.id !== fileId)

            if (fileToRemove) {
                announce(`Removed ${fileToRemove.name}`)
            }

            // Notify parent component about file removal
            if (onFilesAttached) {
                onFilesAttached(newFiles)
            }
            return newFiles
        })
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // The parent component will handle the files through onFilesAttached
        // Just submit the form normally
        handleSubmit(e)

        // Clear files after submission
        setUploadedFiles([])
        if (onFilesAttached) {
            onFilesAttached([])
        }
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-4">
            {/* File previews */}
            {uploadedFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2" role="region" aria-label="Attached files">
                    {uploadedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-2 bg-[#2f2f2f] border border-[#4d4d4d] rounded-lg p-2 max-w-xs"
                            role="listitem"
                        >
                            {file.isImage ? (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={file.url || "/placeholder.svg"}
                                        alt={`Preview of ${file.name}`}
                                        className="w-8 h-8 object-cover rounded"
                                    />
                                    <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                                </div>
                            ) : (
                                <FileText className="h-4 w-4 text-green-400 shrink-0" aria-hidden="true" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{file.name}</p>
                                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-[#4d4d4d] rounded shrink-0 focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="relative">
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative bg-[#2f2f2f] border border-[#4d4d4d] rounded-3xl transition-all duration-200 chatgpt-input",
                        isDragActive && "border-[#565656] bg-[#3f3f3f]",
                        "focus-within:border-[#565656]",
                    )}
                >
                    <input {...getInputProps()} />

                    {isDragActive && (
                        <div className="absolute inset-0 bg-[#3f3f3f] bg-opacity-90 rounded-3xl flex items-center justify-center z-10">
                            <div className="text-center text-white">
                                <Paperclip className="h-8 w-8 mx-auto mb-2" aria-hidden="true" />
                                <p>Drop files here to upload</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-end gap-2 p-3">
                        {/* Attachment button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isUploading}
                            aria-label="Attach files"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>

                        {/* Text input */}
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChangeWithResize}
                            onKeyDown={handleKeyDown}
                            placeholder={isDragActive ? "Drop files here..." : isUploading ? "Uploading files..." : "Ask anything"}
                            className="flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base leading-6"
                            disabled={isLoading || isUploading}
                            rows={1}
                            aria-label="Message input"
                        />

                        {/* Tools button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                            aria-label="AI Tools"
                        >
                            <Zap className="h-4 w-4 mr-1" aria-hidden="true" />
                            Tools
                        </Button>

                        {/* Submit/Stop button */}
                        <Button
                            type={isLoading ? "button" : "submit"}
                            size="sm"
                            className={cn(
                                "h-8 w-8 p-0 rounded-lg shrink-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#10a37f]",
                                (input.trim() || uploadedFiles.length > 0) && !isLoading
                                    ? "bg-white text-black hover:bg-gray-200"
                                    : "bg-[#4d4d4d] text-gray-400 cursor-not-allowed",
                            )}
                            onClick={isLoading ? stop : undefined}
                            disabled={(!input.trim() && uploadedFiles.length === 0 && !isLoading) || isUploading}
                            aria-label={isLoading ? "Stop generation" : "Send message"}
                        >
                            {isLoading ? (
                                <Square className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Send className="h-4 w-4" aria-hidden="true" />
                            )}
                        </Button>

                        {/* Microphone button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                            aria-label="Voice input"
                        >
                            <Mic className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
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
                    aria-hidden="true"
                />
            </form>

            <p className="text-xs text-gray-400 text-center mt-2">ChatGPT can make mistakes. Check important info.</p>
        </div>
    )
}