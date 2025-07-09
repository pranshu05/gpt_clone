import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import type { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { MemoryManager } from "@/lib/memory-manager"
import { ContextWindowManager } from "@/lib/context-window-manager"

export const maxDuration = 30

const memoryManager = new MemoryManager(process.env.MONGODB_URI || '', 'gpt_clone', 'memories')
const contextManager = new ContextWindowManager()

export async function POST(req: NextRequest) {
    try {
        const { messages, model = "llama-3.1-8b-instant", userId = "default-user" } = await req.json()

        await connectToDatabase()

        const memories = await memoryManager.getRelevantMemories(userId, messages[messages.length - 1]?.content || "")

        const managedMessages = contextManager.manageContextWindow(messages, model, memories)

        const coreMessages = [
            ...(memories.length > 0
                ? [{
                    role: "system",
                    content: `Previous conversation context:\n${memories.map(m => m.content).join("\n")}`,
                }]
                : []),
            ...managedMessages,
        ]

        const result = await streamText({
            model: groq(model),
            messages: coreMessages,
            temperature: 0.7,
            maxTokens: contextManager.getMaxTokensForModel(model),
            async onFinish(completion) {
                await memoryManager.addMemory(
                    userId,
                    `User: ${messages[messages.length - 1]?.content}\nAssistant: ${completion.text}`,
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