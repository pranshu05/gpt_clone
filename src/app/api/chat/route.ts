import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { MemoryManager } from "@/lib/memory-manager"
import { ContextWindowManager } from "@/lib/context-window-manager"

export const maxDuration = 30

const memoryManager = new MemoryManager(process.env.MONGODB_URI || "", "gpt_clone", "memories")
const contextManager = new ContextWindowManager()

export async function POST(req: NextRequest) {
    try {
        const { messages, model = "llama-3.1-8b-instant", userId = "default-user" } = await req.json()

        await connectToDatabase()

        // Extract image URLs from messages for vision models
        const lastMessage = messages[messages.length - 1]
        const hasImages = lastMessage?.content?.includes("[Image uploaded:")

        // Process the message content to extract image URLs
        const processedMessages = messages.map((msg: any) => {
            if (msg.content && msg.content.includes("[Image uploaded:")) {
                // Extract image URLs from the content
                const imageUrlRegex = /\[Image uploaded: .+ - (https?:\/\/[^\]]+)\]/g
                const imageUrls: string[] = []
                let match

                while ((match = imageUrlRegex.exec(msg.content)) !== null) {
                    imageUrls.push(match[1])
                }

                // Clean the content and add image analysis context
                let cleanContent = msg.content.replace(/\[Image uploaded: .+ - https?:\/\/[^\]]+\]/g, "").trim()

                if (imageUrls.length > 0) {
                    cleanContent = `${cleanContent}\n\nI have uploaded ${imageUrls.length} image(s). Please analyze the image(s) and describe what you see. The image URLs are: ${imageUrls.join(", ")}`
                }

                return {
                    ...msg,
                    content: cleanContent,
                }
            }
            return msg
        })

        const memories = await memoryManager.getRelevantMemories(
            userId,
            processedMessages[processedMessages.length - 1]?.content || "",
        )

        const managedMessages = contextManager.manageContextWindow(processedMessages, model, memories)

        const coreMessages = [
            ...(memories.length > 0
                ? [
                    {
                        role: "system" as const,
                        content: `Previous conversation context:\n${memories.map((m) => m.content).join("\n")}`,
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
            model: groq(model),
            messages: coreMessages,
            temperature: 0.7,
            maxTokens: contextManager.getMaxTokensForModel(model),
            async onFinish(completion) {
                await memoryManager.addMemory(
                    userId,
                    `User: ${processedMessages[processedMessages.length - 1]?.content}\nAssistant: ${completion.text}`,
                )
            },
        })

        // ✅ Return compatible event stream for useChat()
        return result.toAIStreamResponse()
    } catch (error) {
        console.error("Chat API error:", error)
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
}