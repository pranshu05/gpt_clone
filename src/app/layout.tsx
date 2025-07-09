import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "ChatGPT Clone - AI Assistant",
    description: "A pixel-perfect ChatGPT clone built with Next.js, Vercel AI SDK, and modern web technologies",
    keywords: ["ChatGPT", "AI", "Assistant", "Chat", "OpenAI", "Next.js"],
    authors: [{ name: "ChatGPT Clone" }],
    viewport: "width=device-width, initial-scale=1",
    robots: "index, follow",
    openGraph: {
        title: "ChatGPT Clone - AI Assistant",
        description: "A pixel-perfect ChatGPT clone built with Next.js and Vercel AI SDK",
        type: "website",
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
        title: "ChatGPT Clone - AI Assistant",
        description: "A pixel-perfect ChatGPT clone built with Next.js and Vercel AI SDK",
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <meta name="theme-color" content="#212121" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="dark bg-[#212121] text-white antialiased overflow-hidden">
                <Suspense fallback={<div>Loading...</div>}>
                    <div id="app-root" className="h-screen">
                        {children}
                    </div>
                    <Toaster />
                    <Analytics />
                    <SpeedInsights />
                </Suspense>

                {/* Accessibility announcements */}
                <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
                <div id="aria-live-region-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
            </body>
        </html>
    )
}