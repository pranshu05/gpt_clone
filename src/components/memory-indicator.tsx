"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Brain, Database, Clock, TrendingUp } from "lucide-react"

interface MemoryIndicatorProps {
    userId: string
    currentQuery?: string
}

interface MemoryStats {
    totalMemories: number
    averageRelevance: number
    oldestMemory: string | null
    newestMemory: string | null
    relevantMemories: number
}

export function MemoryIndicator({ userId, currentQuery }: MemoryIndicatorProps) {
    const [memoryStats, setMemoryStats] = useState<MemoryStats>({
        totalMemories: 0,
        averageRelevance: 0,
        oldestMemory: null,
        newestMemory: null,
        relevantMemories: 0,
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true)
            try {
                const res = await fetch(
                    `/api/memory-stats?userId=${userId}${currentQuery ? `&query=${encodeURIComponent(currentQuery)}` : ""}`
                )
                const data = await res.json()
                setMemoryStats(data)
            } catch (err) {
                console.error("Failed to load memory stats:", err)
            } finally {
                setIsLoading(false)
            }
        }

        if (userId) loadStats()
    }, [userId, currentQuery])

    if (isLoading || memoryStats.totalMemories === 0) return null

    const getMemoryHealth = () => {
        const score = memoryStats.averageRelevance
        if (score > 0.8) return { color: "bg-green-500", label: "Excellent" }
        if (score > 0.6) return { color: "bg-yellow-500", label: "Good" }
        if (score > 0.4) return { color: "bg-orange-500", label: "Fair" }
        return { color: "bg-red-500", label: "Poor" }
    }

    const memoryHealth = getMemoryHealth()

    return (
        <TooltipProvider>
            <Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Badge
                                variant="secondary"
                                className="cursor-pointer hover:opacity-80 transition-opacity bg-[#2d2d2d] text-white border-[#4d4d4d]"
                            >
                                <Brain className="h-3 w-3 mr-1" />
                                {memoryStats.totalMemories} memories
                            </Badge>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-sm">
                            <p>Total Memories: {memoryStats.totalMemories}</p>
                            <p>Memory Health: {memoryHealth.label}</p>
                            {currentQuery && memoryStats.relevantMemories > 0 && <p>Relevant: {memoryStats.relevantMemories}</p>}
                            <p className="text-xs text-gray-400 mt-1">Click for details</p>
                        </div>
                    </TooltipContent>
                </Tooltip>

                <DialogContent className="bg-[#2d2d2d] border-[#4d4d4d] text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            Memory System
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm font-medium">Storage</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total:</span>
                                        <span className="font-mono">{memoryStats.totalMemories}</span>
                                    </div>
                                    {currentQuery && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Relevant:</span>
                                            <span className="font-mono text-green-400">{memoryStats.relevantMemories}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                    <span className="text-sm font-medium">Quality</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Health:</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${memoryHealth.color}`}></div>
                                            <span className="text-xs">{memoryHealth.label}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Avg Score:</span>
                                        <span className="font-mono">{(memoryStats.averageRelevance * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(memoryStats.oldestMemory || memoryStats.newestMemory) && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-400" />
                                    <span className="text-sm font-medium">Timeline</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    {memoryStats.oldestMemory && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Oldest:</span>
                                            <span className="text-xs">
                                                {new Date(memoryStats.oldestMemory).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {memoryStats.newestMemory && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Newest:</span>
                                            <span className="text-xs">
                                                {new Date(memoryStats.newestMemory).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#3d3d3d]">
                            <p className="text-xs text-gray-400 leading-relaxed">
                                The memory system learns from your conversations to provide more contextual and personalized responses.
                                Memories are automatically managed and consolidated over time.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}