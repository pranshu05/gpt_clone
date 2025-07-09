"use client"

import { MessageSquare, Lightbulb, Code, FileText } from "lucide-react"

const suggestions = [
    {
        icon: MessageSquare,
        title: "Explain quantum computing",
        subtitle: "in simple terms",
    },
    {
        icon: Lightbulb,
        title: "Got any creative ideas",
        subtitle: "for a 10 year old's birthday?",
    },
    {
        icon: Code,
        title: "How do I make an HTTP request",
        subtitle: "in Javascript?",
    },
    {
        icon: FileText,
        title: "Write a thank you note",
        subtitle: "to my interviewer",
    },
]

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-blue-600 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">How can I help you today?</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((suggestion, index) => {
                    const Icon = suggestion.icon
                    return (
                        <button
                            key={index}
                            className="flex items-start gap-3 p-4 text-left border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">{suggestion.title}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{suggestion.subtitle}</div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}