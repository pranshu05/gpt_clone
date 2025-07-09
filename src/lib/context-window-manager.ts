import type { Message } from "ai"

interface ModelConfig {
    contextWindow: number
    maxTokens: number
    tokensPerMessage: number
}

export class ContextWindowManager {
    private modelConfigs: Record<string, ModelConfig> = {
        "meta-llama/llama-4-scout-17b-16e-instruct": {
            contextWindow: 32768,
            maxTokens: 8192,
            tokensPerMessage: 4,
        },
        "llama-3.1-8b-instant": {
            contextWindow: 32768,
            maxTokens: 8192,
            tokensPerMessage: 4,
        },
        "llama-3.2-90b-text-preview": {
            contextWindow: 131072,
            maxTokens: 8192,
            tokensPerMessage: 4,
        },
        "llama-3.2-11b-text-preview": {
            contextWindow: 131072,
            maxTokens: 8192,
            tokensPerMessage: 4,
        },
        "mixtral-8x7b-32768": {
            contextWindow: 32768,
            maxTokens: 8192,
            tokensPerMessage: 4,
        },
        "gemma-7b-it": {
            contextWindow: 8192,
            maxTokens: 2048,
            tokensPerMessage: 4,
        },
    }

    manageContextWindow(messages: Message[], model: string, memories: Record<string, unknown>[] = []): Message[] {
        const config = this.modelConfigs[model] || this.modelConfigs["llama-3.1-8b-instant"]

        // Calculate tokens used by memories and reserve space
        const memoryTokens = memories.length * 100 // Rough estimate
        const availableTokens = config.contextWindow - config.maxTokens - memoryTokens - 1000 // Larger buffer

        // If we have very few messages, return as-is
        if (messages.length <= 2) {
            return messages
        }

        // Estimate tokens for each message
        let totalTokens = 0
        const messagesToKeep: Message[] = []

        // Always keep the last message (current user input or latest response)
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            totalTokens += this.estimateTokens(lastMessage.content, config.tokensPerMessage)
            messagesToKeep.unshift(lastMessage)
        }

        // Always keep the first user message for context
        let firstUserMessageIndex = -1
        for (let i = 0; i < messages.length - 1; i++) {
            if (messages[i].role === "user") {
                firstUserMessageIndex = i
                break
            }
        }

        // Add messages from newest to oldest until we hit the limit
        for (let i = messages.length - 2; i >= 0; i--) {
            const message = messages[i]
            const messageTokens = this.estimateTokens(message.content, config.tokensPerMessage)

            // Always include the first user message if we haven't reached the limit
            if (i === firstUserMessageIndex && totalTokens + messageTokens <= availableTokens) {
                totalTokens += messageTokens
                messagesToKeep.unshift(message)
                continue
            }

            // Skip the first user message if we've already added it
            if (i === firstUserMessageIndex) {
                continue
            }

            if (totalTokens + messageTokens > availableTokens) {
                break
            }

            totalTokens += messageTokens
            messagesToKeep.unshift(message)
        }

        // If we had to trim messages, add a system message to indicate context loss
        if (messagesToKeep.length < messages.length) {
            const trimmedCount = messages.length - messagesToKeep.length
            const contextLossMessage: Message = {
                id: `context-loss-${Date.now()}`,
                role: "system",
                content: `[Previous ${trimmedCount} message(s) trimmed to fit context window. Conversation continues from here.]`,
                createdAt: new Date(),
            }
            messagesToKeep.unshift(contextLossMessage)
        }

        return messagesToKeep
    }

    private estimateTokens(text: string, tokensPerMessage: number): number {
        // More accurate estimation: ~3.5 characters per token for most models
        const baseTokens = Math.ceil(text.length / 3.5)
        return baseTokens + tokensPerMessage
    }

    getMaxTokensForModel(model: string): number {
        const config = this.modelConfigs[model] || this.modelConfigs["llama-3.1-8b-instant"]
        return config.maxTokens
    }

    getContextWindowSize(model: string): number {
        const config = this.modelConfigs[model] || this.modelConfigs["llama-3.1-8b-instant"]
        return config.contextWindow
    }

    getContextUsage(
        messages: Message[],
        model: string,
    ): {
        tokensUsed: number
        maxTokens: number
        percentage: number
        isNearLimit: boolean
    } {
        const config = this.modelConfigs[model] || this.modelConfigs["llama-3.1-8b-instant"]
        const tokensUsed = messages.reduce((total, message) => {
            return total + this.estimateTokens(message.content, config.tokensPerMessage)
        }, 0)

        const percentage = (tokensUsed / config.contextWindow) * 100
        const isNearLimit = percentage > 75

        return {
            tokensUsed,
            maxTokens: config.contextWindow,
            percentage,
            isNearLimit,
        }
    }
}