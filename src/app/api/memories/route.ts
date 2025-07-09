// app/api/memories/route.ts
import { MemoryManager } from "@/lib/memory-manager"

const manager = new MemoryManager(process.env.MONGO_URI!, "yourDB", "yourCollection")

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || ""
    const query = searchParams.get("query") || ""

    const memories = await manager.getRelevantMemories(userId, query)
    return Response.json(memories)
}