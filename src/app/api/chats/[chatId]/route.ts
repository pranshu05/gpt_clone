import { type NextRequest, NextResponse } from "next/server"
import { ChatService } from "@/lib/chat-service"

const chatService = new ChatService()

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
    try {
        const chat = await chatService.getChat(params.chatId)
        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 })
        }
        return NextResponse.json(chat)
    } catch (error) {
        console.error("Failed to get chat:", error)
        return NextResponse.json({ error: "Failed to get chat" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, { params }: { params: { chatId: string } }) {
    try {
        const { messages } = await req.json()
        await chatService.updateChat(params.chatId, messages)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to update chat:", error)
        return NextResponse.json({ error: "Failed to update chat" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { chatId: string } }) {
    try {
        await chatService.deleteChat(params.chatId)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete chat:", error)
        return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
    }
}