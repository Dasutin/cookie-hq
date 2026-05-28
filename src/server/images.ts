import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

export interface UploadedImage {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface ProcessedImage {
  originalName: string;
  storedName: string;
  mimeType: 'image/png';
  sizeBytes: number;
  uploadedAt: string;
  converted: boolean;
}

export async function processCookieImage(
  image: UploadedImage,
  outputDir: string,
  mirrorImage: boolean
): Promise<ProcessedImage> {
  await fs.mkdir(outputDir, { recursive: true });
  const storedName = `${randomUUID()}.png`;
  const outputPath = path.join(outputDir, storedName);
  const alreadyPng = isPngImage(image);

  if (alreadyPng && !mirrorImage) {
    await fs.writeFile(outputPath, image.buffer);
  } else {
    let pipeline = sharp(image.buffer, { failOn: 'none' });
    if (mirrorImage) {
      pipeline = pipeline.flop();
    }
    await pipeline.png().toFile(outputPath);
  }

  const stat = await fs.stat(outputPath);

  return {
    originalName: image.originalName,
    storedName,
    mimeType: 'image/png',
    sizeBytes: stat.size,
    uploadedAt: new Date().toISOString(),
    converted: !(alreadyPng && !mirrorImage)
  };
}

export function isPngImage(image: UploadedImage): boolean {
  if (image.buffer.length < 8) {
    return false;
  }

  const pngSignature = image.buffer.subarray(0, 8);
  const hasPngSignature = pngSignature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return hasPngSignature;
}
