"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, Info, Brain, Zap } from "lucide-react"
import type { Message } from "ai"
import { ContextWindowManager } from "@/lib/context-window-manager"

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
        contextWindowSize: 32768,
        messagesInContext: 0,
        trimmedMessages: 0,
    })

    useEffect(() => {
        const contextManager = new ContextWindowManager()
        const usage = contextManager.getContextUsage(messages, selectedModel)
        const contextWindowSize = contextManager.getContextWindowSize(selectedModel)

        // Simulate context window management to get trimming info
        const managedMessages = contextManager.manageContextWindow(messages, selectedModel)
        const trimmedMessages = messages.length - managedMessages.length

        setContextInfo({
            tokensUsed: usage.tokensUsed,
            maxTokens: usage.maxTokens,
            percentage: usage.percentage,
            isNearLimit: usage.isNearLimit,
            contextWindowSize,
            messagesInContext: managedMessages.length,
            trimmedMessages,
        })
    }, [messages, selectedModel])

    if (messages?.length === 0) return null

    const getStatusColor = () => {
        if (contextInfo.percentage > 90) return "destructive"
        if (contextInfo.percentage > 75) return "outline"
        return "secondary"
    }

    const getStatusIcon = () => {
        if (contextInfo.percentage > 90) return AlertTriangle
        if (contextInfo.percentage > 75) return Brain
        return Zap
    }

    const StatusIcon = getStatusIcon()

    return (
        <TooltipProvider>
            <Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Badge variant={getStatusColor()} className="cursor-pointer hover:opacity-80 transition-opacity">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {Math.round(contextInfo.percentage)}%
                            </Badge>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-sm">
                            <p>
                                Context Usage: {contextInfo.tokensUsed.toLocaleString()} / {contextInfo.maxTokens.toLocaleString()}{" "}
                                tokens
                            </p>
                            <p>Model: {selectedModel}</p>
                            {contextInfo.isNearLimit && <p className="text-yellow-400 mt-1">⚠️ Approaching context limit</p>}
                            <p className="text-xs text-gray-400 mt-1">Click for details</p>
                        </div>
                    </TooltipContent>
                </Tooltip>

                <DialogContent className="bg-[#2d2d2d] border-[#4d4d4d] text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            Context Window Details
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm text-gray-300">Usage Statistics</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Tokens Used:</span>
                                        <span className="font-mono">{contextInfo.tokensUsed.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Max Tokens:</span>
                                        <span className="font-mono">{contextInfo.maxTokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Usage:</span>
                                        <span className={`font-mono ${contextInfo.isNearLimit ? "text-yellow-400" : "text-green-400"}`}>
                                            {contextInfo.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm text-gray-300">Message Management</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Total Messages:</span>
                                        <span className="font-mono">{messages.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>In Context:</span>
                                        <span className="font-mono">{contextInfo.messagesInContext}</span>
                                    </div>
                                    {contextInfo.trimmedMessages > 0 && (
                                        <div className="flex justify-between">
                                            <span>Trimmed:</span>
                                            <span className="font-mono text-yellow-400">{contextInfo.trimmedMessages}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-300">Model Information</h4>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span>Model:</span>
                                    <span className="font-mono">{selectedModel}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Context Window:</span>
                                    <span className="font-mono">{contextInfo.contextWindowSize.toLocaleString()} tokens</span>
                                </div>
                            </div>
                        </div>

                        {contextInfo.isNearLimit && (
                            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="font-medium">Context Limit Warning</span>
                                </div>
                                <p className="text-xs text-yellow-300 mt-1">
                                    You are approaching the context limit. Older messages may be automatically trimmed to make room for new
                                    ones.
                                </p>
                            </div>
                        )}

                        {contextInfo.trimmedMessages > 0 && (
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-blue-400 text-sm">
                                    <Info className="h-4 w-4" />
                                    <span className="font-medium">Messages Trimmed</span>
                                </div>
                                <p className="text-xs text-blue-300 mt-1">
                                    {contextInfo.trimmedMessages} older message(s) have been trimmed to fit within the context window
                                    while preserving conversation flow.
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}