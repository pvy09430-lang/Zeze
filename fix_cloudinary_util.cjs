const fs = require('fs');
let code = fs.readFileSync('src/lib/cloudinaryUtil.ts', 'utf8');

code = code.replace(/export async function uploadImageToCloud.*?}\s*}/s, 
`export async function uploadImageToCloud(base64Image: string, folder: string = "general"): Promise<string> {
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

    const uploadRes = await fetch(\`https://api.cloudinary.com/v1_1/\${cloudName}/image/upload\`, {
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
}`);

fs.writeFileSync('src/lib/cloudinaryUtil.ts', code);
