import type { ObjectId } from "mongodb"

export interface ChatDocument {
    _id?: ObjectId
    id: string
    userId: string
    title: string
    messages: MessageDocument[]
    createdAt: Date
    updatedAt: Date
}

export interface MessageDocument {
    id: string
    role: "user" | "assistant" | "system"
    content: string
    attachments?: AttachmentDocument[]
    createdAt: Date
}

export interface AttachmentDocument {
    id: string
    name: string
    type: string
    size: number
    url: string
    cloudinaryId?: string
    processedContent?: string
}

export interface MemoryDocument {
    _id?: ObjectId
    id: string
    userId: string
    content: string
    embedding?: number[]
    metadata?: Record<string, unknown>
    createdAt: Date
}