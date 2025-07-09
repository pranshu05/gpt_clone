"use client"

import { Button } from "@/components/ui/button"
import { Menu, Plus } from "lucide-react"

interface MobileHeaderProps {
    onMenuClick: () => void
    onNewChat: () => void
}

export function MobileHeader({ onMenuClick, onNewChat }: MobileHeaderProps) {
    return (
        <header className="flex items-center justify-between p-4 border-b border-[#2d2d2d] bg-[#212121] md:hidden">
            <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                className="h-8 w-8 p-0 text-white hover:bg-[#2d2d2d] focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                aria-label="Open sidebar menu"
            >
                <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>

            <h1 className="font-semibold text-lg text-white">ChatGPT</h1>

            <Button
                variant="ghost"
                size="sm"
                onClick={onNewChat}
                className="h-8 w-8 p-0 text-white hover:bg-[#2d2d2d] focus-visible:ring-2 focus-visible:ring-[#10a37f]"
                aria-label="Start new chat"
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
        </header>
    )
}