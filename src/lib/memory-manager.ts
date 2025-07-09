import { MongoClient, ObjectId } from "mongodb"

interface Memory {
    _id?: ObjectId
    id: string
    userId: string
    content: string
    embedding?: number[]
    metadata?: Record<string, unknown>
    relevanceScore: number
    conversationContext?: string
    createdAt: Date
    lastAccessed: Date
    accessCount: number
}

export class MemoryManager {
    private client: MongoClient
    private dbName: string
    private collectionName: string
    private isConnected = false

    constructor(uri: string, dbName: string, collectionName: string) {
        this.client = new MongoClient(uri)
        this.dbName = dbName
        this.collectionName = collectionName
    }

    private async ensureConnection() {
        if (!this.isConnected) {
            await this.client.connect()
            this.isConnected = true
        }
    }

    async getRelevantMemories(userId: string, query: string, limit = 5): Promise<Memory[]> {
        try {
            await this.ensureConnection()
            const db = this.client.db(this.dbName)
            const collection = db.collection<Memory>(this.collectionName)

            // Ensure indexes exist
            await this.ensureIndexes(collection)

            // Enhanced search with multiple strategies
            const searchStrategies = [
                // 1. Exact phrase match
                { $text: { $search: `"${query}"` } },
                // 2. All words match
                { $text: { $search: query } },
                // 3. Partial content match
                { content: { $regex: query, $options: "i" } },
                // 4. Recent memories (last 7 days)
                {
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    content: { $regex: query.split(" ").join("|"), $options: "i" },
                },
            ]

            const memories: Memory[] = []
            const seenIds = new Set<string>()

            for (const strategy of searchStrategies) {
                if (memories.length >= limit) break

                const results = await collection
                    .find({
                        userId,
                        ...strategy,
                        relevanceScore: { $gt: 0.1 }, // Filter out very low relevance
                    })
                    .sort({
                        relevanceScore: -1,
                        lastAccessed: -1,
                        accessCount: -1,
                    })
                    .limit(limit - memories.length)
                    .toArray()

                for (const memory of results) {
                    if (!seenIds.has(memory.id) && memories.length < limit) {
                        seenIds.add(memory.id)
                        memories.push(memory)

                        // Update access tracking
                        await this.updateMemoryAccess(memory.id)
                    }
                }
            }

            return memories.slice(0, limit)
        } catch (error) {
            console.error("Error retrieving memories:", error)
            return []
        }
    }

    async addMemory(userId: string, content: string, conversationContext?: string): Promise<string> {
        try {
            await this.ensureConnection()
            const db = this.client.db(this.dbName)
            const collection = db.collection<Memory>(this.collectionName)

            const memoryId = new ObjectId().toString()
            const now = new Date()

            // Extract keywords for better searchability
            const keywords = this.extractKeywords(content)

            const memory: Memory = {
                id: memoryId,
                userId,
                content,
                relevanceScore: 1.0,
                conversationContext: conversationContext || undefined,
                createdAt: now,
                lastAccessed: now,
                accessCount: 0,
                metadata: {
                    keywords,
                    contentLength: content.length,
                    wordCount: content.split(/\s+/).length,
                },
            }

            await collection.insertOne(memory)

            // Trigger memory consolidation if we have too many memories
            await this.consolidateMemories(userId)

            return memoryId
        } catch (error) {
            console.error("Error adding memory:", error)
            throw error
        }
    }

    private async updateMemoryAccess(memoryId: string): Promise<void> {
        try {
            const db = this.client.db(this.dbName)
            const collection = db.collection<Memory>(this.collectionName)

            await collection.updateOne(
                { id: memoryId },
                {
                    $set: { lastAccessed: new Date() },
                    $inc: { accessCount: 1, relevanceScore: 0.1 },
                },
            )
        } catch (error) {
            console.error("Error updating memory access:", error)
        }
    }

    private async consolidateMemories(userId: string): Promise<void> {
        try {
            const db = this.client.db(this.dbName)
            const collection = db.collection<Memory>(this.collectionName)

            const memoryCount = await collection.countDocuments({ userId })

            if (memoryCount > 1000) {
                // Consolidate if too many memories
                // Remove memories with very low relevance and old age
                const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

                await collection.deleteMany({
                    userId,
                    relevanceScore: { $lt: 0.2 },
                    lastAccessed: { $lt: cutoffDate },
                    accessCount: { $lt: 2 },
                })

                // Decay relevance scores over time
                await collection.updateMany({ userId }, { $mul: { relevanceScore: 0.95 } })
            }
        } catch (error) {
            console.error("Error consolidating memories:", error)
        }
    }

    private extractKeywords(content: string): string[] {
        // Simple keyword extraction
        const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3)
            .filter((word) => !this.isStopWord(word))

        // Get unique words and sort by frequency
        const wordCount = new Map<string, number>()
        words.forEach((word) => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1)
        })

        return Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word)
    }

    private isStopWord(word: string): boolean {
        const stopWords = new Set([
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "this",
            "that",
            "these",
            "those",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
            "me",
            "him",
            "her",
            "us",
            "them",
            "my",
            "your",
            "his",
            "its",
            "our",
            "their",
            "am",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            "shall",
            "about",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "up",
            "down",
            "out",
            "off",
            "over",
            "under",
            "again",
            "further",
            "then",
            "once",
        ])
        return stopWords.has(word)
    }

    private async ensureIndexes(collection: import("mongodb").Collection<Memory>): Promise<void> {
        try {
            await collection.createIndex({ userId: 1, createdAt: -1 })
            await collection.createIndex({ userId: 1, relevanceScore: -1 })
            await collection.createIndex({ userId: 1, lastAccessed: -1 })
            await collection.createIndex({ content: "text" })
            await collection.createIndex({ "metadata.keywords": 1 })
        } catch (error) {
            console.error("Error creating indexes:", error)
        }
    }

    async getMemoryStats(userId: string): Promise<{
        totalMemories: number
        averageRelevance: number
        oldestMemory: Date | null
        newestMemory: Date | null
    }> {
        try {
            await this.ensureConnection()
            const db = this.client.db(this.dbName)
            const collection = db.collection<Memory>(this.collectionName)

            const stats = await collection
                .aggregate([
                    { $match: { userId } },
                    {
                        $group: {
                            _id: null,
                            totalMemories: { $sum: 1 },
                            averageRelevance: { $avg: "$relevanceScore" },
                            oldestMemory: { $min: "$createdAt" },
                            newestMemory: { $max: "$createdAt" },
                        },
                    },
                ])
                .toArray()

            if (stats.length > 0) {
                const { totalMemories, averageRelevance, oldestMemory, newestMemory } = stats[0]
                return {
                    totalMemories: totalMemories ?? 0,
                    averageRelevance: averageRelevance ?? 0,
                    oldestMemory: oldestMemory ?? null,
                    newestMemory: newestMemory ?? null,
                }
            } else {
                return {
                    totalMemories: 0,
                    averageRelevance: 0,
                    oldestMemory: null,
                    newestMemory: null,
                }
            }
        } catch (error) {
            console.error("Error getting memory stats:", error)
            return {
                totalMemories: 0,
                averageRelevance: 0,
                oldestMemory: null,
                newestMemory: null,
            }
        }
    }
}