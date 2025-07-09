import pdf from "pdf-parse"
import mammoth from "mammoth"

interface ProcessedFile {
    content: string
    metadata: {
        filename: string
        size: number
        type: string
        pages?: number
        wordCount?: number
        language?: string
        encoding?: string
        extractedImages?: number
        tables?: number
        links?: number
    }
    summary?: string
    keywords?: string[]
    entities?: Array<{ text: string; type: string; confidence: number }>
}

export class FileProcessor {
    static async processFile(file: File, buffer: Buffer): Promise<ProcessedFile | null> {
        try {
            let result: ProcessedFile | null = null

            switch (file.type) {
                case "text/plain":
                case "text/csv":
                case "text/markdown":
                    result = await this.processTextFile(file, buffer)
                    break

                case "application/json":
                    result = await this.processJsonFile(file, buffer)
                    break

                case "application/pdf":
                    result = await this.processPdfFile(file, buffer)
                    break

                case "application/msword":
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    result = await this.processWordFile(file, buffer)
                    break

                case "text/html":
                    result = await this.processHtmlFile(file, buffer)
                    break

                case "application/xml":
                case "text/xml":
                    result = await this.processXmlFile(file, buffer)
                    break

                default:
                    return null
            }

            if (result) {
                // Enhance with additional processing
                result = await this.enhanceProcessedFile(result)
            }

            return result
        } catch (error) {
            console.error("File processing error:", error)
            return null
        }
    }

    private static async processTextFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        const content = buffer.toString("utf-8")
        const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length

        // Detect encoding
        const encoding = this.detectEncoding(buffer)

        // Count links
        const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length

