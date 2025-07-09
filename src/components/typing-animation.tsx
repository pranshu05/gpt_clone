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
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        // Reset animation when text changes
        setDisplayedText("")
        setCurrentIndex(0)
        setIsComplete(false)
    }, [text])

    useEffect(() => {
        if (currentIndex < text.length && !isComplete) {
            const timer = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex])
                setCurrentIndex((prev) => prev + 1)
            }, speed)

            return () => clearTimeout(timer)
        } else if (currentIndex >= text.length && !isComplete) {
            setIsComplete(true)
            if (onComplete) {
                // Small delay before calling onComplete to ensure smooth transition
                setTimeout(onComplete, 100)
            }
        }
    }, [currentIndex, text, speed, onComplete, isComplete])

    return (
        <span className="chatgpt-text">
            {displayedText}
            {!isComplete && currentIndex < text.length && <span className="animate-pulse text-gray-400 ml-1">|</span>}
        </span>
    )
}

export function LoadingDots() {
    return (
        <div className="flex items-center space-x-1 py-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full chatgpt-loading-dot"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full chatgpt-loading-dot"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full chatgpt-loading-dot"></div>
        </div>
    )
}