import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { MemoryManager } from "@/lib/memory-manager"
import { ContextWindowManager } from "@/lib/context-window-manager"

export const maxDuration = 30

const memoryManager = new MemoryManager(
    process.env.MONGODB_URI || "",
    process.env.MONGODB_DB || "gpt_clone",
    process.env.MONGODB_COLLECTION || "memories",
)
const contextManager = new ContextWindowManager()

export async function POST(req: NextRequest) {
    try {
        const { messages, userId = "default-user", chatId } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "Invalid messages format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            })
        }

        await connectToDatabase()

        // Extract image URLs from messages for vision models
        const lastMessage = messages[messages.length - 1]
        const hasImages = lastMessage?.content?.includes("[Image uploaded:")

        // Process the message content to extract image URLs and document content
        type MessageRole = "function" | "system" | "tool" | "user" | "assistant" | "data"
        interface Message {
            role: MessageRole
            content: string
            [key: string]: unknown
        }

        const processedMessages = messages.map((msg: Message, idx: number): Message & { id: string } => {
            // Ensure role is properly typed
            const role: MessageRole = msg.role as MessageRole;

            // Always ensure id exists
            const id = typeof msg.id === "string" ? msg.id : `msg-${idx}-${Date.now()}`;

            if (msg.content && (msg.content.includes("[Image uploaded:") || msg.content.includes("[Document:"))) {
                // Extract image URLs from the content
                const imageUrlRegex = /\[Image uploaded: .+ - (https?:\/\/[^\]]+)\]/g
                const documentRegex = /\[Document: ([^\]]+)\]\n([^]*?)(?=\n\[|$)/g

                const imageUrls: string[] = []
                const documents: { name: string; content: string }[] = []

                let match
                while ((match = imageUrlRegex.exec(msg.content)) !== null) {
                    imageUrls.push(match[1])
                }

                while ((match = documentRegex.exec(msg.content)) !== null) {
                    documents.push({ name: match[1], content: match[2] })
                }

                // Clean the content and add analysis context
                let cleanContent = msg.content
                    .replace(/\[Image uploaded: .+ - https?:\/\/[^\]]+\]/g, "")
                    .replace(/\[Document: [^\]]+\]\n[^]*?(?=\n\[|$)/g, "")
                    .trim()

                if (imageUrls.length > 0) {
                    cleanContent += `\n\nI have uploaded ${imageUrls.length} image(s). Please analyze the image(s) and describe what you see. The image URLs are: ${imageUrls.join(", ")}`
                }

                if (documents.length > 0) {
                    cleanContent += `\n\nI have uploaded ${documents.length} document(s). Here are the contents:\n\n`
                    documents.forEach((doc, index) => {
                        cleanContent += `Document ${index + 1} (${doc.name}):\n${doc.content}\n\n`
                    })
                }

                return {
                    ...msg,
                    id,
                    role,
                    content: cleanContent,
                }
            }
            return {
                ...msg,
                id,
                role,
            }
        })

        // Get relevant memories with better context
        const currentQuery = processedMessages[processedMessages.length - 1]?.content || ""
        const memories = await memoryManager.getRelevantMemories(userId, currentQuery, 3)

        // Apply context window management BEFORE adding memories
        const managedMessages = contextManager.manageContextWindow(processedMessages, "llama-3.3-70b-versatile", memories)

        // Build the final message array with proper context
        const coreMessages = [
            // Add memory context if available
            ...(memories.length > 0
                ? [
                    {
                        role: "system" as const,
                        content: `Relevant conversation history and context:\n${memories.map((m) => `- ${m.content}`).join("\n")}\n\nUse this context to provide more personalized and contextually aware responses.`,
                    },
                ]
                : []),
            // Add image analysis system prompt if images are present
            ...(hasImages
                ? [
                    {
                        role: "system" as const,
                        content:
                            "You are an AI assistant with vision capabilities. When users share images, analyze them carefully and provide detailed descriptions of what you see, including objects, people, text, colors, composition, and any other relevant details. Be thorough and helpful in your analysis.",
                    },
                ]
                : []),
            ...managedMessages,
        ] as import("ai").CoreMessage[]

        const result = await streamText({
            model: groq("llama-3.3-70b-versatile"),
            messages: coreMessages,
            temperature: 0.7,
            maxTokens: contextManager.getMaxTokensForModel("llama-3.3-70b-versatile"),
            async onFinish(completion) {
                try {
                    // Create comprehensive memory entry
                    const conversationContext = `Chat ID: ${chatId || "new"}\nUser Query: ${currentQuery}\nAssistant Response: ${completion.text}`

                    // Store memory with better context
                    await memoryManager.addMemory(userId, conversationContext, `Conversation from ${new Date().toISOString()}`)

                    // Trigger webhook for completion
                    if (process.env.WEBHOOK_URL) {
                        fetch(process.env.WEBHOOK_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                type: "chat.completed",
                                data: {
                                    userId,
                                    chatId,
                                    messageCount: messages.length,
                                    tokensUsed: completion.usage?.totalTokens || 0,
                                    model: "llama-3.3-70b-versatile",
                                },
                            }),
                        }).catch(console.error)
                    }
                } catch (error) {
                    console.error("Error in onFinish:", error)
                }
            },
        })

        return result.toAIStreamResponse()
    } catch (error) {
        console.error("Chat API error:", error)
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details:
                    process.env.NODE_ENV === "development" && error && typeof error === "object" && "message" in error
                        ? (error as { message?: string }).message
                        : undefined,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        )
    }
}