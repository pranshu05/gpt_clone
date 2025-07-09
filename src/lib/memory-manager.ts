import { MongoClient } from "mongodb"

export class MemoryManager {
    private client: MongoClient
    private dbName: string
    private collectionName: string

    constructor(uri: string, dbName: string, collectionName: string) {
        this.client = new MongoClient(uri)
        this.dbName = dbName
        this.collectionName = collectionName
    }

    async getRelevantMemories(userId: string, query: string) {
        await this.client.connect()
        const db = this.client.db(this.dbName)
        const collection = db.collection(this.collectionName)

        // Ensure text index exists (safe even if already created)
        await collection.createIndex({ content: "text" })

        // Simple text search
        const memories = await collection.find({
            userId,
            $text: { $search: query }
        }).toArray()

        return memories
    }

    async addMemory(userId: string, content: string) {
        await this.client.connect()
        const db = this.client.db(this.dbName)
        const collection = db.collection(this.collectionName)

        await collection.insertOne({
            userId,
            content,
            timestamp: new Date()
        })
    }
}