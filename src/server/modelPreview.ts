import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { StoredFileInput } from './database';

export async function extract3mfThumbnail(
  file: Express.Multer.File,
  outputDir: string
): Promise<StoredFileInput | null> {
  if (path.extname(file.originalname).toLowerCase() !== '.3mf') {
    return null;
  }

  const zip = new AdmZip(file.buffer);
  const entry = zip
    .getEntries()
    .find((candidate) => candidate.entryName.toLowerCase() === 'metadata/thumbnail.png');

  if (!entry) {
    return null;
  }

  await fs.mkdir(outputDir, { recursive: true });
  const storedName = `${randomUUID()}-model-preview.png`;
  const outputPath = path.join(outputDir, storedName);
  const buffer = entry.getData();
  await fs.writeFile(outputPath, buffer);
  const stat = await fs.stat(outputPath);

  return {
    originalName: `${path.basename(file.originalname, path.extname(file.originalname))}-model-preview.png`,
    storedName,
    mimeType: 'image/png',
    sizeBytes: stat.size,
    uploadedAt: new Date().toISOString()
  };
}
