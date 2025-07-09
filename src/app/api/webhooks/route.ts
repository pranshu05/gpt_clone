import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { deleteFromCloudinary } from "@/lib/cloudinary"

interface WebhookEvent {
    type: string
    data: Record<string, unknown>
    timestamp: string
    id: string
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { type, data, timestamp, id } = body as WebhookEvent

        // Validate webhook payload
        if (!type || !data) {
            return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
        }

        await connectToDatabase()

        // Log webhook event
        await logWebhookEvent({ type, data, timestamp: timestamp || new Date().toISOString(), id: id || generateId() })

        // Handle different webhook types
        switch (type) {
            case "chat.completed":
                await handleChatCompleted(data)
                break

            case "file.uploaded":
                await handleFileUploaded(data)
                break

            case "file.processing.requested":
                await handleFileProcessingRequested(data)
                break

            case "user.feedback":
                await handleUserFeedback(data)
                break

            case "memory.updated":
                await handleMemoryUpdated(data)
                break

            case "chat.exported":
                await handleChatExported(data)
                break

            case "system.maintenance":
                await handleSystemMaintenance(data)
                break

            default:
                console.log("Unknown webhook type:", type)
                return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 })
        }

        return NextResponse.json({ success: true, processed: type })
    } catch (error) {
        console.error("Webhook error:", error)
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
}

async function handleChatCompleted(data: Record<string, unknown>) {
    const { userId, chatId, messageCount, duration } = data

    try {
        const { db } = await connectToDatabase()

        // Update chat analytics
        await db.collection("chat_analytics").insertOne({
            userId,
            chatId,
            messageCount,
            duration,
            completedAt: new Date(),
            type: "completion",
        })

        // Trigger memory consolidation for long chats
        if (typeof messageCount === "number" && messageCount > 20) {
            // Queue memory consolidation job
            await queueBackgroundJob("memory.consolidate", { userId, chatId })
        }

        console.log("Chat completion processed:", { userId, chatId, messageCount })
    } catch (error) {
        console.error("Error handling chat completion:", error)
    }
}

async function handleFileUploaded(data: Record<string, unknown>) {
    const { fileId, userId, filename, fileType, size } = data

    try {
        const { db } = await connectToDatabase()

        // Log file upload
        await db.collection("file_uploads").insertOne({
            fileId,
            userId,
            filename,
            fileType,
            size,
            uploadedAt: new Date(),
            status: "uploaded",
        })

        // Queue file processing if needed
        if (shouldProcessFile(fileType as string)) {
            await queueBackgroundJob("file.process", { fileId, userId, fileType })
        }

        console.log("File upload processed:", { fileId, filename, fileType })
    } catch (error) {
        console.error("Error handling file upload:", error)
    }
}

async function handleFileProcessingRequested(data: Record<string, unknown>) {
    const { fileId, processingType } = data

    try {
        const { db } = await connectToDatabase()

        // Get file details
        const file = await db.collection("file_uploads").findOne({ fileId })
        if (!file) {
            throw new Error(`File not found: ${fileId}`)
        }

        // Update processing status
        await db.collection("file_uploads").updateOne(
            { fileId },
            {
                $set: {
                    status: "processing",
                    processingStartedAt: new Date(),
                    processingType,
                },
            },
        )

        // Process file based on type, this is a placeholder for actual processing logic
        let processedData = null
        switch (processingType) {
            case "text_extraction":
                processedData = await extractTextFromFile()
                break
            case "image_analysis":
                processedData = await analyzeImage()
                break
            case "document_summary":
                processedData = await summarizeDocument()
                break
        }

        // Update with processed results
        await db.collection("file_uploads").updateOne(
            { fileId },
            {
                $set: {
                    status: "processed",
                    processedAt: new Date(),
                    processedData,
                },
            },
        )

        console.log("File processing completed:", { fileId, processingType })
    } catch (error) {
        console.error("Error processing file:", error)

        // Update status to failed
        const { db } = await connectToDatabase()
        await db.collection("file_uploads").updateOne(
            { fileId: data.fileId },
            {
                $set: {
                    status: "failed",
                    error: error instanceof Error ? error.message : "Unknown error",
                    failedAt: new Date(),
                },
            },
        )
    }
}

