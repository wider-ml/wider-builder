export interface UploadedImage {
  url: string;
  fileName: string;
  size: number;
  type: string;
}

export async function uploadImageToS3(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || 'Failed to upload image');
  }

  const result = (await response.json()) as {
    success: boolean;
    error?: string;
    url: string;
    fileName: string;
    size: number;
    type: string;
  };

  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }

  return {
    url: result.url,
    fileName: result.fileName,
    size: result.size,
    type: result.type,
  };
}
