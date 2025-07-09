import { type NextRequest, NextResponse } from "next/server"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { FileProcessor } from "@/lib/file-processor"
import { connectToDatabase } from "@/lib/mongodb"

// Supported file types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
const SUPPORTED_DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File
        const userId = (formData.get("userId") as string) || "default-user"

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large. Maximum size is 10MB" }, { status: 400 })
        }

        // Validate file type
        const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type)
        const isDocument = SUPPORTED_DOCUMENT_TYPES.includes(file.type)

        if (!isImage && !isDocument) {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary
        const resourceType = isImage ? "image" : "raw"
        const uploadResult = await uploadToCloudinary(buffer, file.name, resourceType)

        // Process file content if it's a document
        let processedContent = null
        if (isDocument) {
            const processed = await FileProcessor.processFile(file, buffer)
            processedContent = processed?.content || null
        }

        // Store file metadata in database
        await connectToDatabase()

        const fileData = {
            id: uploadResult.public_id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            userId,
            isImage,
            isDocument,
            processedContent,
            uploadedAt: new Date().toISOString(),
        }

        return NextResponse.json(fileData)
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }
}