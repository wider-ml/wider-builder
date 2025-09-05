import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      return json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Get environment variables (try Cloudflare context first, then process.env for local development)
    const env = context.cloudflare?.env as any;
    const accessKeyId = env?.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env?.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = env?.AWS_REGION || process.env.AWS_REGION;
    const bucketName = env?.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return json({ error: 'AWS configuration missing' }, { status: 500 });
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `chat-images/${uuidv4()}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,

      //ACL: 'public-read',
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return json(
      {
        error: 'Failed to upload image to S3',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
