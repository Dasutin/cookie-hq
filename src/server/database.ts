import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Cutter, CutterFile, CutterInput, CutterUpdateInput, FileKind } from '../shared/types';

export type CookieDatabase = DatabaseSync;

const fileColumnPrefixes: Record<FileKind, string> = {
  png: 'png',
  fusion: 'fusion',
  print: 'print',
  modelPreview: 'model_preview'
};

interface CutterRow {
  id: string;
  name: string;
  max_size_inches: number;
  size_axis: 'width' | 'height';
  mirror_image: 0 | 1;
  due_date: string;
  archived: 0 | 1;
  created_at: string;
  updated_at: string;
  png_original_name: string | null;
  png_stored_name: string | null;
  png_mime_type: string | null;
  png_size_bytes: number | null;
  png_uploaded_at: string | null;
  fusion_original_name: string | null;
  fusion_stored_name: string | null;
  fusion_mime_type: string | null;
  fusion_size_bytes: number | null;
  fusion_uploaded_at: string | null;
  print_original_name: string | null;
  print_stored_name: string | null;
  print_mime_type: string | null;
  print_size_bytes: number | null;
  print_uploaded_at: string | null;
  model_preview_original_name: string | null;
  model_preview_stored_name: string | null;
  model_preview_mime_type: string | null;
  model_preview_size_bytes: number | null;
  model_preview_uploaded_at: string | null;
}

export interface StoredFileInput {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export function openDatabase(dbPath: string): CookieDatabase {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db: CookieDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cutters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_size_inches REAL NOT NULL CHECK (max_size_inches > 0),
      size_axis TEXT NOT NULL CHECK (size_axis IN ('width', 'height')),
      mirror_image INTEGER NOT NULL DEFAULT 0 CHECK (mirror_image IN (0, 1)),
      due_date TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      png_original_name TEXT,
      png_stored_name TEXT,
      png_mime_type TEXT,
      png_size_bytes INTEGER,
      png_uploaded_at TEXT,
      fusion_original_name TEXT,
      fusion_stored_name TEXT,
      fusion_mime_type TEXT,
      fusion_size_bytes INTEGER,
      fusion_uploaded_at TEXT,
      print_original_name TEXT,
      print_stored_name TEXT,
      print_mime_type TEXT,
      print_size_bytes INTEGER,
      print_uploaded_at TEXT,
      model_preview_original_name TEXT,
      model_preview_stored_name TEXT,
      model_preview_mime_type TEXT,
      model_preview_size_bytes INTEGER,
      model_preview_uploaded_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cutters_archived_due_date
      ON cutters (archived, due_date COLLATE NOCASE);
  `);
  ensureColumn(db, 'model_preview_original_name', 'TEXT');
  ensureColumn(db, 'model_preview_stored_name', 'TEXT');
  ensureColumn(db, 'model_preview_mime_type', 'TEXT');
  ensureColumn(db, 'model_preview_size_bytes', 'INTEGER');
  ensureColumn(db, 'model_preview_uploaded_at', 'TEXT');
}

export function createCutter(db: CookieDatabase, input: CutterInput, pngFile: StoredFileInput): Cutter {
  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO cutters (
      id, name, max_size_inches, size_axis, mirror_image, due_date, archived, created_at, updated_at,
      png_original_name, png_stored_name, png_mime_type, png_size_bytes, png_uploaded_at
    ) VALUES (
      @id, @name, @maxSizeInches, @sizeAxis, @mirrorImage, @dueDate, 0, @createdAt, @updatedAt,
      @pngOriginalName, @pngStoredName, @pngMimeType, @pngSizeBytes, @pngUploadedAt
    )
  `).run({
    id,
    name: input.name,
    maxSizeInches: input.maxSizeInches,
    sizeAxis: input.sizeAxis,
    mirrorImage: input.mirrorImage ? 1 : 0,
    dueDate: input.dueDate,
    createdAt: now,
    updatedAt: now,
    pngOriginalName: pngFile.originalName,
    pngStoredName: pngFile.storedName,
    pngMimeType: pngFile.mimeType,
    pngSizeBytes: pngFile.sizeBytes,
    pngUploadedAt: pngFile.uploadedAt
  });

  return getCutterOrThrow(db, id);
}

export function listCutters(db: CookieDatabase, archived: boolean): Cutter[] {
  const rows = db
    .prepare(
      `
      SELECT * FROM cutters
      WHERE archived = ?
      ORDER BY due_date ASC, created_at ASC
    `
    )
    .all(archived ? 1 : 0) as unknown as CutterRow[];

  return rows.map(mapCutterRow);
}

export function getCutter(db: CookieDatabase, id: string): Cutter | null {
  const row = db.prepare('SELECT * FROM cutters WHERE id = ?').get(id) as unknown as CutterRow | undefined;
  return row ? mapCutterRow(row) : null;
}

