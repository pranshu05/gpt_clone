"use client"

import { useEffect, useRef } from "react"

interface AccessibilityAnnouncerProps {
    message: string
    priority?: "polite" | "assertive"
}

export function AccessibilityAnnouncer({ message, priority = "polite" }: AccessibilityAnnouncerProps) {
    const announcerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (message && announcerRef.current) {
            announcerRef.current.textContent = message
        }
    }, [message])

    return <div ref={announcerRef} aria-live={priority} aria-atomic="true" className="sr-only" />
}

// Hook for programmatic announcements
export function useAnnouncer() {
    const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
        // Use the existing aria-live regions from layout
        const region =
            priority === "assertive"
                ? document.getElementById("aria-live-region-assertive")
                : document.getElementById("aria-live-region")

        if (region) {
            region.textContent = message
            // Clear after announcement to allow repeated messages
            setTimeout(() => {
                region.textContent = ""
            }, 1000)
        } else {
            // Fallback: create temporary announcer
            const announcer = document.createElement("div")
            announcer.setAttribute("aria-live", priority)
            announcer.setAttribute("aria-atomic", "true")
            announcer.className = "sr-only"
            announcer.textContent = message

            document.body.appendChild(announcer)

            // Remove after announcement
            setTimeout(() => {
                if (document.body.contains(announcer)) {
                    document.body.removeChild(announcer)
                }
            }, 1000)
        }
    }

    return { announce }
}