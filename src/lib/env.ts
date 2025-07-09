// Environment variable validation
export const env = {
    MONGODB_URI: process.env.MONGODB_URI!,
    GROQ_API_KEY: process.env.GROQ_API_KEY!,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
}

// Validate required environment variables
function validateEnv() {
    const required = [
        "MONGODB_URI",
        "GROQ_API_KEY",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    ]

    const missing = required.filter((key) => !process.env[key])

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
    }
}

if (process.env.NODE_ENV !== "development") {
    validateEnv()
}