        return {
            content,
            metadata: {
                filename: file.name,
                size: file.size,
                type: file.type,
                wordCount,
                encoding,
                links: linkCount,
                language: this.detectLanguage(content),
            },
        }
    }

    private static async processJsonFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        try {
            const jsonContent = JSON.parse(buffer.toString("utf-8"))
            const content = JSON.stringify(jsonContent, null, 2)
            const wordCount = content.split(/\s+/).length

            // Analyze JSON structure
            const structure = this.analyzeJsonStructure(jsonContent)

            return {
                content,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    wordCount,
                    encoding: "utf-8",
                    ...structure,
                },
            }
        } catch {
            // Fallback to raw text if JSON parsing fails
            return this.processTextFile(file, buffer)
        }
    }

    private static async processPdfFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        try {
            const pdfData = await pdf(buffer)
            const wordCount = pdfData.text.split(/\s+/).filter((word) => word.length > 0).length

            // Extract additional metadata
            const linkCount = (pdfData.text.match(/https?:\/\/[^\s]+/g) || []).length
            const language = this.detectLanguage(pdfData.text)

            return {
                content: pdfData.text,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    pages: pdfData.numpages,
                    wordCount,
                    language,
                    links: linkCount,
                    extractedImages: this.countImageReferences(pdfData.text),
                },
            }
        } catch (error) {
            console.error("PDF processing error:", error)
            return {
                content: `[PDF File: ${file.name}]\nError processing PDF content: ${error instanceof Error ? error.message : "Unknown error"}`,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    pages: 0,
                    wordCount: 0,
                },
            }
        }
    }

    private static async processWordFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        try {
            const result = await mammoth.extractRawText({ buffer })
            const wordCount = result.value.split(/\s+/).filter((word) => word.length > 0).length
            const linkCount = (result.value.match(/https?:\/\/[^\s]+/g) || []).length
            const language = this.detectLanguage(result.value)

            return {
                content: result.value,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    wordCount,
                    language,
                    links: linkCount,
                    extractedImages: this.countImageReferences(result.value),
                },
            }
        } catch (error) {
            console.error("Word processing error:", error)
            return {
                content: `[Word Document: ${file.name}]\nError processing document content: ${error instanceof Error ? error.message : "Unknown error"}`,
                metadata: {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    wordCount: 0,
                },
            }
        }
    }

    private static async processHtmlFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        const content = buffer.toString("utf-8")

        // Extract text content from HTML
        const textContent = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()

        const wordCount = textContent.split(/\s+/).filter((word) => word.length > 0).length
        const linkCount = (content.match(/href\s*=\s*["'][^"']*["']/gi) || []).length
        const imageCount = (content.match(/<img[^>]*>/gi) || []).length

        return {
            content: textContent,
            metadata: {
                filename: file.name,
                size: file.size,
                type: file.type,
                wordCount,
                links: linkCount,
                extractedImages: imageCount,
                language: this.detectLanguage(textContent),
            },
        }
    }

    private static async processXmlFile(file: File, buffer: Buffer): Promise<ProcessedFile> {
        const content = buffer.toString("utf-8")

        // Extract text content from XML
        const textContent = content
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()

        const wordCount = textContent.split(/\s+/).filter((word) => word.length > 0).length

        return {
            content: textContent,
            metadata: {
                filename: file.name,
                size: file.size,
                type: file.type,
                wordCount,
                language: this.detectLanguage(textContent),
            },
        }
    }

    private static async enhanceProcessedFile(file: ProcessedFile): Promise<ProcessedFile> {
        // Generate summary for long content
        if (file.content.length > 1000) {
            file.summary = this.generateSummary(file.content)
        }

        // Extract keywords
        file.keywords = this.extractKeywords(file.content)

        // Extract entities (basic implementation)
        file.entities = this.extractEntities(file.content)

        return file
    }

    private static detectEncoding(buffer: Buffer): string {
        // Simple encoding detection
        const sample = buffer.slice(0, 1024).toString()

        // Check for BOM
        if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
            return "utf-8-bom"
        }

        // Check for non-ASCII characters
        if (/[^\x00-\x7F]/.test(sample)) {
            return "utf-8"
        }

        return "ascii"
    }

    private static detectLanguage(text: string): string {
        // Simple language detection based on common words
        const sample = text.toLowerCase().slice(0, 1000)

        const languagePatterns = {
            english: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/g,
            spanish: /\b(el|la|y|o|pero|en|de|con|por|para)\b/g,
            french: /\b(le|la|et|ou|mais|dans|de|avec|par|pour)\b/g,
            german: /\b(der|die|das|und|oder|aber|in|von|mit|für)\b/g,
            italian: /\b(il|la|e|o|ma|in|di|con|per|da)\b/g,
        }

        let maxMatches = 0
        let detectedLanguage = "unknown"

        for (const [language, pattern] of Object.entries(languagePatterns)) {
            const matches = (sample.match(pattern) || []).length
            if (matches > maxMatches) {
                maxMatches = matches
                detectedLanguage = language
            }
        }

        return maxMatches > 5 ? detectedLanguage : "unknown"
    }

    private static analyzeJsonStructure(obj: unknown): {
        depth: number;
        keys: number;
        arrays: number;
        objects: number;
        primitives: number;
    } {
        const analysis = {
            depth: 0,
            keys: 0,
            arrays: 0,
            objects: 0,
            primitives: 0,
        }

        const analyze = (item: unknown, depth = 0): void => {
            analysis.depth = Math.max(analysis.depth, depth)

            if (Array.isArray(item)) {
                analysis.arrays++
                item.forEach((subItem) => analyze(subItem, depth + 1))
            } else if (typeof item === "object" && item !== null) {
                analysis.objects++
                analysis.keys += Object.keys(item).length
                Object.values(item).forEach((value) => analyze(value, depth + 1))
            } else {
                analysis.primitives++
            }
        }

        analyze(obj)
        return analysis
    }

    private static countImageReferences(text: string): number {
        const imagePatterns = [/\[image\]/gi, /\[figure\]/gi, /\[photo\]/gi, /image\s*\d+/gi, /figure\s*\d+/gi]

        return imagePatterns.reduce((count, pattern) => {
            return count + (text.match(pattern) || []).length
        }, 0)
    }

    private static generateSummary(content: string): string {
        // Simple extractive summarization
        const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20)

        if (sentences.length <= 3) {
            return content.slice(0, 200) + (content.length > 200 ? "..." : "")
        }

        // Score sentences based on word frequency and position
        const words = content.toLowerCase().match(/\b\w+\b/g) || []
        const wordFreq = new Map<string, number>()

        words.forEach((word) => {
            if (word.length > 3) {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
            }
        })

        const sentenceScores = sentences.map((sentence, index) => {
            const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || []
            const score = sentenceWords.reduce((sum, word) => {
                return sum + (wordFreq.get(word) || 0)
            }, 0)

            // Boost score for sentences at the beginning
            const positionBoost = index < 3 ? 1.5 : 1

            return { sentence: sentence.trim(), score: score * positionBoost, index }
        })

        // Select top 3 sentences
        const topSentences = sentenceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .sort((a, b) => a.index - b.index)
            .map((item) => item.sentence)

        return topSentences.join(". ") + "."
    }

    private static extractKeywords(content: string): string[] {
        const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3)
            .filter((word) => !this.isStopWord(word))

        const wordCount = new Map<string, number>()
        words.forEach((word) => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1)
        })

        return Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word]) => word)
    }

    private static extractEntities(content: string): Array<{ text: string; type: string; confidence: number }> {
        const entities: Array<{ text: string; type: string; confidence: number }> = []

        // Email addresses
        const emails = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []
        emails.forEach((email) => {
            entities.push({ text: email, type: "email", confidence: 0.95 })
        })

        // URLs
        const urls = content.match(/https?:\/\/[^\s]+/g) || []
        urls.forEach((url) => {
            entities.push({ text: url, type: "url", confidence: 0.9 })
        })

        // Phone numbers (simple pattern)
        const phones = content.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g) || []
        phones.forEach((phone) => {
            entities.push({ text: phone, type: "phone", confidence: 0.8 })
        })

        // Dates (simple pattern)
        const dates = content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g) || []
        dates.forEach((date) => {
            entities.push({ text: date, type: "date", confidence: 0.85 })
        })

        // Capitalized words (potential names/places)
        const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
        capitalizedWords.forEach((word) => {
            if (word.length > 3 && !this.isCommonWord(word.toLowerCase())) {
                entities.push({ text: word, type: "proper_noun", confidence: 0.6 })
            }
        })

        return entities.slice(0, 20) // Limit to top 20 entities
    }

    private static isStopWord(word: string): boolean {
        const stopWords = new Set([
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "this",
            "that",
            "these",
            "those",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
            "me",
            "him",
            "her",
            "us",
            "them",
            "my",
            "your",
            "his",
            "its",
            "our",
            "their",
            "am",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            "shall",
            "about",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "up",
            "down",
            "out",
            "off",
            "over",
            "under",
            "again",
            "further",
            "then",
            "once",
            "here",
            "there",
            "when",
            "where",
            "why",
            "how",
            "all",
            "any",
            "both",
            "each",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "can",
            "will",
            "just",
            "don",
            "should",
            "now",
            "also",
            "back",
            "good",
            "get",
            "go",
            "new",
            "first",
            "well",
            "way",
            "even",
            "want",
            "work",
            "use",
            "make",
            "take",
            "come",
            "see",
            "know",
            "time",
            "year",
            "day",
            "man",
            "world",
            "life",
            "hand",
            "part",
            "child",
            "eye",
            "woman",
            "place",
            "work",
            "week",
            "case",
            "point",
            "government",
            "company",
            "number",
            "group",
            "problem",
            "fact",
        ])
        return stopWords.has(word)
    }

    private static isCommonWord(word: string): boolean {
        const commonWords = new Set([
            "said",
            "says",
            "told",
            "asked",
            "called",
            "made",
            "went",
            "came",
            "took",
            "gave",
            "got",
            "put",
            "set",
            "run",
            "move",
            "live",
            "believe",
            "hold",
            "bring",
            "happen",
            "write",
            "provide",
            "sit",
            "stand",
            "lose",
            "pay",
            "meet",
            "include",
            "continue",
            "set",
            "learn",
            "change",
            "lead",
            "understand",
            "watch",
            "follow",
            "stop",
            "create",
            "speak",
            "read",
            "allow",
            "add",
            "spend",
            "grow",
            "open",
            "walk",
            "win",
            "offer",
            "remember",
            "love",
            "consider",
            "appear",
            "buy",
            "wait",
            "serve",
            "die",
            "send",
            "expect",
            "build",
            "stay",
            "fall",
            "cut",
            "reach",
            "kill",
            "remain",
            "suggest",
            "raise",
            "pass",
            "sell",
            "require",
            "report",
            "decide",
            "pull",
        ])
        return commonWords.has(word)
    }
}