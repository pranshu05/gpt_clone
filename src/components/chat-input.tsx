/* eslint-disable @next/next/no-img-element */
"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Square, Plus, Mic, Zap, X, FileText, ImageIcon, Paperclip, Upload, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDropzone } from "react-dropzone"
import { toast } from "@/hooks/use-toast"
import { useAnnouncer } from "./accessibility-announcer"
import { Progress } from "@/components/ui/progress"

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
    uploadProgress?: number
    processingStatus?: "pending" | "processing" | "completed" | "failed"
    error?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

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
    const [dragCounter, setDragCounter] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { announce } = useAnnouncer()

    // Auto-resize textarea
    useEffect(() => {
        adjustTextareaHeight()
    }, [input])

    const onDrop = useCallback(
        async (acceptedFiles: File[], rejectedFiles: import("react-dropzone").FileRejection[]) => {
            // Handle rejected files
            if (rejectedFiles.length > 0) {
                const errors = rejectedFiles.map(({ file, errors }) => ({
                    file: file.name,
                    errors: errors.map((e: import("react-dropzone").FileError) => e.message),
                }))

                toast({
                    title: "Some files were rejected",
                    description: errors.map((e) => `${e.file}: ${e.errors.join(", ")}`).join("\n"),
                    variant: "destructive",
                })
            }

            if (acceptedFiles.length === 0) return

            // Check total file limit
            if (uploadedFiles.length + acceptedFiles.length > MAX_FILES) {
                toast({
                    title: "Too many files",
                    description: `Maximum ${MAX_FILES} files allowed`,
                    variant: "destructive",
                })
                return
            }

            setIsUploading(true)
            announce(`Uploading ${acceptedFiles.length} file(s)`)

            const uploadPromises = acceptedFiles.map(async (file, index) => {
                const tempId = `temp-${Date.now()}-${index}`

                try {
                    // Add file to state immediately with pending status
                    const tempFile: UploadedFile = {
                        id: tempId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: "",
                        isImage: file.type.startsWith("image/"),
                        isDocument: !file.type.startsWith("image/"),
                        uploadProgress: 0,
                        processingStatus: "pending",
                    }

                    setUploadedFiles((prev) => [...prev, tempFile])

                    // Create FormData
                    const formData = new FormData()
                    formData.append("file", file)
                    formData.append("userId", userId || "default-user")

                    // Upload with progress tracking
                    const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.statusText}`)
                    }

                    const uploadedFile: UploadedFile = await response.json()

                    // Update file with real data
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === tempId
                                ? {
                                    ...uploadedFile,
                                    uploadProgress: 100,
                                    processingStatus: uploadedFile.processedContent ? "completed" : "processing",
                                }
                                : f,
                        ),
                    )

                    // Create preview for images
                    if (uploadedFile.isImage && file) {
                        const previewUrl = URL.createObjectURL(file)
                        setUploadedFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, preview: previewUrl } : f)))
                    }

                    // Trigger webhook for file processing
                    if (process.env.NEXT_PUBLIC_WEBHOOK_URL) {
                        fetch("/api/webhooks", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                type: "file.uploaded",
                                data: {
                                    fileId: uploadedFile.id,
                                    userId: userId || "default-user",
                                    filename: uploadedFile.name,
                                    fileType: uploadedFile.type,
                                    size: uploadedFile.size,
                                },
                            }),
                        }).catch(console.error)
                    }

                    return uploadedFile
                } catch (error) {
                    console.error("Upload error:", error)

                    // Update file with error status
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === tempId
                                ? {
                                    ...f,
                                    processingStatus: "failed",
                                    error: error instanceof Error ? error.message : "Upload failed",
                                }
                                : f,
                        ),
                    )

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

            setIsUploading(false)

            if (successfulUploads.length > 0) {
                toast({
                    title: "Files uploaded",
                    description: `Successfully uploaded ${successfulUploads.length} file(s)`,
                })
                announce(`Successfully uploaded ${successfulUploads.length} file(s)`)

                // Notify parent component
                if (onFilesAttached) {
                    onFilesAttached(uploadedFiles.filter((f) => f.processingStatus !== "failed"))
                }
            }
        },
        [userId, onFilesAttached, announce, uploadedFiles],
    )

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
            "text/*": [".txt", ".md", ".csv"],
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/json": [".json"],
        },
        maxSize: MAX_FILE_SIZE,
        maxFiles: MAX_FILES,
        multiple: true,
        noClick: true,
        onDragEnter: () => setDragCounter((prev) => prev + 1),
        onDragLeave: () => setDragCounter((prev) => prev - 1),
        onDropAccepted: () => setDragCounter(0),
        onDropRejected: () => setDragCounter(0),
    })

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (!isLoading && (input.trim() || uploadedFiles.some((f) => f.processingStatus !== "failed"))) {
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

                // Clean up preview URL
                if (fileToRemove.preview && fileToRemove.preview.startsWith("blob:")) {
                    URL.revokeObjectURL(fileToRemove.preview)
                }
            }

            // Notify parent component
            if (onFilesAttached) {
                onFilesAttached(newFiles.filter((f) => f.processingStatus !== "failed"))
            }
            return newFiles
        })
    }

    const retryUpload = async (fileId: string) => {
        const file = uploadedFiles.find((f) => f.id === fileId)
        if (!file) return

        // This would require storing the original File object
        // For now, just show a message
        toast({
            title: "Retry upload",
            description: "Please re-select the file to retry upload",
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

        // Check if there are any failed uploads
        const failedUploads = uploadedFiles.filter((f) => f.processingStatus === "failed")
        if (failedUploads.length > 0) {
            toast({
                title: "Failed uploads detected",
                description: "Please remove failed uploads or retry before sending",
                variant: "destructive",
            })
            return
        }

        // Submit the form
        handleSubmit(e)

        // Clear files after submission
        uploadedFiles.forEach((file) => {
            if (file.preview && file.preview.startsWith("blob:")) {
                URL.revokeObjectURL(file.preview)
            }
        })
        setUploadedFiles([])
        if (onFilesAttached) {
            onFilesAttached([])
        }
    }

    const getFileIcon = (file: UploadedFile) => {
        if (file.isImage) {
            return <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
        }
        return <FileText className="h-4 w-4 text-green-400 shrink-0" aria-hidden="true" />
    }

    const getStatusColor = (status: UploadedFile["processingStatus"]) => {
        switch (status) {
            case "completed":
                return "text-green-400"
            case "processing":
                return "text-yellow-400"
            case "failed":
                return "text-red-400"
            default:
                return "text-gray-400"
        }
    }

    const canSubmit =
        !isLoading &&
        !isUploading &&
        (input.trim() || uploadedFiles.some((f) => f.processingStatus !== "failed")) &&
        uploadedFiles.every((f) => f.processingStatus !== "pending")

    return (
        <div className="w-full max-w-3xl mx-auto px-4 pb-4">
            {/* File previews */}
            {uploadedFiles.length > 0 && (
                <div className="mb-4 space-y-2" role="region" aria-label="Attached files">
                    {uploadedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 bg-[#2f2f2f] border border-[#4d4d4d] rounded-lg p-3"
                            role="listitem"
                        >
                            {file.isImage && file.preview ? (
                                <img
                                    src={file.preview || "/placeholder.svg"}
                                    alt={`Preview of ${file.name}`}
                                    className="w-10 h-10 object-cover rounded"
                                />
                            ) : (
                                getFileIcon(file)
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-white truncate font-medium">{file.name}</p>
                                    <span className={cn("text-xs", getStatusColor(file.processingStatus))}>{file.processingStatus}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                    {file.uploadProgress !== undefined && file.uploadProgress < 100 && (
                                        <div className="flex-1 max-w-[100px]">
                                            <Progress value={file.uploadProgress} className="h-1" />
                                        </div>
                                    )}
                                </div>
                                {file.error && <p className="text-xs text-red-400 mt-1">{file.error}</p>}
                            </div>

                            <div className="flex items-center gap-1">
                                {file.processingStatus === "failed" && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => retryUpload(file.id)}
                                        className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-[#4d4d4d] rounded shrink-0"
                                        aria-label={`Retry upload ${file.name}`}
                                    >
                                        <Upload className="h-3 w-3" />
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(file.id)}
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-[#4d4d4d] rounded shrink-0"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="relative">
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative bg-[#2f2f2f] border border-[#4d4d4d] rounded-3xl transition-all duration-200 chatgpt-input",
                        isDragActive && !isDragReject && "border-[#10a37f] bg-[#2a3f37]",
                        isDragReject && "border-red-500 bg-[#3f2a2a]",
                        dragCounter > 0 && "border-[#565656] bg-[#3f3f3f]",
                        "focus-within:border-[#565656]",
                    )}
                >
                    <input {...getInputProps()} />

                    {(isDragActive || dragCounter > 0) && (
                        <div className="absolute inset-0 bg-[#3f3f3f] bg-opacity-90 rounded-3xl flex items-center justify-center z-10">
                            <div className="text-center text-white">
                                {isDragReject ? (
                                    <>
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                                        <p className="text-red-400">Some files are not supported</p>
                                    </>
                                ) : (
                                    <>
                                        <Paperclip className="h-8 w-8 mx-auto mb-2 text-[#10a37f]" />
                                        <p>Drop files here to upload</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-end gap-2 p-3">
                        {/* Attachment button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isUploading || uploadedFiles.length >= MAX_FILES}
                            aria-label="Attach files"
                        >
                            <Plus className="h-4 w-4" />
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
                            className="h-8 px-3 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0 text-sm font-medium"
                            aria-label="AI Tools"
                        >
                            <Zap className="h-4 w-4 mr-1" />
                            Tools
                        </Button>

                        {/* Submit/Stop button */}
                        <Button
                            type={isLoading ? "button" : "submit"}
                            size="sm"
                            className={cn(
                                "h-8 w-8 p-0 rounded-lg shrink-0 transition-all duration-200",
                                canSubmit ? "bg-white text-black hover:bg-gray-200" : "bg-[#4d4d4d] text-gray-400 cursor-not-allowed",
                            )}
                            onClick={isLoading ? stop : undefined}
                            disabled={!canSubmit && !isLoading}
                            aria-label={isLoading ? "Stop generation" : "Send message"}
                        >
                            {isLoading ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>

                        {/* Microphone button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#4d4d4d] rounded-lg shrink-0"
                            aria-label="Voice input"
                        >
                            <Mic className="h-4 w-4" />
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
                            onDrop(files, [])
                        }
                        // Reset input
                        e.target.value = ""
                    }}
                    className="hidden"
                    aria-hidden="true"
                />
            </form>

            <p className="text-xs text-gray-400 text-center mt-2">ChatGPT can make mistakes. Check important info.</p>
        </div>
    )
}