export function getCutterOrThrow(db: CookieDatabase, id: string): Cutter {
  const cutter = getCutter(db, id);
  if (!cutter) {
    throw new Error(`Cutter not found: ${id}`);
  }
  return cutter;
}

export function updateCutter(db: CookieDatabase, id: string, input: CutterUpdateInput): Cutter | null {
  const existing = getCutter(db, id);
  if (!existing) {
    return null;
  }

  const next = {
    name: input.name ?? existing.name,
    maxSizeInches: input.maxSizeInches ?? existing.maxSizeInches,
    sizeAxis: input.sizeAxis ?? existing.sizeAxis,
    mirrorImage: input.mirrorImage ?? existing.mirrorImage,
    dueDate: input.dueDate ?? existing.dueDate,
    archived: input.archived ?? existing.archived,
    updatedAt: new Date().toISOString(),
    id
  };

  db.prepare(`
    UPDATE cutters
    SET
      name = @name,
      max_size_inches = @maxSizeInches,
      size_axis = @sizeAxis,
      mirror_image = @mirrorImage,
      due_date = @dueDate,
      archived = @archived,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    ...next,
    mirrorImage: next.mirrorImage ? 1 : 0,
    archived: next.archived ? 1 : 0
  });

  return getCutterOrThrow(db, id);
}

export function unarchiveCutter(db: CookieDatabase, id: string, dueDate: string): Cutter | null {
  const existing = getCutter(db, id);
  if (!existing) {
    return null;
  }

  db.prepare(`
    UPDATE cutters
    SET archived = 0, due_date = ?, updated_at = ?
    WHERE id = ?
  `).run(dueDate, new Date().toISOString(), id);

  return getCutterOrThrow(db, id);
}

export function attachFile(db: CookieDatabase, id: string, kind: FileKind, file: StoredFileInput): Cutter | null {
  if (!getCutter(db, id)) {
    return null;
  }

  const prefix = fileColumnPrefixes[kind];

  db.prepare(`
    UPDATE cutters
    SET
      ${prefix}_original_name = @originalName,
      ${prefix}_stored_name = @storedName,
      ${prefix}_mime_type = @mimeType,
      ${prefix}_size_bytes = @sizeBytes,
      ${prefix}_uploaded_at = @uploadedAt,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    originalName: file.originalName,
    storedName: file.storedName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
    updatedAt: new Date().toISOString()
  });

  return getCutterOrThrow(db, id);
}

export function clearFile(db: CookieDatabase, id: string, kind: FileKind): Cutter | null {
  if (!getCutter(db, id)) {
    return null;
  }

  const prefix = fileColumnPrefixes[kind];

  db.prepare(`
    UPDATE cutters
    SET
      ${prefix}_original_name = NULL,
      ${prefix}_stored_name = NULL,
      ${prefix}_mime_type = NULL,
      ${prefix}_size_bytes = NULL,
      ${prefix}_uploaded_at = NULL,
      updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    updatedAt: new Date().toISOString()
  });

  return getCutterOrThrow(db, id);
}

function mapCutterRow(row: CutterRow): Cutter {
  return {
    id: row.id,
    name: row.name,
    maxSizeInches: row.max_size_inches,
    sizeAxis: row.size_axis,
    mirrorImage: row.mirror_image === 1,
    dueDate: row.due_date,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pngFile: mapFile(row, 'png'),
    fusionFile: mapFile(row, 'fusion'),
    printFile: mapFile(row, 'print'),
    modelPreviewFile: mapFile(row, 'modelPreview')
  };
}

function mapFile(row: CutterRow, kind: FileKind): CutterFile | null {
  const prefix = fileColumnPrefixes[kind];
  const originalName = row[`${prefix}_original_name` as keyof CutterRow];
  const storedName = row[`${prefix}_stored_name` as keyof CutterRow];
  const mimeType = row[`${prefix}_mime_type` as keyof CutterRow];
  const sizeBytes = row[`${prefix}_size_bytes` as keyof CutterRow];
  const uploadedAt = row[`${prefix}_uploaded_at` as keyof CutterRow];

  if (!originalName || !storedName || !mimeType || sizeBytes === null || !uploadedAt) {
    return null;
  }

  return {
    originalName: String(originalName),
    storedName: String(storedName),
    mimeType: String(mimeType),
    sizeBytes: Number(sizeBytes),
    uploadedAt: String(uploadedAt)
  };
}

function ensureColumn(db: CookieDatabase, columnName: string, definition: string): void {
  const columns = db.prepare('PRAGMA table_info(cutters)').all() as unknown as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE cutters ADD COLUMN ${columnName} ${definition}`);
  }
}
