import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import type { Cutter, CutterFile, FileKind } from '../shared/types';
import { getConfig, type AppConfig } from './config';
import {
  attachFile,
  clearFile,
  createCutter,
  deleteArchivedCutter,
  getCutter,
  listCutters,
  openDatabase,
  type CookieDatabase,
  unarchiveCutter,
  updateCutter
} from './database';
import { getStoredFilePath, safeDownloadName, saveUploadedFile } from './files';
import { processCookieImage } from './images';
import { extract3mfThumbnail } from './modelPreview';
import { createCutterSchema, unarchiveSchema, updateCutterSchema } from './validation';

interface CreateAppOptions {
  config?: Partial<AppConfig>;
  db?: CookieDatabase;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 250 * 1024 * 1024
  }
});

export function createApp(options: CreateAppOptions = {}): express.Express {
  const config = getConfig(options.config);
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const db = options.db ?? openDatabase(config.dbPath);
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'Cookie HQ' });
  });

  app.get('/api/cutters', (req, res) => {
    const archived = req.query.archived === 'true';
    res.json({ cutters: listCutters(db, archived) });
  });

  app.post('/api/cutters', upload.single('image'), asyncRoute(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Image attachment is required.' });
    }

    const input = createCutterSchema.parse(req.body);
    const pngFile = await processCookieImage(
      {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      },
      config.uploadDir,
      input.mirrorImage
    );

    const cutter = createCutter(db, input, pngFile);
    return res.status(201).json({ cutter });
  }));

  app.patch('/api/cutters/:id', (req, res) => {
    const input = updateCutterSchema.parse(req.body);
    const cutter = updateCutter(db, req.params.id, input);

    if (!cutter) {
      return res.status(404).json({ error: 'Cookie cutter request not found.' });
    }

    return res.json({ cutter });
  });

  app.post('/api/cutters/:id/unarchive', (req, res) => {
    const input = unarchiveSchema.parse(req.body);
    const cutter = unarchiveCutter(db, req.params.id, input.dueDate);

    if (!cutter) {
      return res.status(404).json({ error: 'Cookie cutter request not found.' });
    }

    return res.json({ cutter });
  });

  app.delete('/api/cutters/:id', asyncRoute(async (req, res) => {
    const result = deleteArchivedCutter(db, String(req.params.id));

    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Cookie cutter request not found.' });
    }

    if (result.status === 'not_archived') {
      return res.status(409).json({ error: 'Archive the request before deleting it.' });
    }

    await removeStoredFiles(config, result.cutter);
    return res.status(204).send();
  }));

  app.post('/api/cutters/:id/files/fusion', upload.single('file'), fileUploadHandler(db, config, 'fusion'));
  app.post('/api/cutters/:id/files/print', upload.single('file'), fileUploadHandler(db, config, 'print'));

  app.get('/api/cutters/:id/files/:kind', (req, res) => {
    const kind = parseFileKind(req.params.kind);
    if (!kind) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const cutter = getCutter(db, req.params.id);
    const file = cutter?.[`${kind}File`];

    if (!cutter || !file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const filePath = getStoredFilePath(config.uploadDir, file.storedName);
    const extension = path.extname(file.originalName) || (kind === 'png' || kind === 'modelPreview' ? '.png' : '');
    const downloadName =
      kind === 'png' || kind === 'modelPreview' ? safeDownloadName(cutter.name, '.png') : file.originalName;

    if ((kind === 'png' || kind === 'modelPreview') && req.query.inline === 'true') {
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      res.type(file.mimeType);
      return res.sendFile(filePath);
    }

    return res.download(filePath, downloadName || safeDownloadName(cutter.name, extension));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }

    if (err && typeof err === 'object' && 'issues' in err) {
      return res.status(400).json({ error: 'Validation failed.', details: err });
    }

    if (err instanceof Error) {
      const status = err.message.includes('uploads must be') ? 400 : 500;
      return res.status(status).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

function fileUploadHandler(
  db: CookieDatabase,
  config: AppConfig,
  kind: Exclude<FileKind, 'png' | 'modelPreview'>
): express.RequestHandler {
  return asyncRoute(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File attachment is required.' });
    }

    const storedFile = await saveUploadedFile(req.file, config.uploadDir, kind);
    let cutter = attachFile(db, String(req.params.id), kind, storedFile);

    if (!cutter) {
      return res.status(404).json({ error: 'Cookie cutter request not found.' });
    }

    if (kind === 'print') {
      const modelPreview = await extract3mfThumbnail(req.file, config.uploadDir);
      cutter = modelPreview
        ? attachFile(db, String(req.params.id), 'modelPreview', modelPreview)
        : clearFile(db, String(req.params.id), 'modelPreview');
    }

    return res.json({ cutter });
  });
}

function parseFileKind(value: string): FileKind | null {
  if (value === 'png' || value === 'fusion' || value === 'print' || value === 'modelPreview') {
    return value;
  }

  return null;
}

function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): express.RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

async function removeStoredFiles(config: AppConfig, cutter: Cutter): Promise<void> {
  const files = [cutter.pngFile, cutter.fusionFile, cutter.printFile, cutter.modelPreviewFile].filter(
    (file): file is CutterFile => Boolean(file)
  );

  await Promise.all(
    files.map(async (file) => {
      try {
        await fsp.unlink(getStoredFilePath(config.uploadDir, file.storedName));
      } catch (err) {
        if (!isMissingFileError(err)) {
          throw err;
        }
      }
    })
  );
}

function isMissingFileError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT');
}
