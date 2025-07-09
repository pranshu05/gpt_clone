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
        const config = this.modelConfigs[model] || this.modelConfigs["meta-llama/llama-4-scout-17b-16e-instruct"]

        // Calculate tokens used by memories and reserve space
        const memoryTokens = memories.length * 100 // Rough estimate
        const availableTokens = config.contextWindow - config.maxTokens - memoryTokens - 500 // Buffer

        // Estimate tokens for each message
        let totalTokens = 0
        const messagesToKeep: Message[] = []

        // Always keep the last message (current user input)
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            totalTokens += this.estimateTokens(lastMessage.content, config.tokensPerMessage)
            messagesToKeep.unshift(lastMessage)
        }

        // Add messages from newest to oldest until we hit the limit
        for (let i = messages.length - 2; i >= 0; i--) {
            const message = messages[i]
            const messageTokens = this.estimateTokens(message.content, config.tokensPerMessage)

            if (totalTokens + messageTokens > availableTokens) {
                break
            }

            totalTokens += messageTokens
            messagesToKeep.unshift(message)
        }

        // If we had to trim messages, add a system message to indicate context loss
        if (messagesToKeep.length < messages.length) {
            const contextLossMessage: Message = {
                id: "context-loss",
                role: "system",
                content: "[Previous conversation history has been summarized to fit context window]",
            }
            messagesToKeep.unshift(contextLossMessage)
        }

        return messagesToKeep
    }

    private estimateTokens(text: string, tokensPerMessage: number): number {
        // Rough estimation: ~4 characters per token for most models
        return Math.ceil(text.length / 4) + tokensPerMessage
    }

    getMaxTokensForModel(model: string): number {
        const config = this.modelConfigs[model] || this.modelConfigs["meta-llama/llama-4-scout-17b-16e-instruct"]
        return config.maxTokens
    }

    getContextWindowSize(model: string): number {
        const config = this.modelConfigs[model] || this.modelConfigs["meta-llama/llama-4-scout-17b-16e-instruct"]
        return config.contextWindow
    }
}