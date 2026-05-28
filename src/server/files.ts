import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { FileKind } from '../shared/types';
import type { StoredFileInput } from './database';

const fusionExtensions = new Set(['.f3d', '.f3z']);
const printExtensions = new Set(['.stl', '.3mf']);

export function validateFileExtension(originalName: string, kind: Exclude<FileKind, 'png' | 'modelPreview'>): void {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = kind === 'fusion' ? fusionExtensions : printExtensions;

  if (!allowed.has(ext)) {
    throw new Error(
      kind === 'fusion'
        ? 'Fusion project uploads must be .f3d or .f3z files.'
        : 'Print file uploads must be .stl or .3mf files.'
    );
  }
}

export async function saveUploadedFile(
  file: Express.Multer.File,
  outputDir: string,
  kind: Exclude<FileKind, 'png' | 'modelPreview'>
): Promise<StoredFileInput> {
  validateFileExtension(file.originalname, kind);
  await fs.mkdir(outputDir, { recursive: true });

  const ext = path.extname(file.originalname).toLowerCase();
  const storedName = `${randomUUID()}${ext}`;
  const outputPath = path.join(outputDir, storedName);
  await fs.writeFile(outputPath, file.buffer);
  const stat = await fs.stat(outputPath);

  return {
    originalName: file.originalname,
    storedName,
    mimeType: file.mimetype || 'application/octet-stream',
    sizeBytes: stat.size,
    uploadedAt: new Date().toISOString()
  };
}

export function getStoredFilePath(uploadDir: string, storedName: string): string {
  return path.join(uploadDir, storedName);
}

export function safeDownloadName(name: string, extension: string): string {
  const safeBase = name
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return `${safeBase || 'cookie-cutter'}${extension}`;
}
