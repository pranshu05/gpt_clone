import { MemoryManager } from "@/lib/memory-manager"

const manager = new MemoryManager(
    process.env.MONGODB_URI!,
    "gpt_clone",
    "memories"
)

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || ""
    const query = searchParams.get("query") || ""

    if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 })
    }

    try {
        const stats = await manager.getMemoryStats(userId)
        let relevantMemories = 0

        if (query) {
            const memories = await manager.getRelevantMemories(userId, query, 10)
            relevantMemories = memories.length
        }

        return Response.json({ ...stats, relevantMemories })
    } catch (err) {
        console.error("Error in memory-stats API:", err)
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    }
}