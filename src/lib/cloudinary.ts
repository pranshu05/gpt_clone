import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
    public_id: string
    secure_url: string
    resource_type: string
    format: string
    bytes: number
}

export async function uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    resourceType: "image" | "raw" = "image",
): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                public_id: `chatgpt-clone/${Date.now()}-${filename}`,
                use_filename: true,
                unique_filename: false,
            },
            (error, result) => {
                if (error) {
                    reject(error)
                } else if (result) {
                    resolve(result as CloudinaryUploadResult)
                } else {
                    reject(new Error("Upload failed"))
                }
            },
        )

        uploadStream.end(buffer)
    })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId)
    } catch (error) {
        console.error("Failed to delete from Cloudinary:", error)
    }
}

export default cloudinary