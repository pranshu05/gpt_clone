import { groq } from "@ai-sdk/groq"
import { convertToCoreMessages, streamText } from "ai"
import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { MemoryManager } from "@/lib/memory-manager"
import { ContextWindowManager } from "@/lib/context-window-manager"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const memoryManager = new MemoryManager(process.env.MONGODB_URI || '', 'gpt_clone', 'memories')
const contextManager = new ContextWindowManager()

export async function POST(req: NextRequest) {
    try {
        const { messages, model = "llama-3.1-8b-instant", userId = "default-user" } = await req.json()

        // Connect to database
        await connectToDatabase()

        // Get relevant memories for context
        const memories = await memoryManager.getRelevantMemories(messages[messages.length - 1]?.content || "", userId)

        // Manage context window - trim messages if needed
        const managedMessages = contextManager.manageContextWindow(messages, model, memories)

        // Convert messages to the format expected by the AI SDK
        const coreMessages = convertToCoreMessages(managedMessages)

        // Add memory context to system message if memories exist
        if (memories.length > 0) {
            const memoryContext = memories.map((m) => m.content).join("\n")
            const systemMessage = {
                role: "system" as const,
                content: `Previous conversation context:\n${memoryContext}\n\nPlease use this context to provide more personalized and relevant responses.`,
            }
            coreMessages.unshift(systemMessage)
        }

        // Stream the response
        const result = streamText({
            model: groq(model),
            messages: coreMessages,
            temperature: 0.7,
            maxTokens: contextManager.getMaxTokensForModel(model),
            onFinish: async (completion) => {
                // Store the conversation in memory
                await memoryManager.addMemory(
                    userId,
                    `User: ${messages[messages.length - 1]?.content}\nAssistant: ${completion.text}`
                )                
            },
        })

        return new Response(result, {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        })
    } catch (error) {
        console.error("Chat API error:", error)
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
}