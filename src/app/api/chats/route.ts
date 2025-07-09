import { type NextRequest, NextResponse } from "next/server"
import { ChatService } from "@/lib/chat-service"

const chatService = new ChatService()

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get("userId") || "default-user"

        const chats = await chatService.getUserChats(userId)
        return NextResponse.json(chats)
    } catch (error) {
        console.error("Failed to get chats:", error)
        return NextResponse.json({ error: "Failed to get chats" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, title } = await req.json()
        const chatId = await chatService.createChat(userId || "default-user", title)
        return NextResponse.json({ chatId })
    } catch (error) {
        console.error("Failed to create chat:", error)
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
    }
}