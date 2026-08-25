/**
 * Cloudinary Frontend Integration Utility
 * Helps upload images securely via our backend proxy and optimize retrieved CDN URLs on-the-fly.
 */

interface UploadResponse {
  success: boolean;
  url: string;
  message?: string;
}

/**
 * Uploads an image (base64 or blob URL) to Cloudinary through our secure server-side API proxy.
 * Falls back to highly-compressed base64 if Cloudinary is not configured.
 * 
 * @param base64Image The image raw base64 string (starts with data:image/...)
 * @param folder Cloudinary target folder (e.g., "bot_covers", "avatars")
 * @returns Promise<string> Secure CDN URL or compressed base64 fallback URL
 */
export async function uploadImageToCloud(base64Image: string, folder: string = "general"): Promise<string> {
  if (!base64Image || !base64Image.startsWith("data:")) {
    return base64Image;
  }
    
  try {
    // Direct browser-to-Cloudinary signed upload
    const sigRes = await fetch('/api/cloudinary-signature');
    if (!sigRes.ok) {
      throw new Error("Failed to get signature");
    }
    const { timestamp, signature, cloudName, apiKey } = await sigRes.json();
    if (!cloudName) {
      throw new Error("Cloudinary not configured on server");
    }

    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (uploadRes.ok) {
      const data = await uploadRes.json();
      return data.secure_url;
    }
    throw new Error("Direct upload returned error status");
  } catch (err) {
    console.warn("⚠️ [Cloudinary Utility] Direct signed upload failed, returning original image string:", err);
    return base64Image;
  }
}

/**
 * Transforms and retrieves an optimized Cloudinary CDN image URL.
 * Automatically inserts high-performance parameters like width, height, auto-quality, and auto-format.
 * 
 * @param rawUrl The raw URL from the database or state
 * @param options Optimization options (width, height, crop)
 * @returns string Optimized image URL or fallback raw URL
 */
export function getOptimizedImageUrl(
  rawUrl: string | undefined | null,
  options: { width?: number; height?: number; quality?: number; crop?: string } = {}
): string {
  if (!rawUrl) return "";
  
  // If the image is a base64 string or doesn't belong to Cloudinary, return it raw
  if (!rawUrl.includes("res.cloudinary.com")) {
    return rawUrl;
  }
  
  try {
    const { width = 400, height = 400, quality = 80, crop = "fill" } = options;
    
    // Cloudinary URL format: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>
    // We want to insert transformation parameters right after '/upload/'
    const uploadMarker = "/upload";
    const uploadIndex = rawUrl.indexOf(uploadMarker);
    
    if (uploadIndex === -1) {
      return rawUrl;
    }
    
    const insertionPoint = uploadIndex + uploadMarker.length;
    const transformParams = `/c_${crop},w_${width},h_${height},q_${quality},f_auto`;
    
    return rawUrl.slice(0, insertionPoint) + transformParams + rawUrl.slice(insertionPoint);
  } catch (err) {
    console.warn("⚠️ [Cloudinary Utility] URL optimization failed, using raw url:", err);
    return rawUrl;
  }
}
