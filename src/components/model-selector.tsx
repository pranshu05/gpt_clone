"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Zap, Brain, Cpu } from "lucide-react"

const GROQ_MODELS = [
    {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "Llama 3.1 70B",
        description: "Most capable model",
        icon: Brain,
        contextWindow: "32K tokens",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B",
        description: "Fast and efficient",
        icon: Zap,
        contextWindow: "32K tokens",
    },
    {
        id: "llama-3.2-90b-text-preview",
        name: "Llama 3.2 90B",
        description: "Latest preview model",
        icon: Brain,
        contextWindow: "131K tokens",
    },
    {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        description: "Mixture of experts",
        icon: Cpu,
        contextWindow: "32K tokens",
    },
]

interface ModelSelectorProps {
    selectedModel: string
    onModelChange: (model: string) => void
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    const currentModel = GROQ_MODELS.find((m) => m.id === selectedModel) || GROQ_MODELS[0]
    const Icon = currentModel.icon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[200px] bg-transparent">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{currentModel.name}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
                {GROQ_MODELS.map((model) => {
                    const ModelIcon = model.icon
                    return (
                        <DropdownMenuItem
                            key={model.id}
                            onClick={() => onModelChange(model.id)}
                            className="flex items-start gap-3 p-3 cursor-pointer"
                        >
                            <ModelIcon className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <div className="font-medium">{model.name}</div>
                                <div className="text-sm text-gray-500">{model.description}</div>
                                <div className="text-xs text-gray-400 mt-1">{model.contextWindow}</div>
                            </div>
                            {selectedModel === model.id && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}