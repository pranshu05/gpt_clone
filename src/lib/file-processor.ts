import pdf from "pdf-parse"
import mammoth from "mammoth"

interface ProcessedFile {
    content: string
    metadata: {
        filename: string
        size: number
        type: string
        pages?: number
        wordCount?: number
    }
}

export class FileProcessor {
    static async processFile(file: File, buffer: Buffer): Promise<ProcessedFile | null> {
        try {
            switch (file.type) {
                case "text/plain":
                case "text/csv":
                case "text/markdown":
                    return this.processTextFile(file, buffer)

                case "application/json":
                    return this.processJsonFile(file, buffer)

                case "application/pdf":
                    return await this.processPdfFile(file, buffer)

                case "application/msword":
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    return await this.processWordFile(file, buffer)

                default:
                    return null
            }
        } catch (error) {
            console.error("File processing error:", error)
            return null
        }
    }

    private static processTextFile(file: File, buffer: Buffer): ProcessedFile {
        const content = buffer.toString("utf-8")
        const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length

        return {
            content,
            metadata: {
                filename: file.name,
                size: file.size,
                type: file.type,
                wordCount,
            },
        }
    }

    private static processJsonFile(file: File, buffer: Buffer): ProcessedFile {
        try {
            const jsonContent = JSON.parse(buffer.toString("utf-8"))
            const content = JSON.stringify(jsonContent, null, 2)

            return {
                content,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    wordCount: content.split(/\s+/).length,
                },
            }
        } catch {
            // Fallback to raw text if JSON parsing fails
            return this.processTextFile(file, buffer)
        }
    }

    private static async processPdfFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        try {
            const pdfData = await pdf(buffer)
            return {
                content: pdfData.text,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    pages: pdfData.numpages,
                    wordCount: pdfData.text.split(/\s+/).filter((word) => word.length > 0).length,
                },
            }
        } catch (error) {
            console.error("PDF processing error:", error)
            return {
                content: `[PDF File: ${file.name}]\nError processing PDF content.`,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    pages: 0,
                },
            }
        }
    }

    private static async processWordFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        try {
            const result = await mammoth.extractRawText({ buffer })
            return {
                content: result.value,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    wordCount: result.value.split(/\s+/).filter((word) => word.length > 0).length,
                },
            }
        } catch (error) {
            console.error("Word processing error:", error)
            return {
                content: `[Word Document: ${file.name}]\nError processing document content.`,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                },
            }
        }
    }
}