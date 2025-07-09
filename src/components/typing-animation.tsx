"use client"

import { useEffect, useState } from "react"

interface TypingAnimationProps {
    text: string
    speed?: number
    onComplete?: () => void
}

export function TypingAnimation({ text, speed = 30, onComplete }: TypingAnimationProps) {
    const [displayedText, setDisplayedText] = useState("")
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex])
                setCurrentIndex((prev) => prev + 1)
            }, speed)

            return () => clearTimeout(timer)
        } else if (onComplete) {
            onComplete()
        }
    }, [currentIndex, text, speed, onComplete])

    return (
        <span>
            {displayedText}
            {currentIndex < text.length && <span className="animate-pulse">|</span>}
        </span>
    )
}

export function LoadingDots() {
    return (
        <div className="flex items-center space-x-1 py-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
    )
}