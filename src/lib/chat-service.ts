import { connectToDatabase } from "./mongodb"
import type { ChatDocument, MessageDocument } from "./models/chat"
import { ObjectId } from "mongodb"

export class ChatService {
    private collectionName = "chats"

    async createChat(userId: string, title = "New Chat"): Promise<string> {
        try {
            const { db } = await connectToDatabase()

            const chatId = new ObjectId().toString()
            const chat: ChatDocument = {
                id: chatId,
                userId,
                title,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            await db.collection(this.collectionName).insertOne(chat)
            return chatId
        } catch (error) {
            console.error("Failed to create chat:", error)
            throw error
        }
    }

    async updateChat(chatId: string, messages: MessageDocument[]): Promise<void> {
        try {
            const { db } = await connectToDatabase()

            await db.collection(this.collectionName).updateOne(
                { id: chatId },
                {
                    $set: {
                        messages,
                        updatedAt: new Date(),
                        title: messages.length > 0 ? this.generateTitle(messages[0].content) : "New Chat",
                    },
                },
            )
        } catch (error) {
            console.error("Failed to update chat:", error)
            throw error
        }
    }

    async getChat(chatId: string): Promise<ChatDocument | null> {
        try {
            const { db } = await connectToDatabase()
            return await db.collection(this.collectionName).findOne({ id: chatId }) as ChatDocument | null
        } catch (error) {
            console.error("Failed to get chat:", error)
            return null
        }
    }

    async getUserChats(userId: string): Promise<ChatDocument[]> {
        try {
            const { db } = await connectToDatabase()
            return await db.collection(this.collectionName).find({ userId }).sort({ updatedAt: -1 }).toArray() as unknown as ChatDocument[]
        } catch (error) {
            console.error("Failed to get user chats:", error)
            return []
        }
    }

    async deleteChat(chatId: string): Promise<void> {
        try {
            const { db } = await connectToDatabase()
            await db.collection(this.collectionName).deleteOne({ id: chatId })
        } catch (error) {
            console.error("Failed to delete chat:", error)
            throw error
        }
    }

    private generateTitle(content: string): string {
        return content.slice(0, 50) + (content.length > 50 ? "..." : "")
    }
}