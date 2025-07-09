"use client"

import { Button } from "@/components/ui/button"
import { Menu, Plus } from "lucide-react"

interface MobileHeaderProps {
    onMenuClick: () => void
    onNewChat: () => void
}

export function MobileHeader({ onMenuClick, onNewChat }: MobileHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
            <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
            </Button>

            <h1 className="font-semibold text-lg">ChatGPT</h1>

            <Button variant="ghost" size="sm" onClick={onNewChat} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    )
}