async function handleUserFeedback(data: Record<string, unknown>) {
    const { userId, chatId, messageId, feedbackType, rating, comment } = data

    try {
        const { db } = await connectToDatabase()

        await db.collection("user_feedback").insertOne({
            userId,
            chatId,
            messageId,
            feedbackType,
            rating,
            comment,
            submittedAt: new Date(),
        })

        // Trigger model improvement if negative feedback
        if (feedbackType === "negative" || (typeof rating === "number" && rating < 3)) {
            await queueBackgroundJob("model.improve", {
                userId,
                chatId,
                messageId,
                feedback: { type: feedbackType, rating, comment },
            })
        }

        console.log("User feedback processed:", { userId, feedbackType, rating })
    } catch (error) {
        console.error("Error handling user feedback:", error)
    }
}

async function handleMemoryUpdated(data: Record<string, unknown>) {
    const { userId, memoryId, operation } = data

    try {
        const { db } = await connectToDatabase()

        await db.collection("memory_events").insertOne({
            userId,
            memoryId,
            operation,
            timestamp: new Date(),
        })

        // Trigger memory optimization if needed
        if (operation === "bulk_update") {
            await queueBackgroundJob("memory.optimize", { userId })
        }

        console.log("Memory update processed:", { userId, memoryId, operation })
    } catch (error) {
        console.error("Error handling memory update:", error)
    }
}

async function handleChatExported(data: Record<string, unknown>) {
    const { userId, chatId, exportFormat, exportUrl } = data

    try {
        const { db } = await connectToDatabase()

        await db.collection("chat_exports").insertOne({
            userId,
            chatId,
            exportFormat,
            exportUrl,
            exportedAt: new Date(),
            status: "completed",
        })

        // Clean up export file after 24 hours
        setTimeout(
            async () => {
                try {
                    if (typeof exportUrl === "string" && exportUrl.includes("cloudinary")) {
                        const publicId = extractCloudinaryPublicId(exportUrl)
                        await deleteFromCloudinary(publicId)
                    }
                } catch (error) {
                    console.error("Error cleaning up export file:", error)
                }
            },
            24 * 60 * 60 * 1000,
        ) // 24 hours

        console.log("Chat export processed:", { userId, chatId, exportFormat })
    } catch (error) {
        console.error("Error handling chat export:", error)
    }
}

async function handleSystemMaintenance(data: Record<string, unknown>) {
    const { maintenanceType, scheduledAt, duration } = data

    try {
        const { db } = await connectToDatabase()

        await db.collection("system_maintenance").insertOne({
            maintenanceType,
            scheduledAt: new Date(scheduledAt as string),
            duration,
            createdAt: new Date(),
            status: "scheduled",
        })

        // Notify users about scheduled maintenance
        await notifyUsersAboutMaintenance(maintenanceType as string, scheduledAt as string, duration as number)

        console.log("System maintenance scheduled:", { maintenanceType, scheduledAt, duration })
    } catch (error) {
        console.error("Error handling system maintenance:", error)
    }
}

// Helper functions
async function logWebhookEvent(event: WebhookEvent) {
    try {
        const { db } = await connectToDatabase()
        await db.collection("webhook_logs").insertOne({
            ...event,
            processedAt: new Date(),
        })
    } catch (error) {
        console.error("Error logging webhook event:", error)
    }
}

async function queueBackgroundJob(jobType: string, jobData: Record<string, unknown>) {
    try {
        const { db } = await connectToDatabase()
        await db.collection("background_jobs").insertOne({
            type: jobType,
            data: jobData,
            status: "queued",
            createdAt: new Date(),
            attempts: 0,
            maxAttempts: 3,
        })
    } catch (error) {
        console.error("Error queueing background job:", error)
    }
}

function shouldProcessFile(fileType: string): boolean {
    const processableTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ]
    return processableTypes.includes(fileType)
}

async function extractTextFromFile(): Promise<string> {
    // Implementation would depend on file type
    // This is a placeholder
    return "Extracted text content"
}

async function analyzeImage(): Promise<Record<string, unknown>> {
    // Implementation would use image analysis service
    // This is a placeholder
    return {
        objects: ["person", "car", "building"],
        colors: ["blue", "red", "green"],
        text: "Detected text in image",
    }
}

async function summarizeDocument(): Promise<string> {
    // Implementation would use AI summarization
    // This is a placeholder
    return "Document summary"
}

function extractCloudinaryPublicId(url: string): string {
    const matches = url.match(/\/([^/]+)\.[^/]+$/)
    return matches ? matches[1] : ""
}

async function notifyUsersAboutMaintenance(type: string, scheduledAt: string, duration: number) {
    // Implementation would send notifications to users
    console.log(`Maintenance notification: ${type} scheduled for ${scheduledAt}, duration: ${duration} minutes`)
}

function generateId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}