import { useState } from 'react';

export const useCloudinary = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      // 1. Get Signature
      const sigRes = await fetch('/api/cloudinary-signature');
      if (!sigRes.ok) {
        throw new Error("Failed to get Cloudinary signature");
      }
      const { timestamp, signature, cloudName, apiKey } = await sigRes.json();

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', 'bot_hub');

      // 3. Upload to Cloudinary directly
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || 'Upload failed');
      }

      setIsUploading(false);
      return uploadData.secure_url;
    } catch (err) {
      console.error("Cloudinary signed upload failed:", err);
      setIsUploading(false);
      return null;
    }
  };

  return { uploadImage, isUploading };
};
