"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Info } from "lucide-react"
import type { Message } from "ai"

interface ContextIndicatorProps {
    messages: Message[]
    selectedModel: string
}

export function ContextIndicator({ messages, selectedModel }: ContextIndicatorProps) {
    const [contextInfo, setContextInfo] = useState({
        tokensUsed: 0,
        maxTokens: 32768,
        percentage: 0,
        isNearLimit: false,
    })

    useEffect(() => {
        // Estimate token usage
        const totalContent = messages?.map((m) => m.content).join(" ")
        const estimatedTokens = Math.ceil(totalContent?.length / 4) // Rough estimation

        const maxTokens = getMaxTokensForModel(selectedModel)
        const percentage = (estimatedTokens / maxTokens) * 100
        const isNearLimit = percentage > 80

        setContextInfo({
            tokensUsed: estimatedTokens,
            maxTokens,
            percentage,
            isNearLimit,
        })
    }, [messages, selectedModel])

    const getMaxTokensForModel = (model: string): number => {
        const modelLimits: Record<string, number> = {
            "meta-llama/llama-4-scout-17b-16e-instruct": 32768,
            "llama-3.1-8b-instant": 32768,
            "llama-3.2-90b-text-preview": 131072,
            "llama-3.2-11b-text-preview": 131072,
            "mixtral-8x7b-32768": 32768,
            "gemma-7b-it": 8192,
        }
        return modelLimits[model] || 32768
    }

    if (messages?.length === 0) return null

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={contextInfo.isNearLimit ? "destructive" : "secondary"} className="cursor-help">
                        {contextInfo.isNearLimit && <AlertTriangle className="h-3 w-3 mr-1" />}
                        <Info className="h-3 w-3 mr-1" />
                        {Math.round(contextInfo.percentage)}%
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-sm">
                        <p>
                            Context Usage: {contextInfo.tokensUsed.toLocaleString()} / {contextInfo.maxTokens.toLocaleString()} tokens
                        </p>
                        <p>Model: {selectedModel}</p>
                        {contextInfo.isNearLimit && <p className="text-yellow-400 mt-1">⚠️ Approaching context limit</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}