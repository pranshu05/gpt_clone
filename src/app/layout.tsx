import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"


export const metadata: Metadata = {
    title: "ChatGPT Clone",
    description: "A pixel-perfect ChatGPT clone built with Next.js and Vercel AI SDK",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                {children}
                <Toaster />
            </body>
        </html>
    )
}