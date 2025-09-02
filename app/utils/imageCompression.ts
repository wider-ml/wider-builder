/**
 * Compresses an image to ensure it stays under the specified size limit
 * @param dataUrl - The base64 data URL of the image
 * @param maxSizeBytes - Maximum size in bytes (default: 5MB for AI API)
 * @param quality - Initial quality (0-1, default: 0.8)
 * @returns Promise<string> - Compressed image as base64 data URL
 */
export async function compressImageForAI(
  dataUrl: string,
  maxSizeBytes: number = 5 * 1024 * 1024, // 5MB default
  quality: number = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if the image is already under the size limit
    const base64Data = dataUrl.split(',')[1];
    const currentSize = (base64Data.length * 3) / 4; // Approximate size of base64 data

    if (currentSize <= maxSizeBytes) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions to reduce file size
      let { width, height } = img;
      const maxDimension = 1920; // Max width or height

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);

      const compressImage = (currentQuality: number): void => {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        const compressedBase64 = compressedDataUrl.split(',')[1];
        const compressedSize = (compressedBase64.length * 3) / 4;

        if (compressedSize <= maxSizeBytes || currentQuality <= 0.1) {
          resolve(compressedDataUrl);
        } else {
          // Reduce quality and try again
          compressImage(currentQuality - 0.1);
        }
      };

      compressImage(quality);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = dataUrl;
  });
}

/**
 * Compresses multiple images for AI API
 * @param imageDataList - Array of base64 data URLs
 * @param maxSizeBytes - Maximum size per image in bytes
 * @returns Promise<string[]> - Array of compressed images
 */
export async function compressImagesForAI(
  imageDataList: string[],
  maxSizeBytes: number = 5 * 1024 * 1024,
): Promise<string[]> {
  const compressionPromises = imageDataList.map((dataUrl) => compressImageForAI(dataUrl, maxSizeBytes));

  return Promise.all(compressionPromises);
}
